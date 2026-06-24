import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { findOrOpenLeaf } from "./utils/open-leaf";
import { RecipeBoxSettings } from "./settings/settings-types";
import { GroceryManager } from "./grocery/manager";
import { mergeSettings } from "./lifecycle/settings-persistence";
import { registerViews } from "./lifecycle/register-views";
import { registerVaultWatchers } from "./lifecycle/register-vault-watchers";
import { registerAutoOpen, registerContextMenu } from "./lifecycle/recipe-file-detection";
import { registerMarkdownRecipeButton } from "./lifecycle/markdown-recipe-button";
import { registerCommands } from "./commands/index";
import { RecipeBoxSettingsTab } from "./ui/settings/settings-tab";
import { GROCERY_VIEW_TYPE } from "./ui/grocery-view";
import { RECIPE_VIEW_TYPE, RecipeView } from "./ui/recipe-view/recipe-view";
import { MEAL_PLAN_VIEW_TYPE } from "./ui/meal-plan-view/meal-plan-view";
import { scrollToHeading } from "./ui/recipe-view/jump-bar";

export default class RecipeBoxPlugin extends Plugin {
	settings!: RecipeBoxSettings;
	manager!: GroceryManager;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.manager = new GroceryManager(this.app, {
			getSettings: () => this.settings,
			save: () => this.saveSettings(),
		});

		registerViews(this);
		registerCommands(this);
		registerVaultWatchers(this);

		this.addSettingTab(new RecipeBoxSettingsTab(this.app, this));

		this.addRibbonIcon("shopping-cart", "Open grocery list", () => this.activateGroceryView());
		this.addRibbonIcon("calendar", "Open meal plan", () => this.activateMealPlanView());

		registerAutoOpen(
			this,
			() => this.settings,
			(leaf, file) => this.openCurrentFileAsRecipe(leaf, file)
		);
		registerContextMenu(
			this,
			() => this.settings,
			(leaf, file) => this.openCurrentFileAsRecipe(leaf, file)
		);
		registerMarkdownRecipeButton(
			this,
			() => this.settings,
			(leaf, file) => this.openCurrentFileAsRecipe(leaf, file)
		);

		this.app.workspace.onLayoutReady(() => this.manager.refresh());

	}

	onunload(): void {
	}

	async loadSettings(): Promise<void> {
		this.settings = mergeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.notifyRecipeViews();
	}

	// ── public helpers called by lifecycle modules and commands ───────────────

	async activateMealPlanView(): Promise<void> {
		await findOrOpenLeaf(this.app, MEAL_PLAN_VIEW_TYPE);
	}

	async activateGroceryView(): Promise<void> {
		await findOrOpenLeaf(this.app, GROCERY_VIEW_TYPE);
	}

	openCurrentFileAsRecipe(leaf: WorkspaceLeaf, file: TFile): void {
		void leaf.setViewState({ type: RECIPE_VIEW_TYPE, state: { file: file.path }, active: true });
	}

	openCurrentFileAsMarkdown(leaf: WorkspaceLeaf): void {
		const file = this.app.workspace.getActiveFile();
		if (!file) return;
		void leaf.setViewState({ type: "markdown", state: { file: file.path }, active: true });
	}

	async openMealPlanNote(): Promise<void> {
		const path = this.settings.mealPlanPath;
		let file = this.app.vault.getFileByPath(path);
		if (!file) {
			file = await this.app.vault.create(path, "");
		}
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.openFile(file);
	}

	async navigateToGroceryCategory(category: string): Promise<void> {
		const path = this.settings.groceryListPath;
		let file = this.app.vault.getFileByPath(path);
		if (!file) file = await this.app.vault.create(path, "# Grocery List\n");
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.openFile(file);
		window.setTimeout(() => scrollToHeading(leaf.view.containerEl, category), 50);
	}

	private notifyRecipeViews(): void {
		this.app.workspace.getLeavesOfType(RECIPE_VIEW_TYPE).forEach((leaf) => {
			const view = leaf.view;
			if (view instanceof RecipeView) view.refresh();
		});
	}
}
