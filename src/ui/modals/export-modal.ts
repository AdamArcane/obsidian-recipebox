/**
 * Modal for exporting the current grocery list in plain text, checklist, or
 * grouped Markdown format, with a live preview and copy-to-clipboard action.
 */
import { App, Notice, TFile } from "obsidian";
import { GroceryItem } from "../../types";
import { ExportFormat, EXPORT_FORMAT_LABELS } from "../../grocery/export-format";
import { exportGroceryList } from "../../grocery/export-render";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { NotePathSuggest } from "../components/note-path-suggest";
import { BaseModal } from "./modal-shell";

export class ExportModal extends BaseModal {
	private format: ExportFormat = "checklist";
	private includeChecked = true;
	private previewEl!: HTMLTextAreaElement;
	private appendInput!: HTMLInputElement;

	constructor(
		app: App,
		private readonly getItems: () => GroceryItem[],
		private readonly settings: RecipeBoxSettings
	) {
		super(app);
	}

	getTitle(): string { return "Export grocery list"; }
	getContentClasses(): string[] { return ["rb-export-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const opts = bodyEl.createDiv({ cls: "rb-modal-fields" });

		const fmtField = opts.createDiv({ cls: "rb-modal-field" });
		fmtField.createEl("label", { text: "Format" });
		const fmtSelect = fmtField.createEl("select", { cls: "rb-modal-select" });
		for (const [value, label] of Object.entries(EXPORT_FORMAT_LABELS) as [ExportFormat, string][]) {
			const opt = fmtSelect.createEl("option", { value, text: label });
			if (value === this.format) opt.selected = true;
		}
		fmtSelect.addEventListener("change", () => {
			this.format = fmtSelect.value as ExportFormat;
			this.refreshPreview();
		});

		const checkedField = opts.createDiv({ cls: "rb-modal-field rb-modal-field-row" });
		const checkedBox = checkedField.createEl("input", { type: "checkbox" });
		checkedBox.checked = true;
		checkedField.createEl("label", { text: "Include checked items" });
		checkedBox.addEventListener("change", () => {
			this.includeChecked = checkedBox.checked;
			this.refreshPreview();
		});

		bodyEl.createEl("p", {
			cls: "rb-modal-section-desc",
			text: "Select all text below, then use your system's copy shortcut (Ctrl+C / ⌘C).",
		});

		this.previewEl = bodyEl.createEl("textarea", {
			cls: "rb-export-preview",
			attr: { readonly: "true", rows: "12" },
		});
		this.refreshPreview();

		bodyEl.createEl("hr", { cls: "rb-modal-divider" });

		const appendSection = bodyEl.createDiv({ cls: "rb-modal-section" });
		appendSection.createDiv({ cls: "rb-modal-section-heading", text: "Append to note" });

		const appendField = appendSection.createDiv({ cls: "rb-modal-field" });
		this.appendInput = appendField.createEl("input", {
			cls: "rb-modal-input",
			type: "text",
			placeholder: "Vault-relative path, e.g. Notes/Grocery Export",
		});
		new NotePathSuggest(this.app, this.appendInput);
	}

	renderFooter(footerEl: HTMLElement): void {
		// Cancel first, then primary action (spec section 55)
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Close" })
			.addEventListener("click", () => this.close());
		footerEl.createEl("button", { cls: "mod-cta", text: "Append to note" })
			.addEventListener("click", () => { void this.appendToNote(this.appendInput.value); });
	}

	private refreshPreview(): void {
		const items = this.getItems();
		this.previewEl.value = exportGroceryList(items, this.format, { includeChecked: this.includeChecked });
	}

	private async appendToNote(rawPath: string): Promise<void> {
		const path = rawPath.trim();
		if (!path) {
			new Notice("Please enter a note path.");
			return;
		}

		const content = this.previewEl.value;
		if (!content.trim()) {
			new Notice("Nothing to export — the list is empty with the current options.");
			return;
		}

		const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;

		if (!normalizedPath.endsWith(".md")) {
			new Notice("Target must be a Markdown file.");
			return;
		}

		try {
			let existing: TFile | null = this.app.vault.getFileByPath(normalizedPath);

			if (!existing) {
				await this.app.vault.create(normalizedPath, content);
				new Notice(`Exported to ${normalizedPath}.`);
				this.close();
				return;
			}

			const currentContent = await this.app.vault.read(existing);
			const separator = currentContent.endsWith("\n\n") ? "" : currentContent.endsWith("\n") ? "\n" : "\n\n";
			await this.app.vault.modify(existing, currentContent + separator + content);
			new Notice(`Appended to ${normalizedPath}.`);
			this.close();
		} catch (err) {
			new Notice(`Failed to write note: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}
