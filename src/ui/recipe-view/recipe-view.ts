/**
 * The recipe view — an Obsidian TextFileView that renders a recipe note as a
 * structured cooking card with ingredients, instructions, metadata, and timers.
 */
import { EventRef, MarkdownRenderer, Menu, Platform, setIcon, TextFileView, TFile, WorkspaceLeaf } from "obsidian";
import { findOrOpenLeaf } from "../../utils/open-leaf";
import { GroceryItem, IngredientGroup } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { stripFrontmatter } from "../../parser/recipe-frontmatter-strip";
import { stripRedundantBodyContent } from "../../parser/recipe-body-clean";
import { splitBodyAroundIngredients } from "../../parser/recipe-ingredient-groups";
import { splitBodyAroundInstructions } from "../../parser/recipe-instruction-groups";
import { readRecipeMultiplier } from "../../parser/recipe-multiplier";
import { readRecipeMeta, matchingAllergens } from "../../parser/recipe-meta-read";
import { fmNum, fmStr } from "./frontmatter-read-helpers";
import { renderMetaBanner } from "./meta-banner";
import { renderStarRating } from "./rating";
import { renderBadgeRow, renderTagRow } from "./badges";
import { renderIngredientsSection } from "./ingredients-section";
import { renderInstructionsSection } from "./instructions-section";
import { clearAllTimers } from "../timer/timer-tray";
import { renderMobileLayout } from "./mobile-layout";
import { renderImageCard } from "./image-resolve";
import { splitTrailingSections, renderSectionSidebar } from "./section-sidebar";
import { renderMealPlanStatus } from "./meal-plan-status";
import { CookHistoryModal } from "../modals/cook-history-modal";

export const RECIPE_VIEW_TYPE = "recipe-box-recipe-view";

const SERVINGS_KEYS = ["servings", "serves", "serving", "yield", "portions"];

