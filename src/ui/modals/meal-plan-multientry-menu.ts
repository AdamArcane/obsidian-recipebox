import { Modal, App, TFile } from "obsidian";
import { MealPlanEntry } from "../../types";
import { openMealPlanEntryMenu } from "./meal-plan-entry-menu";
import { resolveStatusText } from "../recipe-view/meal-plan-status";
import { RecipeViewDeps } from "../recipe-view/recipe-view-deps";

export class MealPlanMultiEntryMenu extends Modal {
	constructor(
		app: App,
		private readonly file: TFile,
		private readonly entries: MealPlanEntry[],
		private readonly deps: RecipeViewDeps
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("Scheduled multiple times");
		const { contentEl } = this;
		const list = contentEl.createDiv({ cls: "rb-mp-entry-list" });
		for (const entry of this.entries) {
			const row = list.createDiv({ cls: "rb-mp-entry-row" });
			row.textContent = resolveStatusText([entry]);
			row.addEventListener("click", (e) => {
				this.close();
				openMealPlanEntryMenu(e, this.app, this.file, entry, this.deps);
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
