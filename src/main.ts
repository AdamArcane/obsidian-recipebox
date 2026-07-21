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
import { registerAutoOpen, registerContextMenu, suppressAutoOpenOnce } from "./lifecycle/recipe-file-detection";
import { registerMarkdownRecipeButton } from "./lifecycle/markdown-recipe-button";
import { registerCommands } from "./commands/index";
import { RecipeBoxSettingsTab } from "./ui/settings/settings-tab";
import { GROCERY_VIEW_TYPE } from "./ui/grocery-view";
import { RECIPE_VIEW_TYPE, RecipeView } from "./ui/recipe-view/recipe-view";
import { MEAL_PLAN_VIEW_TYPE } from "./ui/meal-plan-view/meal-plan-view";
import { GALLERY_VIEW_TYPE, GalleryView } from "./ui/gallery-view";
import { DASHBOARD_VIEW_TYPE } from "./ui/dashboard-view";
import { scrollToHeading } from "./ui/recipe-view/jump-bar";
import { createFolderClickGalleryController, FolderClickGalleryController } from "./lifecycle/register-folder-click-gallery";

export default class RecipeBoxPlugin extends Plugin {
	settings!: RecipeBoxSettings;
	manager!: GroceryManager;
	discoveryCache!: DiscoveryCache;
	private folderClickGallery!: FolderClickGalleryController;
	private dashboardRibbonIcon!: HTMLElement;
	private individualRibbonIcons: HTMLElement[] = [];

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

		this.folderClickGallery = createFolderClickGalleryController(this);
		this.folderClickGallery.sync();

		this.addSettingTab(new RecipeBoxSettingsTab(this.app, this));

		this.setUpRibbonIcons();

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
			// The earlier sync() call above runs before the workspace layout (and
			// therefore the file explorer's DOM) exists, so any folder underlines
			// it tried to apply found nothing to mark. onLayoutReady alone still
			// fires before the explorer has actually painted its rows though (its
			// DOM builds asynchronously after layout restore) -- a plain retry
			// here still finds nothing, only a later user click (which happens to
			// fire its own layout-change) does. Same class of "Obsidian internals
			// haven't caught up yet" timing gap as registerAutoOpen's setTimeout
			// in recipe-file-detection.ts; same fix.
			window.setTimeout(() => this.folderClickGallery.sync(), 50);
		});

	}

	onunload(): void {
		this.folderClickGallery?.cleanup();
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
		// Every settings change (including the folder-click toggles) flows
		// through here, so this is what makes toggling take effect immediately.
		this.folderClickGallery?.sync();
		this.refreshRibbonIcons();
	}

	// Creates both ribbon icon sets once, up front. Obsidian's ribbon doesn't
	// reliably drop an icon added via addRibbonIcon() when you later call
	// remove() on the returned element -- it appears to keep its own record of
	// registered ribbon actions and can redraw the "removed" one back in, so
	// toggling by add/remove left stale icons behind. Building both sets once
	// and toggling visibility with the rb-hidden CSS class sidesteps that
	// entirely: the DOM nodes never leave the ribbon, so there's nothing for
	// Obsidian to resurrect.
	private setUpRibbonIcons(): void {
		this.dashboardRibbonIcon = this.addRibbonIcon("tool-case", "Recipe box dashboard", () => this.activateDashboardView());
		this.individualRibbonIcons = [
			this.addRibbonIcon("shopping-cart", "Open grocery list", () => this.activateGroceryView()),
			this.addRibbonIcon("calendar", "Open meal plan", () => this.activateMealPlanView()),
			this.addRibbonIcon("layout-list", "Browse recipes", () => this.activateGalleryView()),
		];
		this.refreshRibbonIcons();
	}

	private refreshRibbonIcons(): void {
		this.dashboardRibbonIcon.toggleClass("rb-hidden", !this.settings.enableDashboard);
		this.individualRibbonIcons.forEach((icon) => icon.toggleClass("rb-hidden", this.settings.enableDashboard));
	}

	// ── public helpers called by lifecycle modules and commands ───────────────

	async activateDashboardView(): Promise<void> {
		await findOrOpenLeaf(this.app, DASHBOARD_VIEW_TYPE);
	}

	async activateMealPlanView(): Promise<void> {
		await findOrOpenLeaf(this.app, MEAL_PLAN_VIEW_TYPE);
	}

	async activateGroceryView(): Promise<void> {
		await findOrOpenLeaf(this.app, GROCERY_VIEW_TYPE);
	}

	async activateGalleryView(folder?: string, options?: { newLeaf?: boolean | "tab" }, search?: string): Promise<void> {
		const leaf = await findOrOpenLeaf(this.app, GALLERY_VIEW_TYPE, undefined, options?.newLeaf ?? "tab");
		if (folder !== undefined && leaf.view instanceof GalleryView) {
			leaf.view.applyFolderFilter(folder);
		}
		if (search !== undefined && leaf.view instanceof GalleryView) {
			leaf.view.applySearchFilter(search);
		}
	}

	openCurrentFileAsRecipe(leaf: WorkspaceLeaf, file: TFile): void {
		void leaf.setViewState({ type: RECIPE_VIEW_TYPE, state: { file: file.path }, active: true });
	}

	openCurrentFileAsMarkdown(leaf: WorkspaceLeaf): void {
		const file = this.app.workspace.getActiveFile();
		if (!file) return;
		suppressAutoOpenOnce(file.path);
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
