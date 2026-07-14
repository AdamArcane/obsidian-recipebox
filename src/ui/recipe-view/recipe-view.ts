/**
 * The recipe view — an Obsidian TextFileView that renders a recipe note as a
 * structured cooking card with ingredients, instructions, metadata, and timers.
 */
import { EventRef, Menu, Notice, setIcon, TextFileView, TFile, WorkspaceLeaf } from "obsidian";
import { RecipeViewDeps } from "./recipe-view-deps";
import { stripFrontmatter } from "../../parser/recipe-frontmatter-strip";
import { findFirstImageInBody, stripRedundantBodyContent } from "../../parser/recipe-body-clean";
import { splitBodyAroundIngredients } from "../../parser/recipe-ingredient-groups";
import { splitBodyAroundInstructions } from "../../parser/recipe-instruction-groups";
import { readRecipeMultiplier } from "../../parser/recipe-multiplier";
import { readRecipeMeta, matchingAllergens } from "../../parser/recipe-meta-read";
import { fmNum } from "./frontmatter-read-helpers";
import { renderStarRating } from "./rating";
import { renderBadgeRow, renderTagRow } from "./badges";
import { clearAllTimers } from "../timer/timer-tray";
import { splitTrailingSections } from "./section-extra-content";
import { CookHistoryModal } from "../modals/cook-history-modal";
import { RecipeExportModal } from "../modals/recipe-export-modal";
import { ShareRecipeModal } from "../modals/share-recipe-modal";
import { getRecipeLayoutRenderer, resolveRecipeLayoutId } from "./layouts/registry";
import { RecipeLayoutContext } from "./layouts/types";
import { findValue } from "../../parser/frontmatter-lookup";
import { getRecipeMetaAliases } from "../../parser/recipe-meta-aliases";
import { makeLightboxable } from "../components/lightbox";

export const RECIPE_VIEW_TYPE = "recipe-box-recipe-view";

