/**
 * Edit Recipe modal: reuses the Add Recipe section builders to edit an
 * existing recipe's fields and its Ingredients/Steps/Notes sections in place.
 * Saving goes through recipe-edit/save-recipe-edits.ts (targeted writes), never
 * the note template, so nothing the user didn't touch is regenerated.
 */
import { App, Notice, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { loadRecipeForEdit } from "../../recipe-edit/load-recipe-for-edit";
import { saveRecipeEdits } from "../../recipe-edit/save-recipe-edits";
import { downloadRecipeImage } from "../../importer/download-recipe-image";
import { BaseModal, addFooterButtons } from "./modal-shell";
import { EditFormController, EditSectionTarget, renderEditRecipeForm } from "./edit-recipe-form";

export class EditRecipeModal extends BaseModal {
	private form: EditFormController | null = null;
	private saveBtn: HTMLButtonElement | null = null;
	// A failed/conflicted save is retried from a rebuilt request; remembering
	// the converted upload keeps retries from writing duplicate image files.
	private uploaded: { uri: string; path: string } | null = null;

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly settings: RecipeBoxSettings,
		private readonly editAsMarkdown: (path: string) => void,
		private readonly focusSection?: EditSectionTarget,
	) {
		super(app);
	}

	getTitle(): string { return "Edit recipe"; }
	getSubtitle(): string { return this.file.basename; }
	getContentClasses(): string[] { return ["rb-import-modal"]; }

	async renderBody(bodyEl: HTMLElement): Promise<void> {
		// On modalEl, not contentEl, for the same reason as the Add Recipe modal.
		this.modalEl.addClass("rb-import-modal--wide");
		// Read from disk rather than the view's copy so the load snapshot is
		// what is actually in the file right now.
		const raw = await this.app.vault.read(this.file);
		const frontmatter: Record<string, unknown> = this.app.metadataCache.getFileCache(this.file)?.frontmatter ?? {};
		const loaded = loadRecipeForEdit(raw, frontmatter, this.settings);

		this.form = renderEditRecipeForm(bodyEl, {
			app: this.app,
			settings: this.settings,
			basename: this.file.basename,
			loaded,
			focusSection: this.focusSection,
			onOpenMarkdown: () => {
				this.close();
				this.editAsMarkdown(this.file.path);
			},
		});
	}

	renderFooter(footerEl: HTMLElement): void {
		this.saveBtn = addFooterButtons(footerEl, {
			confirmLabel: "Save changes",
			onCancel: () => this.close(),
			onConfirm: () => { void this.save(); },
		});
	}

	private async save(): Promise<void> {
		const form = this.form;
		if (!form) return;
		form.showError(null);

		const built = form.buildRequest();
		if (built.kind === "invalid") { form.showError(built.message); return; }
		// Nothing changed: just close, there is nothing to write.
		if (!built.request) { this.close(); return; }

		if (this.saveBtn) this.saveBtn.disabled = true;
		try {
			// An uploaded image arrives as a data: URI. Store it as a vault file and
			// write its path, never the URI itself, into frontmatter.
			const img = built.request.frontmatter.image;
			if (img?.startsWith("data:")) {
				if (this.uploaded?.uri !== img) {
					const path = await downloadRecipeImage(this.app, img, this.file.basename, this.file.parent?.path ?? "");
					if (!path) {
						form.showError("Could not save the uploaded image. Nothing was saved.");
						return;
					}
					this.uploaded = { uri: img, path };
				}
				built.request.frontmatter.image = this.uploaded.path;
			}
			const result = await saveRecipeEdits(this.app, this.file, this.settings, built.request);
			if (result.status === "conflict") {
				form.showError("This recipe changed since the editor was opened. Nothing was saved.");
				return;
			}
			if (result.renameSkipped) {
				new Notice("Recipe saved, but the file was not renamed: a note with that name already exists.");
			} else {
				new Notice("Recipe saved");
			}
			this.close();
		} catch (err) {
			new Notice(`Failed to save recipe: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			if (this.saveBtn) this.saveBtn.disabled = false;
		}
	}
}
