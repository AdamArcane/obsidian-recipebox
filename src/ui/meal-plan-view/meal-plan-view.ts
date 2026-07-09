/**
 * The meal plan view — an Obsidian ItemView that renders the weekly grid and
 * queue column, re-rendering on every "change" event.
 */
import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import { MealPlanViewDeps } from "./meal-plan-view-deps";
import { renderWeekGrid } from "./week-grid";
import { ConfirmModal } from "../modals/confirm-modal";
import { SuggestMealModal } from "../modals/suggest-meal-modal";
import { RecipePickerModal } from "../modals/recipe-picker-modal";

export const MEAL_PLAN_VIEW_TYPE = "recipe-box-meal-plan-view";

export class MealPlanView extends ItemView {
	private deps: MealPlanViewDeps;
	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, deps: MealPlanViewDeps) {
		super(leaf);
		this.deps = deps;
	}

	getViewType(): string { return MEAL_PLAN_VIEW_TYPE; }
	getDisplayText(): string { return "Meal plan"; }
	getIcon(): string { return "calendar"; }

	async onOpen(): Promise<void> {
		this.addAction("pencil", "Edit as Markdown", () => this.deps.editAsMarkdown());
		this.unsubscribe = this.deps.subscribeToChanges(() => this.render());
		this.render();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("rb-meal-plan-view");

		const topBar = contentEl.createDiv({ cls: "rb-mpv-top-bar" });

		const addRecipeBtn = topBar.createEl("button", { cls: "rb-icon-btn rb-mpv-add-recipe-btn" });
		setIcon(addRecipeBtn.createSpan({ cls: "rb-mpv-add-recipe-btn-icon" }), "plus");
		addRecipeBtn.createSpan({ cls: "rb-mpv-add-recipe-btn-label", text: "Add recipe" });
		addRecipeBtn.addEventListener("click", () => {
			new RecipePickerModal(
				this.app, this.deps.getSettings(), undefined,
				(file) => { this.deps.openAddToMealPlanModal(file); },
				(label) => { this.deps.openAddCustomMealModal(label, undefined); },
			).open();
		});

		const suggestMealBtn = topBar.createEl("button", { cls: "rb-icon-btn rb-mpv-suggest-meal-btn" });
		setIcon(suggestMealBtn.createSpan({ cls: "rb-mpv-suggest-meal-btn-icon" }), "wand-sparkles");
		suggestMealBtn.createSpan({ cls: "rb-mpv-suggest-meal-btn-label", text: "Suggest a meal" });

		suggestMealBtn.addEventListener("click", () => {
			new SuggestMealModal(this.app, {
				getSettings: () => this.deps.getSettings(),
				saveSettings: () => this.deps.saveSettings(),
				getDiscovery: () => this.deps.getDiscovery(),
				openFile: (file) => this.deps.openRecipe(file.path),
				getMealPlan: () => this.deps.getMealPlan(),
				addMealPlanEntry: (path, day) => this.deps.addToMealPlan(path, day),
				setMealType: (id, mealType) => this.deps.setMealType(id, mealType),
				clearMealPlan: (alsoRemove) => this.deps.clearMealPlan(alsoRemove),
				openMealPlan: () => this.deps.openMealPlanView(),
			}).open();
		});

		const clearBtn = topBar.createEl("button", { cls: "rb-icon-btn rb-mpv-clear-btn" });
		setIcon(clearBtn.createSpan({ cls: "rb-mpv-clear-btn-icon" }), "eraser");
		clearBtn.createSpan({ cls: "rb-mpv-clear-btn-label", text: "Clear all" });
		clearBtn.addEventListener("click", () => {
			new ConfirmModal(
				this.app,
				"Clear meal plan?",
				"Every scheduled recipe and leftovers card will be removed from the meal plan.",
				"Clear meal plan",
				{
					destructive: true,
					checkbox: {
						label: "Also remove these recipes' ingredients from the grocery list",
						defaultChecked: true,
					},
					onConfirm: (removeFromGrocery) => {
						void this.deps.clearMealPlan(removeFromGrocery).then((count) => {
							const n = count === 1 ? "entry" : "entries";
							new Notice(`Cleared ${count} meal plan ${n}.`);
						});
					},
				},
			).open();
		});

		const entries = this.deps.getMealPlan();
		renderWeekGrid(contentEl, entries, this.app, this.deps);
	}
}