function frontmatterString(frontmatter: Record<string, unknown>, candidateKeys: string[]): string | null {
	const raw = findValue(frontmatter, candidateKeys);
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export class RecipeView extends TextFileView {
	private deps: RecipeViewDeps;
	private unsubscribe: (() => void) | null = null;
	private metaRef: EventRef | null = null;

	// Cook mode / wake lock — view-local state, intentionally not persisted
	private wakeLock: WakeLockSentinel | null = null;
	private cookModeActive = false;
	private cookModeActionEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, deps: RecipeViewDeps) {
		super(leaf);
		this.deps = deps;
		this.navigation = true;
	}

	getViewType(): string { return RECIPE_VIEW_TYPE; }
	getDisplayText(): string { return this.file?.basename ?? "Recipe"; }
	getViewData(): string { return this.data; }

	setViewData(data: string, _clear: boolean): void {
		this.data = data;
		void this.render();
	}

	clear(): void {
		this.data = "";
		this.contentEl.empty();
	}

	async onOpen(): Promise<void> {
		// Cook mode sits left of the pencil so it's easy to reach while cooking.
		// sun-dim = off (screen may sleep), sun = on (screen stays awake).
		this.cookModeActionEl = this.addAction("sun-dim", "Cook mode: off", () => {
			void this.toggleCookMode();
		});

		this.addAction("pencil", "Edit as Markdown", () => {
			if (this.file) this.deps.editAsMarkdown(this.file.path);
		});

		this.addAction("share-2", "Share recipe", () => {
			if (this.file) {
				new ShareRecipeModal(this.app, this.file, this.deps.getSettings(), this.deps.saveSettings).open();
			}
		});

		// Re-request the wake lock if the user returns to the app while cook mode is still on.
		// The OS releases the sentinel whenever the page is hidden, so we need to re-acquire it.
		this.registerDomEvent(activeDocument, "visibilitychange", () => {
			if (activeDocument.visibilityState === "visible" && this.cookModeActive && !this.wakeLock) {
				void this.requestWakeLock();
			}
		});

		this.unsubscribe = this.deps.subscribeToChanges(() => void this.render());
	}

	async onClose(): Promise<void> {
		this.releaseWakeLock();
		this.cookModeActive = false;
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	async onLoadFile(file: TFile): Promise<void> {
		await super.onLoadFile(file);
		this.metaRef = this.app.metadataCache.on("changed", (changedFile: TFile) => {
			if (changedFile === this.file) void this.render();
		});
	}

	async onUnloadFile(file: TFile): Promise<void> {
		if (this.metaRef) {
			this.app.metadataCache.offref(this.metaRef);
			this.metaRef = null;
		}
		await super.onUnloadFile(file);
	}

	refresh(): void { void this.render(); }

	onPaneMenu(menu: Menu, source: string): void {
		if (source === "more-options" && this.file) {
			const file = this.file;
			const settings = this.deps.getSettings();

			if (settings.cookHistoryEnabled) {
				menu.addItem(item =>
					item.setTitle("Cook history")
						.setIcon("clock")
						.onClick(() => new CookHistoryModal(this.app, file, settings).open())
				);
			}

			const planEntries = this.deps.getMealPlan().filter(e => e.recipePath === file.path);
			const inPlan = planEntries.length > 0;
			menu.addItem(item =>
				item.setTitle(inPlan ? "Remove from meal plan" : "Add to meal plan")
					.setIcon(inPlan ? "calendar-x-2" : "calendar-plus")
					.onClick(() => {
						if (inPlan) {
							for (const entry of planEntries) void this.deps.removeFromMealPlanById(entry.id);
						} else {
							this.deps.openAddToMealPlanModal(file, (day, meal, contributions, isLeftovers) => {
								void this.deps.addToMealPlan(file.path, day, meal, contributions, isLeftovers);
							});
						}
					})
			);

			menu.addItem(item =>
				item.setTitle("Open as Markdown")
					.setIcon("pencil")
					.onClick(() => this.deps.editAsMarkdown(file.path))
			);

			menu.addItem(item =>
				item.setTitle("Export recipe")
					.setIcon("download")
					.onClick(() => new RecipeExportModal(this.app, file, settings).open())
			);

			menu.addItem(item =>
				item.setTitle("Share recipe")
					.setIcon("share-2")
					.onClick(() => new ShareRecipeModal(this.app, file, settings, this.deps.saveSettings).open())
			);

			menu.addSeparator();
		}
		super.onPaneMenu(menu, source);
	}

	private async toggleCookMode(): Promise<void> {
		this.cookModeActive = !this.cookModeActive;
		if (this.cookModeActive) {
			await this.requestWakeLock();
			new Notice("Cook mode on · screen will stay awake");
		} else {
			this.releaseWakeLock();
			new Notice("Cook mode off");
		}
		this.updateCookModeButton();
	}

	private async requestWakeLock(): Promise<void> {
		if (!("wakeLock" in navigator)) {
			new Notice("Screen wake lock is not supported on this device.");
			return;
		}
		try {
			this.wakeLock = await navigator.wakeLock.request("screen");
			this.wakeLock.addEventListener("release", () => {
				// OS released the lock (app backgrounded etc.) — update button but keep
				// cookModeActive so we can re-acquire on visibility return.
				this.updateCookModeButton();
			});
		} catch {
			new Notice("Could not activate screen wake lock.");
			this.cookModeActive = false;
		}
	}

	private releaseWakeLock(): void {
		void this.wakeLock?.release();
		this.wakeLock = null;
	}

	private updateCookModeButton(): void {
		if (!this.cookModeActionEl) return;
		setIcon(this.cookModeActionEl, this.cookModeActive ? "sun" : "sun-dim");
		this.cookModeActionEl.setAttribute("aria-label", this.cookModeActive ? "Cook mode: on" : "Cook mode: off");
		this.cookModeActionEl.toggleClass("rb-cook-mode-active", this.cookModeActive);
	}

	private async render(): Promise<void> {
		clearAllTimers();
		this.contentEl.empty();
		if (!this.file) return;

		const context = this.buildLayoutContext();
		if (!context) return;

		const layoutId = resolveRecipeLayoutId(context.settings);
		const allergenMatches = matchingAllergens(context.meta.allergens, context.settings.myAllergens);

		const wrap = this.contentEl.createDiv({ cls: "rb-recipe-view" });
		wrap.addClass(`rb-layout-${layoutId}`);

		// Title block
		const titleBlock = wrap.createDiv({ cls: "rb-title-block" });
		titleBlock.createEl("h1", { cls: "rb-recipe-title", text: context.file.basename });
		if (layoutId !== "mobile-tabs") {
			renderTagRow(titleBlock, this.app, context.file, context.settings);
			renderStarRating(titleBlock, this.app, context.file, context.frontmatter, context.settings.ratingProperty, true);
			renderBadgeRow(titleBlock, context.settings, context.frontmatter);
		}

		if (allergenMatches.length > 0) {
			const warning = wrap.createDiv({ cls: "rb-allergen-warning" });
			const warnIcon = warning.createSpan();
			setIcon(warnIcon, "alert-triangle");
			warning.createSpan({ text: `Contains: ${allergenMatches.join(", ")}` });
		}

		const renderLayout = getRecipeLayoutRenderer(layoutId);
		await renderLayout({
			container: wrap,
			app: this.app,
			component: this,
			deps: this.deps,
			context,
		});

		this.attachLightboxToInlineImages(wrap);
	}

	private attachLightboxToInlineImages(wrap: HTMLElement): void {
		// Hero images are already wired in image-resolve; this handles markdown
		// body images so they can stay thumbnail-sized but still open full-screen.
		const images = wrap.querySelectorAll<HTMLImageElement>("img:not(.rb-recipe-image):not(.rb-lightbox-img)");
		images.forEach((img) => {
			if (img.hasClass("rb-lightbox-trigger")) return;
			makeLightboxable(img);
		});
	}

	private buildLayoutContext(): RecipeLayoutContext | null {
		if (!this.file) return null;
		const file = this.file;

		const settings = this.deps.getSettings();
		const aliases = getRecipeMetaAliases(settings);
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter: Record<string, unknown> = cache?.frontmatter ?? {};
		const mealPlanEntries = this.deps.getMealPlan().filter(entry => entry.recipePath === file.path);

		// TextFileView data can briefly be null/undefined during leaf/view transitions.
		// Normalize to an empty string so parser helpers that call startsWith do not crash.
		const rawData = typeof this.data === "string" ? this.data : "";
		const rawBody = stripFrontmatter(rawData);
		const imageKeys = aliases.image;
		const frontmatterImage = frontmatterString(frontmatter, imageKeys);
		const fallbackBodyImage = settings.useFirstBodyImageWhenFrontmatterEmpty
			? findFirstImageInBody(rawBody)
			: null;
		const resolvedImage = frontmatterImage ?? fallbackBodyImage;
		const body = stripRedundantBodyContent(rawBody, {
			cleanNoteBody: settings.cleanNoteBody,
			title: file.basename,
			imageValue: resolvedImage ?? undefined,
		});

		const { before, groups: ingredientGroups, after } = splitBodyAroundIngredients(body, settings.ingredientsHeading);
		const instructionSplit = splitBodyAroundInstructions(after, settings.instructionsHeading);
		const trailingSections = splitTrailingSections(instructionSplit.after, settings.cookHistoryHeading);

		return {
			file,
			settings,
			frontmatter,
			multiplier: readRecipeMultiplier(cache),
			servings: fmNum(frontmatter, aliases.servings),
			inMealPlan: mealPlanEntries.length > 0,
			mealPlanEntries,
			meta: readRecipeMeta(cache, settings),
			groceryItems: this.deps.getGroceryItems(),
			beforeContent: before,
			beforeInstructionsContent: instructionSplit.before,
			afterContent: instructionSplit.after,
			ingredientGroups,
			instructionGroups: instructionSplit.groups,
			imageValue: resolvedImage,
			trailingSections,
			hasExtraSections: trailingSections.length > 0 || settings.cookHistoryEnabled,
		};
	}
}
