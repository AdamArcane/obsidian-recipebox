/**
 * Two-stage import modal: input stage (URL or pasted text) followed by a
 * review/edit stage before the note is written to the vault.
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
	private reviewData: { recipe: ExtractedRecipe; folder: string } | null = null;

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

		if (this.stage === "input") {
			renderInputStage(
				this.currentBodyEl,
				this.currentFooterEl,
				this.app,
				this.settings,
				this.inputState,
				(recipe, folder) => {
					this.reviewData = { recipe, folder };
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
				() => {
					this.stage = "input";
					this.renderStage();
				},
			);
		}
	}
}
