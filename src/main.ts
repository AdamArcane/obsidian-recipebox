/**
 * Plugin entry point — bootstraps the GroceryManager, registers all views,
 * commands, lifecycle hooks, and the settings tab on Obsidian load.
 */
import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { findOrOpenLeaf } from "./utils/open-leaf";
import { RecipeBoxSettings } from "./settings/settings-types";
import { GroceryManager } from "./grocery/manager";
import { DiscoveryCache } from "./discovery/discovery-cache";
import { mergeSettings } from "./lifecycle/settings-persistence";
import { resolveNotePath } from "./utils/vault-notes";
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
	discoveryCache!: DiscoveryCache;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.manager = new GroceryManager(this.app, {
			getSettings: () => this.settings,
			save: () => this.saveSettings(),
		});
		this.discoveryCache = new DiscoveryCache();

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

		this.app.workspace.onLayoutReady(() => {
			void this.manager.refresh();
			// Populate the discovery cache so the mode editor field picker has real fields.
			void this.discoveryCache.refresh(this.app, this.settings);
		});

	}

	onunload(): void {
	}

	async loadSettings(): Promise<void> {
		const raw = await this.loadData() as unknown;
		this.settings = mergeSettings(raw);

		// Fresh install (no saved data yet): create the default recipe folder so
		// the recipeFolders scope set in DEFAULT_SETTINGS actually exists on disk.
		// Only runs once, existing installs (raw !== null) never hit this.
		if (raw === null || raw === undefined) {
			await this.ensureDefaultRecipeFolderExists();
		}
	}

	private async ensureDefaultRecipeFolderExists(): Promise<void> {
		for (const folderPath of this.settings.recipeFolders) {
			const existing = this.app.vault.getAbstractFileByPath(folderPath);
			if (existing) continue; // already exists as a folder (or a same-named file, left alone either way)
			try {
				await this.app.vault.createFolder(folderPath);
			} catch {
				// Non-fatal: if creation fails (e.g. a race, or an invalid path), the
				// user can still create the folder manually or adjust the setting.
			}
		}
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
		const path = resolveNotePath(this.settings.mealPlanPath);
		let file = this.app.vault.getFileByPath(path);
		if (!file) {
			file = await this.app.vault.create(path, "");
		}
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.openFile(file);
	}

	async navigateToGroceryCategory(category: string): Promise<void> {
		const path = resolveNotePath(this.settings.groceryListPath);
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
