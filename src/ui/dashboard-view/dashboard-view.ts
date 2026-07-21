/**
 * The dashboard view -- a glance surface over stats, meal plan, grocery list,
 * and recent recipes. Re-renders fresh on every open/change; nothing here is
 * persisted (see dashboard-spec.md sections 0.5 and 10). Layout is a single
 * 12-column CSS grid (section 11.1) so there's one source of truth for column
 * math instead of nested flexbox rows.
 */
import { ItemView, WorkspaceLeaf } from "obsidian";
import { RecipeBoxSettings, DashboardActivityRangeWeeks } from "../../settings/settings-types";
import { DashboardViewDeps } from "./dashboard-view-deps";
import { computeDashboardStats, computeCookingActivity } from "./dashboard-stats";
import { renderStatsRow } from "./stats-row";
import { renderMealPlanMiniGrid } from "./meal-plan-mini-grid";
import { renderGroceryPreview } from "./grocery-preview";
import { renderNewRecipesStrip } from "./new-recipes-strip";
import { renderQuickActions } from "./quick-actions";
import { renderGreeting } from "./greeting";
import { renderSharedRecipesPreview } from "./shared-recipes-preview";
import { GalleryCardActions } from "../gallery-view/gallery-card";

export const DASHBOARD_VIEW_TYPE = "recipe-box-dashboard-view";

export class DashboardView extends ItemView {
	private deps: DashboardViewDeps;
	private unsubscribe: (() => void) | null = null;
	// Bumped on every re-render/close so an in-flight lazy image pass from a
	// previous render (see new-recipes-strip.ts) stops touching stale DOM.
	private renderGeneration = 0;

	constructor(leaf: WorkspaceLeaf, deps: DashboardViewDeps) {
		super(leaf);
		this.deps = deps;
		this.navigation = true;
	}

	getViewType(): string { return DASHBOARD_VIEW_TYPE; }
	getDisplayText(): string { return "Dashboard"; }
	getIcon(): string { return "chef-hat"; }

	async onOpen(): Promise<void> {
		this.unsubscribe = this.deps.subscribeToChanges(() => this.render());
		this.render();
	}

	async onClose(): Promise<void> {
		this.renderGeneration++;
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	// Range changes are a dashboard-local settings edit, same posture as
	// GalleryView.onStateChange -- mutate, persist, then re-render immediately
	// rather than waiting on the "change"/metadataCache subscription, since
	// neither of those fires for a settings-only edit.
	private onActivityRangeChange = (weeks: DashboardActivityRangeWeeks): void => {
		const settings = this.deps.getSettings();
		settings.dashboardActivityRangeWeeks = weeks;
		void this.deps.saveSettings();
		this.render();
	};

	private renderMealPlanCard(grid: HTMLElement, settings: RecipeBoxSettings): void {
		const card = grid.createDiv({ cls: "rb-dashboard-card rb-dashboard-span-12" });
		card.createDiv({ cls: "rb-dashboard-card-label", text: "Meal plan this week" });

		const mealPlan = this.deps.getMealPlan();
		renderMealPlanMiniGrid(card, this.app, mealPlan, settings, {
			openRecipe: this.deps.openRecipe,
			openMealPlanView: this.deps.openMealPlanView,
			openSuggestMealModal: this.deps.openSuggestMealModal,
		});

		if (mealPlan.length === 0) {
			const empty = card.createDiv({ cls: "rb-dashboard-empty-cta" });
			empty.createSpan({ cls: "rb-dashboard-empty-text", text: "Your meal plan is empty." });
			const planBtn = empty.createEl("button", { cls: "rb-dashboard-empty-cta-btn", text: "Plan a meal" });
			planBtn.addEventListener("click", () => this.deps.openSuggestMealModal());
		}

		const footer = card.createEl("button", { cls: "rb-dashboard-footer-btn", text: "View/edit meal plan →" });
		footer.addEventListener("click", () => this.deps.openMealPlanView());
	}

	private renderEmptyVaultCard(grid: HTMLElement): void {
		const card = grid.createDiv({ cls: "rb-dashboard-card rb-dashboard-span-8 rb-dashboard-empty-vault-cta" });
		const btn = card.createEl("button", { cls: "rb-dashboard-empty-cta-btn", text: "Add your first recipe" });
		btn.addEventListener("click", () => this.deps.openImportModal());
	}

	private render(): void {
		this.renderGeneration++;
		const generation = this.renderGeneration;

		this.contentEl.empty();
		this.contentEl.addClass("rb-dashboard-view");

		const settings = this.deps.getSettings();
		const files = this.deps.getAllRecipeNotes();

		renderGreeting(this.contentEl);

		const grid = this.contentEl.createDiv({ cls: "rb-dashboard-grid" });

		renderQuickActions(grid, {
			openImportModal: this.deps.openImportModal,
			openAddGroceryItemModal: this.deps.openAddGroceryItemModal,
			openSuggestMealModal: this.deps.openSuggestMealModal,
			searchRecipes: this.deps.searchRecipes,
		});

		const stats = computeDashboardStats(this.app, files, settings);
		const activity = computeCookingActivity(this.app, files, settings, settings.dashboardActivityRangeWeeks);
		renderStatsRow(grid, stats, activity, settings, {
			openGalleryView: this.deps.openGalleryView,
			openRecipe: this.deps.openRecipe,
			activityRangeWeeks: settings.dashboardActivityRangeWeeks,
			onActivityRangeChange: this.onActivityRangeChange,
		});

		this.renderMealPlanCard(grid, settings);

		if (files.length === 0) {
			this.renderEmptyVaultCard(grid);
		} else {
			const cardActions: GalleryCardActions = {
				openRecipe: (f) => this.deps.openRecipe(f),
				openAddToMealPlanModal: (f) => this.deps.openAddToMealPlanModal(f),
				openAddToGroceryModal: (f) => this.deps.openAddToGroceryModal(f),
				openShareModal: (f) => this.deps.openShareModal(f),
			};
			renderNewRecipesStrip(
				grid,
				this.app,
				files,
				settings,
				cardActions,
				this.deps.openGalleryView,
				() => generation !== this.renderGeneration,
			);
		}

		renderGroceryPreview(grid, this.deps.getGroceryItems(), {
			toggleChecked: this.deps.toggleChecked,
			openGroceryView: this.deps.openGroceryView,
		});

		renderSharedRecipesPreview(grid, this.app, files, settings, {
			openRecipe: (f) => this.deps.openRecipe(f),
			unshareRecipe: (f) => this.deps.unshareRecipe(f),
		});
	}
}
