/**
 * Bulk "Import recipes from file" modal: pick .json/.zip exports, see a
 * pre-flight count, choose destination and conflict policy, then run a
 * sequential import with progress, Stop, and a per-recipe summary. Distinct
 * from the Add Recipe modal because bulk import has no per-recipe review step.
 */
import { App, Notice } from "obsidian";
import type { RecipeBoxSettings } from "../../settings/settings-types";
import { prepareImport, type PreparedImport } from "../../importer/file-import/file-import-prepare";
import { runImport } from "../../importer/file-import/file-import-run";
import { createVaultImportDeps } from "../../importer/file-import/file-import-vault-deps";
import type { ConflictPolicy, ImportUnitResult } from "../../importer/file-import/file-import-types";
import { FolderSuggest } from "../components/folder-suggest";
import { BaseModal } from "./modal-shell";
import { resolveDestinationFolder } from "./import-submit";

export class ImportFilesModal extends BaseModal {
	private folder: string;
	private policy: ConflictPolicy = "skip";
	private prepared: PreparedImport | null = null;
	private running = false;
	private stopRequested = false;

	private statusEl!: HTMLElement;
	private summaryEl!: HTMLElement;
	private cancelBtn!: HTMLButtonElement;
	private importBtn!: HTMLButtonElement;

	constructor(app: App, private readonly settings: RecipeBoxSettings) {
		super(app);
		this.folder = resolveDestinationFolder(settings);
	}

	getTitle(): string { return "Import recipes from file"; }
	getSubtitle(): string { return "Mealie, Nextcloud Cookbook, or any schema.org Recipe JSON."; }
	getContentClasses(): string[] { return ["rb-import-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		bodyEl.createDiv({ cls: "rb-import-field-label", text: "Files" });
		const fileInput = bodyEl.createEl("input", {
			cls: "rb-import-text-input",
			attr: { type: "file", multiple: "", accept: ".json,.zip" },
		});
		fileInput.addEventListener("change", () => void this.onFilesPicked(Array.from(fileInput.files ?? [])));

		bodyEl.createDiv({ cls: "rb-import-field-label", text: "Destination folder" });
		const folderInput = bodyEl.createEl("input", {
			cls: "rb-import-text-input",
			attr: { type: "text", placeholder: "Recipes" },
		});
		folderInput.value = this.folder;
		folderInput.addEventListener("input", () => { this.folder = folderInput.value; });
		new FolderSuggest(this.app, folderInput);

		bodyEl.createDiv({ cls: "rb-import-field-label", text: "If a note already exists" });
		const group = bodyEl.createDiv({ cls: "rb-modal-radio-group" });
		this.renderPolicyOption(group, "skip", "Skip it");
		this.renderPolicyOption(group, "keep-both", "Keep both (add a number to the new note)");

		this.statusEl = bodyEl.createDiv({ cls: "rb-import-file-status" });
		this.summaryEl = bodyEl.createDiv({ cls: "rb-import-file-summary" });
	}

	renderFooter(footerEl: HTMLElement): void {
		this.cancelBtn = footerEl.createEl("button", { cls: "rb-modal-cancel-btn", text: "Cancel" });
		this.cancelBtn.addEventListener("click", () => {
			// While running this is "Stop": finish the current recipe, keep what is written.
			if (this.running) { this.stopRequested = true; this.cancelBtn.disabled = true; }
			else this.close();
		});
		this.importBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Import" });
		this.importBtn.disabled = true;
		this.importBtn.addEventListener("click", () => void this.start());
	}

	private renderPolicyOption(group: HTMLElement, value: ConflictPolicy, label: string): void {
		const row = group.createEl("label", { cls: "rb-modal-radio-row" });
		const radio = row.createEl("input", { attr: { type: "radio", name: "rb-import-files-policy", value } });
		radio.checked = this.policy === value;
		row.createSpan({ text: label });
		radio.addEventListener("change", () => { if (radio.checked) this.policy = value; });
	}

	private async onFilesPicked(files: File[]): Promise<void> {
		this.summaryEl.empty();
		this.prepared = null;
		this.importBtn.disabled = true;
		this.importBtn.setText("Import");
		if (files.length === 0) { this.statusEl.setText(""); return; }

		this.statusEl.setText("Reading files…");
		const prepared = await prepareImport(files);
		this.prepared = prepared;

		const found = prepared.units.length;
		const bad = prepared.problems.length;
		this.statusEl.setText(
			`${found} recipe${found === 1 ? "" : "s"} found` + (bad > 0 ? `, ${bad} not recognized` : "") + ".",
		);
		this.renderNotes(prepared.warnings, prepared.problems.map(p => `${p.label}: ${p.reason}`));
		if (found > 0) {
			this.importBtn.setText(`Import ${found} recipe${found === 1 ? "" : "s"}`);
			this.importBtn.disabled = false;
		}
	}

	private renderNotes(warnings: string[], problems: string[]): void {
		this.summaryEl.empty();
		for (const text of [...warnings, ...problems]) this.summaryEl.createDiv({ cls: "rb-import-file-line", text });
	}

	private async start(): Promise<void> {
		const prepared = this.prepared;
		if (!prepared || this.running) return;
		this.running = true;
		this.stopRequested = false;
		this.importBtn.disabled = true;
		this.cancelBtn.setText("Stop");
		this.summaryEl.empty();

		const { results, cancelled } = await runImport(prepared.units, createVaultImportDeps(this.app, this.settings), {
			folder: this.folder,
			policy: this.policy,
			isCancelled: () => this.stopRequested,
			onProgress: (done, total) => this.statusEl.setText(`Importing ${Math.min(done + 1, total)} of ${total}…`),
		});

		this.running = false;
		this.cancelBtn.disabled = false;
		this.cancelBtn.setText("Close");
		this.importBtn.hide();
		this.showSummary(results, cancelled, prepared);
	}

	private showSummary(results: ImportUnitResult[], cancelled: boolean, prepared: PreparedImport): void {
		const count = (s: ImportUnitResult["status"]) => results.filter(r => r.status === s).length;
		const imported = count("imported");
		const skipped = count("skipped");
		const failed = count("failed") + prepared.problems.length;
		const headline = `${imported} imported, ${skipped} skipped, ${failed} failed` + (cancelled ? " (stopped early)." : ".");
		this.statusEl.setText(headline);
		// One Notice for the whole run, never one per recipe.
		new Notice(`Recipe import: ${headline}`);

		this.summaryEl.empty();
		for (const r of results) {
			const warned = r.status === "imported" && r.warnings.length > 0;
			if (r.status === "imported" && !warned) continue;
			const detail = r.status === "imported" ? r.warnings.join(" ") : r.reason ?? "";
			this.summaryEl.createDiv({ cls: "rb-import-file-line", text: `${r.label}: ${detail}` });
		}
		for (const p of prepared.problems) {
			this.summaryEl.createDiv({ cls: "rb-import-file-line", text: `${p.label}: ${p.reason}` });
		}
	}
}