export class RecipeView extends TextFileView {
	private deps: RecipeViewDeps;
	private unsubscribe: (() => void) | null = null;
	private metaRef: EventRef | null = null;

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
		this.addAction("pencil", "Edit as Markdown", () => {
			if (this.file) this.deps.editAsMarkdown(this.file.path);
		});
		this.unsubscribe = this.deps.subscribeToChanges(() => void this.render());
	}

	async onClose(): Promise<void> {
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
						.onClick(() => new CookHistoryModal(this.app, file, settings, this.deps.editAsMarkdown).open())
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
							this.deps.openAddToMealPlanModal(file, (day, meal, contributions) => {
								void this.deps.addToMealPlan(file.path, day, meal, contributions);
							});
						}
					})
			);

			menu.addItem(item =>
				item.setTitle("Open as Markdown")
					.setIcon("pencil")
					.onClick(() => this.deps.editAsMarkdown(file.path))
			);

			menu.addSeparator();
		}
		super.onPaneMenu(menu, source);
	}

	private async render(): Promise<void> {
		clearAllTimers();
		this.contentEl.empty();
		if (!this.file) return;

		const settings = this.deps.getSettings();
		const cache = this.app.metadataCache.getFileCache(this.file);
		const fm: Record<string, unknown> = cache?.frontmatter ?? {};

		const multiplier = readRecipeMultiplier(cache);
		const servings = fmNum(fm, SERVINGS_KEYS);
		const inPlan = this.deps.getMealPlan().some(e => e.recipePath === this.file!.path);

		const rawBody = stripFrontmatter(this.data);
		const body = stripRedundantBodyContent(rawBody, {
			stripTitle: settings.stripBodyTitle,
			stripImage: settings.stripHeroImage,
			title: this.file.basename,
			imageValue: fmStr(fm, ["image"]) ?? undefined,
		});

		const { before, groups: ingredientGroups, after } = splitBodyAroundIngredients(body, settings.ingredientsHeading);
		const instructionSplit = splitBodyAroundInstructions(after, settings.instructionsHeading);

		const meta = readRecipeMeta(cache, settings.lastMadeProperty, settings.allergensProperty);
		const allergenMatches = matchingAllergens(meta.allergens, settings.myAllergens);

		const wrap = this.contentEl.createDiv({ cls: "rb-recipe-view" });

		// Title block
		const titleBlock = wrap.createDiv({ cls: "rb-title-block" });
		titleBlock.createEl("h1", { cls: "rb-recipe-title", text: this.file.basename });
		if (!Platform.isMobile) {
			renderTagRow(titleBlock, this.app, this.file, settings);
			renderStarRating(titleBlock, this.app, this.file, fm, settings.ratingProperty, true);
			renderBadgeRow(titleBlock, settings, fm);
		}

		if (allergenMatches.length > 0) {
			const warning = wrap.createDiv({ cls: "rb-allergen-warning" });
			const warnIcon = warning.createSpan();
			setIcon(warnIcon, "alert-triangle");
			warning.createSpan({ text: `Contains: ${allergenMatches.join(", ")}` });
		}

		const groceryItems = this.deps.getGroceryItems();

		if (Platform.isMobile) {
			await renderMobileLayout(
				wrap, this.app, this, this.file, fm, settings,
				multiplier, servings, inPlan, meta,
				ingredientGroups, instructionSplit.groups,
				before, instructionSplit.after,
				groceryItems, this.deps,
			);
		} else {
			await this.renderDesktop(
				wrap, fm, settings, multiplier, servings, inPlan,
				before, ingredientGroups, instructionSplit,
				groceryItems,
			);
		}
	}

	private async renderDesktop(
		wrap: HTMLElement,
		fm: Record<string, unknown>,
		settings: RecipeBoxSettings,
		multiplier: number,
		servings: number | null,
		inPlan: boolean,
		before: string,
		ingredientGroups: IngredientGroup[],
		instructionSplit: ReturnType<typeof splitBodyAroundInstructions>,
		groceryItems: GroceryItem[],
	): Promise<void> {
		const planEntries = this.deps.getMealPlan().filter(e => e.recipePath === this.file!.path);

		renderMetaBanner(
			wrap, this.app, this.file!, fm, settings,
			multiplier, servings, inPlan, planEntries, this.deps,
		);

		renderMealPlanStatus(wrap, this.app, this.file!, planEntries, this.deps);

		if (before.trim()) {
			await MarkdownRenderer.render(this.app, before, wrap, this.file!.path, this);
		}

		// Pre-split trailing sections so we know whether a sidebar is needed
		const trailingSections = splitTrailingSections(instructionSplit.after, settings.cookHistoryHeading);
		const hasSidebar = trailingSections.length > 0 || settings.cookHistoryEnabled;

		const imageValue = fmStr(fm, ["image"]);
		const hasIngredients = ingredientGroups.some(g => g.lines.length > 0);
		const hasImage = !!imageValue;
		const hasRightCol = hasImage || hasSidebar;

		let rightCol: HTMLElement | null = null;

		if (hasIngredients || hasRightCol) {
			const bodyRow = wrap.createDiv({ cls: "rb-body-row" });
			if (hasIngredients) {
				void renderIngredientsSection(
					bodyRow, this.app, this.file!, ingredientGroups,
					settings, groceryItems, multiplier,
					(key) => { void this.deps.removeGroceryByKey(key); },
					() => { this.deps.openAddToGroceryModal(this.file!); },
					this,
				);
			}
			if (hasRightCol) {
				rightCol = bodyRow.createDiv({ cls: "rb-right-col" });
				if (hasImage) {
					renderImageCard(rightCol, this.app, imageValue);
				}
			}
		}

		if (instructionSplit.before.trim()) {
			await MarkdownRenderer.render(this.app, instructionSplit.before, wrap, this.file!.path, this);
		}

		if (instructionSplit.groups.length > 0) {
			const timerOpts = settings.timersEnabled ? {
				autoStart: settings.timerAutoStart,
				compactByDefault: settings.timerCompactDisplay,
				incrementSeconds: settings.timerMinuteIncrement * 60,
				rangeDefault: settings.timerRangeDefault,
				recipeName: this.file!.basename,
				onNavigate: () => {
					void findOrOpenLeaf(this.app, RECIPE_VIEW_TYPE, this.file!.path);
				},
			} : undefined;
			await renderInstructionsSection(
				wrap, this.app, this, this.file!.path,
				instructionSplit.groups, settings, timerOpts,
			);
		}

		// Extra sections as collapsible cards; sidebar nav lives in the right column
		if (hasSidebar && rightCol) {
			const cardsContainer = wrap.createDiv({ cls: "rb-extra-sections" });
			renderSectionSidebar(
				rightCol, cardsContainer,
				trailingSections,
				this.app, this, this.file!,
				settings, this.deps.editAsMarkdown,
			);
		}
	}
}
