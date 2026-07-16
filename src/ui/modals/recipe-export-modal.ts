/**
 * Modal for exporting the current recipe to a shareable file. Markdown
 * formats (Plain, Importable) save into the vault, matching the grocery
 * ExportModal's save mechanism -- a markdown recipe file belongs in a vault,
 * whether the same one or one being handed off. JSON and JSON-LD are
 * external interchange artifacts, not vault content, so they trigger a
 * browser/OS download instead. PDF isn't implemented yet.
 *
 * The preview is expensive to read (a full recipe body) relative to how
 * often anyone actually wants to look at it before saving, so it's collapsed
 * by default -- "Show preview" builds and reveals it on demand rather than
 * eagerly computing it on every option change.
 */
import { App, Notice, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings, RecipeExportFormat } from "../../settings/settings-types";
import {
	RecipeExportOptions,
	DEFAULT_RECIPE_EXPORT_OPTIONS,
	buildRecipeExportData,
} from "../../recipe-export/recipe-export-data";
import { exportPlainMarkdown } from "../../recipe-export/exporters/plain-markdown-exporter";
import { exportImportableMarkdown } from "../../recipe-export/exporters/importable-markdown-exporter";
import { exportRecipeJson } from "../../recipe-export/exporters/json-exporter";
import { stringifyRecipeJsonLd } from "../../recipe-export/exporters/json-ld-exporter";
import { downloadTextFile } from "../../recipe-export/download-file";
import { readRecipeMultiplier } from "../../parser/recipe-multiplier";
import { NotePathSuggest } from "../components/note-path-suggest";
import { ensureParentFolders } from "../../utils/vault-notes";
import { BaseModal } from "./modal-shell";

const FORMAT_LABELS: Record<RecipeExportFormat, string> = {
	"plain-markdown": "Markdown (plain)",
	"importable-markdown": "Markdown (importable)",
	json: "JSON",
	"json-ld": "JSON-LD",
};

function isMarkdownFormat(format: RecipeExportFormat): boolean {
	return format === "plain-markdown" || format === "importable-markdown";
}

export class RecipeExportModal extends BaseModal {
	private format: RecipeExportFormat;
	private options: RecipeExportOptions;
	private previewVisible = false;

