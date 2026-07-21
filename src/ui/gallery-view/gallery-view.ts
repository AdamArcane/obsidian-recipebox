/**
 * The recipe gallery view — a persistent grid of every in-scope recipe with
 * search, filters, and sort. Re-renders on metadataCache changes (favorite/
 * rating/cook-history edits made elsewhere) via GalleryViewDeps.subscribeToChanges.
 */
import { ItemView, WorkspaceLeaf } from "obsidian";
import { GalleryViewDeps } from "./gallery-view-deps";
import { GallerySavedState } from "../../settings/settings-types";
import { renderGalleryToolbar } from "./gallery-toolbar";
import { renderGalleryCard, GalleryCardHandle, GalleryCardActions } from "./gallery-card";
import { matchesGalleryFilters } from "./gallery-filters";
import { sortGalleryFiles } from "./gallery-sort";
import { renderStatsRow } from "./gallery-result-stats";
import { runLazyImagePass, getFrontmatterImageSrc } from "./gallery-image";
import { resolveImagePath } from "../recipe-view/image-resolve";
import { defaultRecipeImageValue } from "../../parser/resolve-hero-image";

export const GALLERY_VIEW_TYPE = "recipe-box-gallery-view";

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
		this.state = { ...deps.getSettings().gallerySavedState };
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

	private render(): void {
		this.renderGeneration++;
		const generation = this.renderGeneration;

		const existing = this.contentEl.querySelector(".rb-gallery-content");
		// The search input is recreated on every render (the whole toolbar is
		// rebuilt), which would otherwise drop focus mid-typing as soon as the
		// debounced search fires -- capture it here and restore it below.
		const previousSearchEl = existing?.querySelector(".rb-gallery-search") ?? null;
		const previousSearch = previousSearchEl instanceof HTMLInputElement ? previousSearchEl : null;
		const restoreSearchFocus = !!previousSearch && this.contentEl.ownerDocument.activeElement === previousSearch;
		const selectionStart = previousSearch?.selectionStart ?? null;
		const selectionEnd = previousSearch?.selectionEnd ?? null;
		if (existing) existing.remove();

		const content = this.contentEl.createDiv({ cls: "rb-gallery-content" });
		const settings = this.deps.getSettings();
		const files = this.deps.getAllRecipeNotes();

		renderGalleryToolbar(
			content,
			this.app,
			files,
			this.state,
			settings.myAllergens.length > 0,
			this.filterPanelOpen,
			this.onStateChange,
			this.onToggleFilterPanel,
		);

		if (restoreSearchFocus) {
			const newSearch = content.querySelector(".rb-gallery-search");
			if (newSearch instanceof HTMLInputElement) {
				newSearch.focus();
				if (selectionStart !== null && selectionEnd !== null) newSearch.setSelectionRange(selectionStart, selectionEnd);
			}
		}

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
