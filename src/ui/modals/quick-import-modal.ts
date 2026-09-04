/**
 * Two small popups launched from the Add Recipe form's "Import from URL" /
 * "Import from text" buttons. Each asks for just its one input (no
 * destination folder -- that lives on the form itself now) and, on success,
 * hands the extracted recipe back to the form via onImported and closes.
 */
import { App } from "obsidian";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { submitUrl, submitText } from "./import-submit";
import { BaseModal } from "./modal-shell";

export class ImportFromUrlModal extends BaseModal {
	private urlInput!: HTMLInputElement;
	private errorBox!: HTMLElement;
	private importBtn!: HTMLButtonElement;

	constructor(
		app: App,
		private readonly onImported: (recipe: ExtractedRecipe, warning: string | null) => void,
	) {
		super(app);
	}

	getTitle(): string { return "Import from URL"; }
	getContentClasses(): string[] { return ["rb-import-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		bodyEl.createDiv({ cls: "rb-import-field-label", text: "Recipe URL" });
		this.urlInput = bodyEl.createEl("input", {
			cls: "rb-import-text-input",
			attr: { type: "url", placeholder: "HTTPS://…" },
		});
		this.errorBox = bodyEl.createDiv({ cls: "rb-import-error-box" });
		this.errorBox.hide();
		this.urlInput.addEventListener("input", () => {
			this.errorBox.empty();
			this.errorBox.hide();
		});
		this.urlInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") { e.preventDefault(); void this.submit(); }
		});
		this.urlInput.focus();
	}

	renderFooter(footerEl: HTMLElement): void {
		this.importBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Import" });
		this.importBtn.addEventListener("click", () => void this.submit());
	}

	private async submit(): Promise<void> {
		this.importBtn.disabled = true;
		this.importBtn.setText("Importing…");
		this.errorBox.empty();
		this.errorBox.hide();
		try {
			const result = await submitUrl(this.urlInput.value);
			if (result.kind === "success") {
				this.onImported(result.recipe, result.warning);
				this.close();
			} else {
				this.errorBox.setText(result.message);
				this.errorBox.show();
			}
		} finally {
			this.importBtn.disabled = false;
			this.importBtn.setText("Import");
		}
	}
}

export class ImportFromTextModal extends BaseModal {
	private titleInput!: HTMLInputElement;
	private textArea!: HTMLTextAreaElement;

	constructor(
		app: App,
		private readonly onImported: (recipe: ExtractedRecipe) => void,
	) {
		super(app);
	}

	getTitle(): string { return "Import from text"; }
	getContentClasses(): string[] { return ["rb-import-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		bodyEl.createDiv({ cls: "rb-import-field-label", text: "Title (optional)" });
		this.titleInput = bodyEl.createEl("input", {
			cls: "rb-import-text-input",
			attr: { type: "text", placeholder: "My recipe" },
		});
		bodyEl.createDiv({ cls: "rb-import-field-label", text: "Paste recipe text" });
		this.textArea = bodyEl.createEl("textarea", {
			cls: "rb-import-textarea rb-import-textarea--tall",
			attr: { placeholder: "Paste ingredients and instructions here…" },
		});
		this.textArea.focus();
	}

	renderFooter(footerEl: HTMLElement): void {
		const importBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Import" });
		importBtn.addEventListener("click", () => {
			const recipe = submitText(this.textArea.value, this.titleInput.value);
			if (recipe) {
				this.onImported(recipe);
				this.close();
			}
		});
	}
}