	private previewContainer!: HTMLElement;
	private previewEl!: HTMLTextAreaElement;
	private togglePreviewIconEl!: HTMLElement;
	private togglePreviewLabelEl!: HTMLElement;
	private togglePreviewBtn!: HTMLButtonElement;
	private outputSection!: HTMLElement;
	private pathInput: HTMLInputElement | null = null;
	private primaryBtn!: HTMLButtonElement;
	private readonly currentMultiplier: number;

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly settings: RecipeBoxSettings,
	) {
		super(app);
		this.format = settings.recipeExportDefaultFormat;
		this.options = {
			...DEFAULT_RECIPE_EXPORT_OPTIONS,
			includeCookHistoryAndSections: settings.recipeExportIncludeCookHistoryDefault,
			includeImages: settings.recipeExportIncludeImagesDefault,
		};
		this.currentMultiplier = readRecipeMultiplier(app.metadataCache.getFileCache(file));
	}

	getTitle(): string { return "Export recipe"; }
	getContentClasses(): string[] { return ["rb-export-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const opts = bodyEl.createDiv({ cls: "rb-modal-fields" });

		const fmtField = opts.createDiv({ cls: "rb-modal-field" });
		fmtField.createEl("label", { text: "Format" });
		const fmtSelect = fmtField.createEl("select", { cls: "rb-modal-select" });
		for (const [value, label] of Object.entries(FORMAT_LABELS) as [RecipeExportFormat, string][]) {
			const opt = fmtSelect.createEl("option", { value, text: label });
			if (value === this.format) opt.selected = true;
		}
		fmtSelect.addEventListener("change", () => {
			this.format = fmtSelect.value as RecipeExportFormat;
			this.updateOutputSection();
			void this.refreshPreview();
		});

		const cookHistoryField = opts.createDiv({ cls: "rb-modal-field rb-modal-field-row" });
		const cookHistoryBox = cookHistoryField.createEl("input", { type: "checkbox" });
		cookHistoryBox.checked = this.options.includeCookHistoryAndSections;
		cookHistoryField.createEl("label", { text: "Include cook history and other sections" });
		cookHistoryBox.addEventListener("change", () => {
			this.options.includeCookHistoryAndSections = cookHistoryBox.checked;
			void this.refreshPreview();
		});

		const imagesField = opts.createDiv({ cls: "rb-modal-field rb-modal-field-row" });
		const imagesBox = imagesField.createEl("input", { type: "checkbox" });
		imagesBox.checked = this.options.includeImages;
		imagesField.createEl("label", { text: "Include images" });
		imagesField.createDiv({
			cls: "rb-modal-field-hint",
			text: "Image bundling isn't implemented yet, local images are omitted with a marker instead of embedded.",
		});
		imagesBox.addEventListener("change", () => {
			this.options.includeImages = imagesBox.checked;
			void this.refreshPreview();
		});

		// Only worth surfacing when there's an actual choice to make -- at the
		// default multiplier, "current" and "base recipe" are the same output.
		if (this.currentMultiplier !== 1) {
			const multiplierField = opts.createDiv({ cls: "rb-modal-field rb-modal-field-row" });
			const multiplierBox = multiplierField.createEl("input", { type: "checkbox" });
			multiplierField.createEl("label", { text: `Export at current multiplier (${this.currentMultiplier}x)` });
			multiplierBox.addEventListener("change", () => {
				this.options.applyCurrentMultiplier = multiplierBox.checked;
				void this.refreshPreview();
			});
		}

		const previewToggleRow = bodyEl.createDiv({ cls: "rb-modal-field-row" });
		this.togglePreviewBtn = previewToggleRow.createEl("button", { cls: "rb-modal-link-btn" });
		this.togglePreviewIconEl = this.togglePreviewBtn.createSpan({ cls: "rb-modal-link-btn-icon" });
		this.togglePreviewLabelEl = this.togglePreviewBtn.createSpan();
		this.togglePreviewBtn.addEventListener("click", () => {
			this.previewVisible = !this.previewVisible;
			this.updatePreviewVisibility();
		});

		this.previewContainer = bodyEl.createDiv({ cls: "rb-export-preview-container" });
		this.previewContainer.createEl("p", {
			cls: "rb-modal-section-desc",
			text: "Select all text below, then use your system's copy shortcut (Ctrl+C / ⌘C).",
		});
		this.previewEl = this.previewContainer.createEl("textarea", {
			cls: "rb-export-preview",
			attr: { readonly: "true", rows: "16" },
		});
		this.updatePreviewVisibility();

		bodyEl.createEl("hr", { cls: "rb-modal-divider" });

		this.outputSection = bodyEl.createDiv({ cls: "rb-modal-section" });
		this.updateOutputSection();
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		this.primaryBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Save" });
		this.primaryBtn.addEventListener("click", () => { void this.handlePrimaryAction(); });
	}

	private updatePreviewVisibility(): void {
		this.previewContainer.toggleClass("rb-export-preview-hidden", !this.previewVisible);
		setIcon(this.togglePreviewIconEl, this.previewVisible ? "chevron-down" : "chevron-right");
		this.togglePreviewLabelEl.setText(this.previewVisible ? "Hide preview" : "Show preview");
		if (this.previewVisible) void this.refreshPreview();
	}

	private updateOutputSection(): void {
		this.outputSection.empty();
		this.pathInput = null;

		if (isMarkdownFormat(this.format)) {
			this.outputSection.createDiv({ cls: "rb-modal-section-heading", text: "Save as note" });
			const pathField = this.outputSection.createDiv({ cls: "rb-modal-field" });
			const defaultName = `${this.file.basename} (export)`;
			const defaultPath = this.settings.exportFolder ? `${this.settings.exportFolder}/${defaultName}` : defaultName;
			this.pathInput = pathField.createEl("input", {
				cls: "rb-modal-input",
				type: "text",
				placeholder: "Vault-relative path, e.g. Exports/Carbonara",
				value: defaultPath,
			});
			new NotePathSuggest(this.app, this.pathInput);
		} else {
			this.outputSection.createDiv({ cls: "rb-modal-section-heading", text: "Download" });
			this.outputSection.createEl("p", {
				cls: "rb-modal-section-desc",
				text: "This format isn't vault content, saving triggers a file download instead of writing a note.",
			});
		}

		this.primaryBtn?.setText(isMarkdownFormat(this.format) ? "Save" : "Download");
	}

	private async buildContent(): Promise<string> {
		const cache = this.app.metadataCache.getFileCache(this.file);
		const frontmatter: Record<string, unknown> = cache?.frontmatter ?? {};
		const data = await buildRecipeExportData(this.app, this.file, this.settings, this.options);

		switch (this.format) {
			case "plain-markdown":
				return exportPlainMarkdown(data, frontmatter, this.settings, this.options);
			case "importable-markdown":
				return exportImportableMarkdown(data, frontmatter, this.settings, this.options);
			case "json":
				return exportRecipeJson(data, frontmatter, this.settings, this.options);
			case "json-ld":
				return stringifyRecipeJsonLd(data, frontmatter, this.settings);
		}
	}

	private async refreshPreview(): Promise<void> {
		if (!this.previewVisible) return;
		this.previewEl.value = await this.buildContent();
	}

	private async handlePrimaryAction(): Promise<void> {
		if (isMarkdownFormat(this.format)) {
			await this.saveToNote(this.pathInput?.value ?? "");
		} else {
			await this.downloadExport();
		}
	}

	private async saveToNote(rawPath: string): Promise<void> {
		const path = rawPath.trim();
		if (!path) {
			new Notice("Please enter a note path.");
			return;
		}

		const content = await this.buildContent();
		if (!content.trim()) {
			new Notice("Nothing to export.");
			return;
		}

		const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;

		if (this.app.vault.getFileByPath(normalizedPath)) {
			new Notice(`${normalizedPath} already exists. Choose a different path.`);
			return;
		}

		try {
			await ensureParentFolders(this.app, normalizedPath);
			await this.app.vault.create(normalizedPath, content);
			new Notice(`Exported to ${normalizedPath}.`);
			this.close();
		} catch (err) {
			new Notice(`Failed to write note: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	private async downloadExport(): Promise<void> {
		const content = await this.buildContent();
		if (!content.trim()) {
			new Notice("Nothing to export.");
			return;
		}

		const ext = this.format === "json-ld" ? "jsonld" : "json";
		const mimeType = this.format === "json-ld" ? "application/ld+json" : "application/json";
		const filename = `${this.file.basename}.${ext}`;

		downloadTextFile(filename, content, mimeType);
		new Notice(`Downloaded ${filename}.`);
		this.close();
	}
}
