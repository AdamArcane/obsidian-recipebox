import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import { MealPlanViewDeps } from "./meal-plan-view-deps";
import { renderWeekGrid } from "./week-grid";
import { ConfirmModal } from "../modals/confirm-modal";

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
		const clearBtn = topBar.createEl("button", { cls: "rb-mpv-clear-btn" });
		setIcon(clearBtn.createSpan({ cls: "rb-mpv-clear-btn-icon" }), "trash-2");
		clearBtn.createSpan({ cls: "rb-mpv-clear-btn-label", text: "Clear meal plan" });
		clearBtn.addEventListener("click", () => {
			new ConfirmModal(
				this.app,
				"Clear meal plan?",
				"This removes every scheduled recipe and leftovers card from the meal plan, and also removes their contributed ingredients from your grocery list (anything you added manually stays untouched).",
				"Clear meal plan",
				{
					destructive: true,
					onConfirm: () => {
						void this.deps.clearMealPlan().then((count) => {
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
