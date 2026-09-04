/**
 * Add Recipe modal: opens directly to the structured form (add-recipe-form.ts)
 * -- Title, Image, grouped Ingredients/Steps, Notes, Nutrition -- blank by
 * default. "Import from URL"/"Import from text" buttons at the top of that
 * form (quick-import-modal.ts) prefill it instead of gating access to it.
 *
 * Extends BaseModal; any change that needs to replace the whole recipe (an
 * import landing) clears and repopulates the shell's body and footer rather
 * than trying to patch the existing form's DOM in place.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { renderAddRecipeForm } from "./add-recipe-form";
import { blankRecipe, resolveDestinationFolder } from "./import-submit";
import { BaseModal } from "./modal-shell";

export class ImportRecipeModal extends BaseModal {
	private recipe: ExtractedRecipe;
	private folder: string;
	private warning: string | null = null;

	// Stored refs so render() can repopulate them when an import replaces the recipe
	private currentBodyEl!: HTMLElement;
	private currentFooterEl!: HTMLElement;

	constructor(app: App, private readonly settings: RecipeBoxSettings) {
		super(app);
		this.recipe = blankRecipe();
		this.folder = resolveDestinationFolder(settings);
	}

	getTitle(): string { return "Add recipe"; }
	getContentClasses(): string[] { return ["rb-import-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		this.currentBodyEl = bodyEl;
		// BaseModal calls renderFooter() before renderBody(), so don't
		// trigger render() from whichever one runs second based on assumed
		// order -- explicitly check that both refs are set instead.
		if (this.currentFooterEl) this.render();
	}

	renderFooter(footerEl: HTMLElement): void {
		this.currentFooterEl = footerEl;
		if (this.currentBodyEl) this.render();
	}

	private render(): void {
		this.currentBodyEl.empty();
		this.currentFooterEl.empty();
		// The form is always the wide layout now (no more narrow input stage
		// to size against). Has to go on modalEl, not contentEl: contentEl is
		// the inner .modal-content, and Obsidian's .modal itself has a fixed
		// width, so a class on contentEl alone never changes the dialog size.
		this.modalEl.addClass("rb-import-modal--wide");

		renderAddRecipeForm(
			this.currentBodyEl,
			this.currentFooterEl,
			this.app,
			this.settings,
			this.recipe,
			this.folder,
			this.warning,
			{
				onImported: (recipe, warning) => {
					this.recipe = recipe;
					this.warning = warning;
					this.render();
				},
				onFolderChange: (folder) => { this.folder = folder; },
				onCancel: () => { this.close(); },
				onSaved: () => { this.close(); },
			},
		);
	}
}
