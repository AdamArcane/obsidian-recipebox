/**
 * Two-stage add-recipe modal: input stage (URL, pasted text, or manual entry)
 * followed by a review/edit stage before the note is written to the vault.
 * The review stage is the plugin's one official "add a recipe" screen --
 * URL and text imports just prefill it, Manual opens it blank.
 *
 * Extends BaseModal; stage transitions clear and repopulate the shell's body
 * and footer rather than rebuilding the whole modal from scratch.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { InputStageState, renderInputStage } from "./import-input-stage";
import { renderReviewStage } from "./import-review-stage";
import { resolveDestinationFolder } from "./import-submit";
import { BaseModal } from "./modal-shell";

export class ImportRecipeModal extends BaseModal {
	private stage: "input" | "review" = "input";
	private inputState: InputStageState;
	private reviewData: { recipe: ExtractedRecipe; folder: string; warning: string | null } | null = null;

	// Stored refs so renderStage() can repopulate them on stage transitions
	private currentBodyEl!: HTMLElement;
	private currentFooterEl!: HTMLElement;

	constructor(app: App, private readonly settings: RecipeBoxSettings) {
		super(app);
		this.inputState = {
			tab: "url",
			url: "",
			text: "",
			titleOverride: "",
			folder: resolveDestinationFolder(settings),
		};
	}

	getTitle(): string {
		return this.stage === "input" ? "Import recipe" : "Review recipe";
	}
	getContentClasses(): string[] { return ["rb-import-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		this.currentBodyEl = bodyEl;
		// BaseModal calls renderFooter() before renderBody(), so don't
		// trigger renderStage() from whichever one runs second based on
		// assumed order -- explicitly check that both refs are set instead.
		if (this.currentFooterEl) this.renderStage();
	}

	renderFooter(footerEl: HTMLElement): void {
		this.currentFooterEl = footerEl;
		if (this.currentBodyEl) this.renderStage();
	}

	private renderStage(): void {
		this.currentBodyEl.empty();
		this.currentFooterEl.empty();
		// Keep the shell title in sync with the current stage
		this.shellTitleEl.textContent = this.getTitle();
		// The review stage is the plugin's one official "add a recipe" screen
		// (manual entry included), so it gets a wider layout than the small
		// input-stage picker -- toggled here rather than baked into
		// getContentClasses() since BaseModal only reads that once, at open.
		// This has to go on modalEl, not contentEl: contentEl is the inner
		// .modal-content, and Obsidian's .modal itself has a fixed width, so a
		// class on contentEl alone never changes what the dialog looks like.
		this.modalEl.toggleClass("rb-import-modal--wide", this.stage === "review");

		if (this.stage === "input") {
			renderInputStage(
				this.currentBodyEl,
				this.currentFooterEl,
				this.app,
				this.settings,
				this.inputState,
				(recipe, folder, warning) => {
					this.reviewData = { recipe, folder, warning };
					this.stage = "review";
					this.renderStage();
				},
			);
		} else if (this.stage === "review" && this.reviewData) {
			renderReviewStage(
				this.currentBodyEl,
				this.currentFooterEl,
				this.app,
				this.settings,
				this.reviewData.recipe,
				this.reviewData.folder,
				this.reviewData.warning,
				() => {
					this.stage = "input";
					this.renderStage();
				},
				() => { this.close(); },
			);
		}
	}
}
