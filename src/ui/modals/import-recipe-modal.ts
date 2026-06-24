import { App, Modal } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { InputStageState, renderInputStage } from "./import-input-stage";
import { renderReviewStage } from "./import-review-stage";
import { resolveDestinationFolder } from "./import-submit";

export class ImportRecipeModal extends Modal {
	private stage: "input" | "review" = "input";
	private inputState: InputStageState;
	private reviewData: { recipe: ExtractedRecipe; folder: string } | null = null;

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

	onOpen(): void {
		this.contentEl.addClass("rb-modal", "rb-import-modal");
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		this.contentEl.empty();

		if (this.stage === "input") {
			renderInputStage(
				this.contentEl,
				this.app,
				this.settings,
				this.inputState,
				(recipe, folder) => {
					this.reviewData = { recipe, folder };
					this.stage = "review";
					this.render();
				},
			);
		} else if (this.stage === "review" && this.reviewData) {
			renderReviewStage(
				this.contentEl,
				this.app,
				this.settings,
				this.reviewData.recipe,
				this.reviewData.folder,
				() => {
					this.stage = "input";
					this.render();
				},
			);
		}
	}
}
