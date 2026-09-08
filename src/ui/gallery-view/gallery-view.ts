/**
 * The recipe gallery view — a persistent grid of every in-scope recipe with
 * search, filters, and sort. Re-renders on metadataCache changes (favorite/
 * rating/cook-history edits made elsewhere) via GalleryViewDeps.subscribeToChanges.
 */
import { ItemView, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { GalleryViewDeps } from "./gallery-view-deps";
import { GallerySavedState, RecipeBoxSettings } from "../../settings/settings-types";
import { renderGalleryToolbar } from "./gallery-toolbar";
import { renderGalleryCard, GalleryCardHandle, GalleryCardActions } from "./gallery-card";
import { matchesGalleryFilters } from "./gallery-filters";
import { sortGalleryFiles } from "./gallery-sort";
import { renderStatsRow } from "./gallery-result-stats";
import { runLazyImagePass, getFrontmatterImageSrc } from "./gallery-image";
import { resolveImagePath } from "../recipe-view/image-resolve";
import { defaultRecipeImageValue } from "../../parser/resolve-hero-image";
import { captureFocus, restoreFocus } from "./focus-restore";
import { DEFAULT_SETTINGS } from "../../settings/settings-defaults";

export const GALLERY_VIEW_TYPE = "recipe-box-gallery-view";

/**
 * The state a freshly opened gallery view starts from. Sort and search
 * persist across sessions unconditionally; the actual filters (folder, tag,
 * rating, the two checkboxes, and property filters) only carry over when the
 * user has opted in via "Remember filters" -- otherwise every filter resets
 * to its default even though gallerySavedState keeps being written to on
 * every change (so a mid-session "Remember filters" toggle-on captures
 * whatever's currently active, not stale data from before the setting existed).
 */
function initialGalleryState(settings: RecipeBoxSettings): GallerySavedState {
	const saved = settings.gallerySavedState;
	if (settings.galleryRememberFilters) return { ...saved };
	const defaults = DEFAULT_SETTINGS.gallerySavedState;
	return {
		...saved,
		folder: defaults.folder,
		tag: defaults.tag,
		favoriteOnly: defaults.favoriteOnly,
		minRating: defaults.minRating,
		neverCooked: defaults.neverCooked,
		excludeAllergens: defaults.excludeAllergens,
		fieldFilters: [...defaults.fieldFilters],
	};
}

export class GalleryView extends ItemView {
	private deps: GalleryViewDeps;
	private unsubscribe: (() => void) | null = null;
	private state: GallerySavedState;
	private filterPanelOpen = false;
	// Bumped on every re-render/close so an in-flight lazy image pass from a
	// previous render stops touching the vault and writing into stale DOM.
	private renderGeneration = 0;

	constructor(leaf: WorkspaceLeaf, deps: GalleryViewDeps) {
		super(leaf);
		this.deps = deps;
		this.state = initialGalleryState(deps.getSettings());
		this.navigation = true;
	}

	getViewType(): string { return GALLERY_VIEW_TYPE; }
	getDisplayText(): string { return "Recipe gallery"; }
	getIcon(): string { return "layout-grid"; }

	async onOpen(): Promise<void> {
		this.unsubscribe = this.deps.subscribeToChanges(() => this.render());
		this.render();
	}

	async onClose(): Promise<void> {
		this.renderGeneration++;
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	/**
	 * Obsidian's leaf navigation history (back/forward) destroys and recreates
	 * a view on every step, but replays whatever getState() last returned via
	 * setState() -- this is how "back" is distinguished from a genuinely fresh
	 * open (ribbon icon, command palette, folder click) at the same call site
	 * that always resets filters otherwise: going back to the gallery after
	 * opening a recipe restores the filters as they were, while a deliberate
	 * new open still resets them (unless "Remember filters" is on).
	 */
	getState(): Record<string, unknown> {
		return { galleryState: this.state, filterPanelOpen: this.filterPanelOpen };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		await super.setState(state, result);
		const s = state as { galleryState?: GallerySavedState; filterPanelOpen?: boolean } | null | undefined;
		if (!s) return;
		if (s.galleryState) this.state = s.galleryState;
		if (typeof s.filterPanelOpen === "boolean") this.filterPanelOpen = s.filterPanelOpen;
		if (s.galleryState || typeof s.filterPanelOpen === "boolean") this.render();
	}

	private onStateChange = (next: GallerySavedState): void => {
		this.state = next;
		void this.deps.saveGalleryState(next);
		this.render();
	};

	/** Called by the folder-click-opens-gallery adapters (see src/integrations/). */
	applyFolderFilter(folder: string): void {
		this.onStateChange({ ...this.state, folder });
	}

	/** Called by the dashboard's search box (see src/ui/dashboard-view/). */
	applySearchFilter(search: string): void {
		this.onStateChange({ ...this.state, search });
	}

	private onToggleFilterPanel = (): void => {
		this.filterPanelOpen = !this.filterPanelOpen;
		this.render();
	};

	// A persistence preference, not part of the filter state itself -- doesn't
	// touch this.state or re-run matching, just where the next view load reads from.
	private onToggleRememberFilters = (remember: boolean): void => {
		this.deps.getSettings().galleryRememberFilters = remember;
		void this.deps.saveSettings();
	};

	private render(): void {
		this.renderGeneration++;
		const generation = this.renderGeneration;

		const existing = this.contentEl.querySelector(".rb-gallery-content");
		// The whole toolbar (search box, and now per-property filter value
		// inputs) is rebuilt on every render, which would otherwise drop focus
		// mid-typing as soon as a debounced input fires the re-render it caused
		// -- capture whichever tagged input was focused here and restore it below.
		const focusSnapshot = captureFocus(existing);
		if (existing) existing.remove();

		const content = this.contentEl.createDiv({ cls: "rb-gallery-content" });
		const settings = this.deps.getSettings();
		const files = this.deps.getAllRecipeNotes();

		renderGalleryToolbar(
			content,
			this.app,
			files,
			this.state,
			settings,
			this.deps.getDiscovery(),
			settings.myAllergens.length > 0,
			this.filterPanelOpen,
			this.onStateChange,
			this.onToggleRememberFilters,
			this.onToggleFilterPanel,
		);

		restoreFocus(content, focusSnapshot);

		const filtered = files.filter((file) =>
			matchesGalleryFilters(this.app, file, this.app.metadataCache.getFileCache(file), this.state, settings),
		);
		const sorted = sortGalleryFiles(filtered, this.state.sortField, this.state.sortDirection, this.app, settings);

		if (sorted.length === 0) {
			content.createDiv({
				cls: "rb-gallery-empty",
				text: files.length === 0 ? "No recipes found in your recipe folders." : "No recipes match the current filters.",
			});
			return;
		}

		renderStatsRow(content, sorted, this.state);


		const grid = content.createDiv({ cls: "rb-gallery-grid" });
		const needsLazyImage: GalleryCardHandle[] = [];

		const cardActions: GalleryCardActions = {
			openRecipe: (f) => this.deps.openRecipe(f.path),
			openAddToMealPlanModal: (f) => this.deps.openAddToMealPlanModal(f),
			openAddToGroceryModal: (f) => this.deps.openAddToGroceryModal(f),
			openShareModal: (f) => this.deps.openShareModal(f),
		};

		for (const file of sorted) {
			const handle = renderGalleryCard(grid, this.app, file, settings, cardActions);
			if (!getFrontmatterImageSrc(this.app, file, settings)) needsLazyImage.push(handle);
		}

		if (needsLazyImage.length > 0) {
			// Resolved once per render, not per card -- the lazy pass callback runs
			// once for every card still missing an image after both the frontmatter
			// and body lookups came up empty, so this is the true "nothing found"
			// landing point. Never applied to public shares, display-only.
			const defaultImageValue = defaultRecipeImageValue(settings);
			const defaultSrc = defaultImageValue ? resolveImagePath(this.app, defaultImageValue) : null;
			void runLazyImagePass(
				this.app,
				needsLazyImage.map((h) => h.file),
				settings,
				(file, src) => {
					const handle = needsLazyImage.find((h) => h.file.path === file.path);
					handle?.setImage(src ?? defaultSrc);
				},
				() => generation !== this.renderGeneration,
			);
		}
	}
}
