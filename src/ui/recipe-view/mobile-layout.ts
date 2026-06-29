/**
 * Renders the mobile recipe layout — a tab-based (Ingredients / Steps / Info)
 * single-column view with native card, stat row, and scale picker.
 *
 * The desktop layout is handled by meta-banner.ts, ingredients-section.ts,
 * instructions-section.ts, and section-sidebar.ts instead.
 */
import { App, Component, getAllTags, MarkdownRenderer, Modal, setIcon, TFile } from "obsidian";
import { CustomBadge, IngredientGroup, InstructionGroup } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { GroceryItem } from "../../types";
import { RecipeMeta, formatMinutes } from "../../parser/recipe-meta-read";
import { RecipeViewDeps } from "./recipe-view-deps";
import { renderImageCard } from "./image-resolve";
import { renderFavoriteToggle } from "./favorite-toggle";
import { renderMealPlanToggle } from "./meal-plan-toggle";
import { renderMarkCookedButton } from "./mark-cooked-button";
import { renderMealPlanStatus } from "./meal-plan-status";
import { renderStarRating } from "./rating";
import { renderBadgeRow } from "./badges";
import { renderIngredientsSection } from "./ingredients-section";
import { renderInstructionsSection } from "./instructions-section";
import { fmStr } from "./frontmatter-read-helpers";
import { NUTRITION_FIELDS, resolveNutritionDisplay } from "./nutrition-fields";
import { RECIPE_FRONTMATTER } from "../../settings/frontmatter-keys";
import { ALIASES } from "../../parser/recipe-meta-aliases";
import { CookHistoryModal } from "../modals/cook-history-modal";

// ── Utilities ─────────────────────────────────────────────────────────────────

function activateTab(panels: HTMLElement[], tabs: HTMLElement[], tabBar: HTMLElement, index: number): void {
	panels.forEach((p, i) => p.toggle(i === index));
	tabs.forEach((t, i) => t.toggleClass("rb-tab-active", i === index));
	tabBar.style.setProperty("--rb-tab-index", String(index));
}

function extractPlainText(markdown: string): string {
	return markdown
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/#{1,6}\s+/g, "")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/\*(.+?)\*/g, "$1")
		.replace(/`(.+?)`/g, "$1")
		.replace(/\n{2,}/g, " ")
		.replace(/\n/g, " ")
		.trim();
}


const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDateValue(raw: string): string {
	if (DATE_RE.test(raw.trim())) {
		const d = new Date(raw.trim() + "T00:00:00");
		if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { dateStyle: "medium" });
	}
	return raw;
}

// ── Mobile-static badge detection ────────────────────────────────────────────

function isMobilePrepBadge(badge: CustomBadge): boolean {
	if (!badge.property) return false;
	return ALIASES.prepTime.some(a => a.toLowerCase() === badge.property.toLowerCase());
}

function isMobileCookBadge(badge: CustomBadge): boolean {
	if (!badge.property) return false;
	return ALIASES.cookTime.some(a => a.toLowerCase() === badge.property.toLowerCase());
}

function isMobileTotalBadge(badge: CustomBadge): boolean {
	if (badge.property && ALIASES.totalTime.some(a => a.toLowerCase() === badge.property.toLowerCase())) return true;
	if (badge.formula) {
		const f = badge.formula.toLowerCase();
		const hasPrepRef = ALIASES.prepTime.some(a => f.includes(a.toLowerCase()));
		const hasCookRef = ALIASES.cookTime.some(a => f.includes(a.toLowerCase()));
		return hasPrepRef && hasCookRef;
	}
	return false;
}

function isMobileStaticBadge(badge: CustomBadge): boolean {
	return isMobilePrepBadge(badge) || isMobileCookBadge(badge) || isMobileTotalBadge(badge);
}

// ── Header sections ───────────────────────────────────────────────────────────

function renderMobileTagRow(
	container: HTMLElement,
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
): void {
	if (!settings.showTagsInHeader) return;
	const cache = app.metadataCache.getFileCache(file) ?? {};
	const allTags = getAllTags(cache) ?? [];
	if (allTags.length === 0) return;

	const row = container.createDiv({ cls: "rb-mobile-tag-row" });
	for (const tag of allTags) {
		// getAllTags always returns tags with # prefix
		const base = tag.startsWith("#") ? tag.slice(1) : tag;
		const segment = settings.showFullTagPath ? base : (base.split("/").pop() ?? base);
		const display = settings.prefixTagsWithHash ? `#${segment}` : segment;
		row.createSpan({ cls: "rb-mobile-tag", text: display });
	}
}

function renderNativeCard(
	container: HTMLElement,
	app: App,
	file: TFile,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	meta: RecipeMeta,
): void {
	const imageValue = fmStr(fm, ["image"]);

	const card = container.createDiv({ cls: "rb-mobile-native-card" });
	if (imageValue) renderImageCard(card, app, imageValue);

	const metaCol = card.createDiv({ cls: "rb-mobile-native-meta" });

	const ratingGroup = metaCol.createDiv({ cls: "rb-mobile-native-group" });
	ratingGroup.createDiv({ cls: "rb-mobile-native-label", text: "Rating" });
	renderStarRating(ratingGroup, app, file, fm, settings.ratingProperty, false);

	if (settings.trackLastMade) {
		const lastGroup = metaCol.createDiv({ cls: "rb-mobile-native-group" });
		lastGroup.createDiv({ cls: "rb-mobile-native-label", text: "Last prepared" });
		const dateText = meta.lastMade ? formatDateValue(meta.lastMade) : "–";
		lastGroup.createDiv({ cls: "rb-mobile-native-value", text: dateText });
	}
}

function renderMobileStatRow(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	meta: RecipeMeta,
): void {
	const enabled = settings.headerBadges.filter(b => b.enabled);

	const cells: { label: string; value: string }[] = [];
	if (enabled.some(isMobilePrepBadge) && meta.times.prep !== null)
		cells.push({ label: "Prep time", value: formatMinutes(meta.times.prep) });
	if (enabled.some(isMobileCookBadge) && meta.times.cook !== null)
		cells.push({ label: "Cook time", value: formatMinutes(meta.times.cook) });
	if (enabled.some(isMobileTotalBadge) && meta.times.total !== null)
		cells.push({ label: "Total", value: formatMinutes(meta.times.total) });

	if (cells.length === 0) return;

	const row = container.createDiv({ cls: "rb-mobile-stat-row" });
	for (const { label, value } of cells) {
		const cell = row.createDiv({ cls: "rb-mobile-stat-cell" });
		cell.createDiv({ cls: "rb-mobile-stat-label", text: label });
		cell.createDiv({ cls: "rb-mobile-stat-value", text: value });
	}
}

class ScalePickerModal extends Modal {
	private current: number;
	private onSelect: (v: number) => Promise<void>;

	constructor(app: App, current: number, onSelect: (v: number) => Promise<void>) {
		super(app);
		this.current = current;
		this.onSelect = onSelect;
	}

	onOpen(): void {
		this.titleEl.setText("Scale recipe");
		const { contentEl } = this;
		const grid = contentEl.createDiv({ cls: "rb-scale-grid" });
		for (const p of [0.5, 1, 1.5, 2, 3, 4]) {
			const label = p === 1 ? "1× (original)" : `${p}×`;
			const btn = grid.createEl("button", { text: label, cls: "rb-scale-preset" });
			if (p === this.current) btn.addClass("rb-scale-preset-active");
			btn.addEventListener("click", () => { void this.onSelect(p); this.close(); });
		}
		const customRow = contentEl.createDiv({ cls: "rb-scale-custom-row" });
		customRow.createSpan({ cls: "rb-scale-custom-label", text: "Custom" });
		const input = customRow.createEl("input", { type: "text", cls: "rb-scale-custom-input" });
		input.inputMode = "decimal";
		input.value = String(this.current);
		input.placeholder = "e.g. 2.5";
		const applyBtn = customRow.createEl("button", { text: "Apply", cls: "rb-scale-apply-btn" });
		const apply = (): void => {
			const v = parseFloat(input.value);
			if (v > 0) { void this.onSelect(Math.round(v * 2) / 2); this.close(); }
		};
		applyBtn.addEventListener("click", apply);
		input.addEventListener("keydown", (e) => { if (e.key === "Enter") apply(); });
	}

	onClose(): void { this.contentEl.empty(); }
}

function renderScaleActionsRow(
	container: HTMLElement,
	app: App,
	file: TFile,
	fm: Record<string, unknown>,
	multiplier: number,
	servings: number | null,
	inPlan: boolean,
	settings: RecipeBoxSettings,
	deps: RecipeViewDeps,
): void {
	const row = container.createDiv({ cls: "rb-mobile-scale-actions" });

	let current = multiplier;
	const scaleCol = row.createDiv({ cls: "rb-mobile-scale-col" });

	// Scale cell
	const scaleCell = scaleCol.createDiv({ cls: "rb-mobile-scale-cell" });
	scaleCell.createDiv({ cls: "rb-mobile-scale-label", text: "Scale" });
	const scaleValue = scaleCell.createDiv({ cls: "rb-mobile-scale-value", text: `${current}×` });

	// Servings cell (only if the recipe has a servings value)
	if (servings !== null) {
		scaleCol.createDiv({ cls: "rb-mobile-scale-divider" });
		const servingsCell = scaleCol.createDiv({ cls: "rb-mobile-scale-cell" });
		servingsCell.createDiv({ cls: "rb-mobile-scale-label", text: "Serves" });
		const servingsValue = servingsCell.createDiv({ cls: "rb-mobile-scale-value" });
		const updateServings = (mult: number): void => {
			const scaled = Math.round(servings * mult * 10) / 10;
			servingsValue.textContent = String(scaled % 1 === 0 ? Math.round(scaled) : scaled);
		};
		updateServings(current);

		scaleCol.addEventListener("click", () => {
			new ScalePickerModal(app, current, async (value) => {
				current = value;
				scaleValue.textContent = `${value}×`;
				updateServings(value);
				await app.fileManager.processFrontMatter(file, (fm) => {
					const f = fm as Record<string, unknown>;
					if (value === 1) delete f[RECIPE_FRONTMATTER.multiplier];
					else f[RECIPE_FRONTMATTER.multiplier] = value;
				});
			}).open();
		});
	} else {
		scaleCol.addEventListener("click", () => {
			new ScalePickerModal(app, current, async (value) => {
				current = value;
				scaleValue.textContent = `${value}×`;
				await app.fileManager.processFrontMatter(file, (fm) => {
					const f = fm as Record<string, unknown>;
					if (value === 1) delete f[RECIPE_FRONTMATTER.multiplier];
					else f[RECIPE_FRONTMATTER.multiplier] = value;
				});
			}).open();
		});
	}

	const actions = row.createDiv({ cls: "rb-mobile-actions" });
	renderFavoriteToggle(actions, app, file, fm);
	renderMarkCookedButton(actions, app, file, settings, deps);
	const planEntries = deps.getMealPlan().filter(e => e.recipePath === file.path);
	renderMealPlanToggle(actions, app, file, inPlan, planEntries, deps);
}

function renderMobileNutritionStrip(
	container: HTMLElement,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	servings: number | null,
	multiplier: number,
): void {
	const hasAny = NUTRITION_FIELDS.some(f => {
		const key = settings[f.settingsKey] as string;
		return fm[key] !== undefined || f.aliases.some(a => fm[a] !== undefined);
	});
	if (!hasAny) return;

	const strip = container.createDiv({ cls: "rb-mobile-nutrition-strip" });
	for (const field of NUTRITION_FIELDS) {
		const cell = strip.createDiv({ cls: "rb-mobile-nutrition-cell" });
		const value = resolveNutritionDisplay(fm, field, settings, servings, multiplier);
		cell.createSpan({ cls: "rb-mobile-nutrition-value", text: value });
		cell.createSpan({ cls: "rb-mobile-nutrition-label", text: field.label });
	}
}

// ── Info tab: cook history preview ───────────────────────────────────────────

function renderMobileCookHistoryRow(
	container: HTMLElement,
	app: App,
	file: TFile,
	meta: RecipeMeta,
	settings: RecipeBoxSettings,
): void {
	if (!settings.cookHistoryEnabled) return;

	const row = container.createDiv({ cls: "rb-ch-preview-row" });
	const iconEl = row.createSpan({ cls: "rb-ch-preview-icon" });
	setIcon(iconEl, "clock");

	const textEl = row.createSpan({ cls: "rb-ch-preview-text" });
	if (meta.cookedCount === 0) {
		textEl.textContent = "No cook history yet";
		row.addClass("rb-ch-preview-empty");
	} else {
		const countText = meta.cookedCount === 1 ? "Cooked once" : `Cooked ${meta.cookedCount} times`;
		const dateText = meta.lastMade ? ` · ${formatDateValue(meta.lastMade)}` : "";
		textEl.textContent = countText + dateText;
		const chevronEl = row.createSpan({ cls: "rb-ch-preview-chevron" });
		setIcon(chevronEl, "chevron-right");
	}

	row.addEventListener("click", () => {
		new CookHistoryModal(app, file, settings, (path) => {
			const leaf = app.workspace.getLeaf(false);
			if (leaf) void leaf.setViewState({ type: "markdown", state: { file: path }, active: true });
		}).open();
	});
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function renderMobileLayout(
	container: HTMLElement,
	app: App,
	component: Component,
	file: TFile,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	multiplier: number,
	servings: number | null,
	inPlan: boolean,
	meta: RecipeMeta,
	ingredientGroups: IngredientGroup[],
	instructionGroups: InstructionGroup[],
	beforeContent: string,
	afterContent: string,
	groceryItems: GroceryItem[],
	deps: RecipeViewDeps,
): Promise<void> {
	let _panels: HTMLElement[] = [];
	let _tabs: HTMLElement[] = [];
	let _tabBar: HTMLElement = container; // forward-declared; replaced when tabs are built

	// Description snippet
	const descriptionText = extractPlainText(beforeContent);
	if (descriptionText) {
		const descWrap = container.createDiv({ cls: "rb-mobile-desc" });
		descWrap.createSpan({ cls: "rb-mobile-desc-text", text: descriptionText });
		const moreLink = descWrap.createEl("a", { cls: "rb-mobile-desc-more", text: "More" });
		moreLink.addEventListener("click", () => {
			activateTab(_panels, _tabs, _tabBar, 2);
			_panels[2]?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
		window.requestAnimationFrame(() => {
			if (descWrap.scrollHeight <= descWrap.clientHeight + 2) moreLink.hide();
		});
	}

	// Native card: image + rating + last-made
	renderNativeCard(container, app, file, fm, settings, meta);

	// Tags row
	renderMobileTagRow(container, app, file, settings);

	// Fixed stat row (Prep / Cook / Total)
	renderMobileStatRow(container, settings, meta);

	// Remaining configurable badges (skip static time ones and lastMade, which appears in the native card)
	const skipOnMobile = (badge: CustomBadge): boolean => {
		if (isMobileStaticBadge(badge)) return true;
		if (badge.property && badge.property.toLowerCase() === settings.lastMadeProperty.toLowerCase()) return true;
		return false;
	};
	renderBadgeRow(container, settings, fm, skipOnMobile);

	// Scale tap column + action row
	renderScaleActionsRow(container, app, file, fm, multiplier, servings, inPlan, settings, deps);

	// Meal plan status notice
	const planEntries = deps.getMealPlan().filter(e => e.recipePath === file.path);
	renderMealPlanStatus(container, app, file, planEntries, deps);

	// Tabs
	const tabBar = container.createDiv({ cls: "rb-tab-bar" });
	_tabBar = tabBar;
	const tabIngr = tabBar.createEl("button", { cls: "rb-tab-btn", text: "Ingredients" });
	const tabSteps = tabBar.createEl("button", { cls: "rb-tab-btn", text: "Steps" });
	const tabInfo = tabBar.createEl("button", { cls: "rb-tab-btn", text: "Info" });

	const panelIngr = container.createDiv({ cls: "rb-tab-panel" });
	const panelSteps = container.createDiv({ cls: "rb-tab-panel" });
	const panelInfo = container.createDiv({ cls: "rb-tab-panel" });
	_panels = [panelIngr, panelSteps, panelInfo];
	_tabs = [tabIngr, tabSteps, tabInfo];

	// Ingredients tab
	await renderIngredientsSection(
		panelIngr, app, file, ingredientGroups, settings, groceryItems, multiplier,
		(key) => { void deps.removeGroceryByKey(key); },
		() => { deps.openAddToGroceryModal(file); },
		component,
	);

	// Steps tab
	await renderInstructionsSection(panelSteps, app, component, file.path, instructionGroups, settings);

	// Info tab — cook history preview + nutrition + source URL + notes content
	renderMobileCookHistoryRow(panelInfo, app, file, meta, settings);
	renderMobileNutritionStrip(panelInfo, fm, settings, servings, multiplier);

	const sourceUrl = fmStr(fm, ["source", "url", "sourceUrl", "source_url"]);
	if (sourceUrl) {
		const urlRow = panelInfo.createDiv({ cls: "rb-info-url" });
		if (/^https?:\/\//.test(sourceUrl)) {
			urlRow.createEl("a", { href: sourceUrl, text: sourceUrl, attr: { target: "_blank", rel: "noopener" } });
		} else {
			urlRow.createSpan({ text: sourceUrl });
		}
	}

	if (beforeContent.trim()) {
		await MarkdownRenderer.render(app, beforeContent, panelInfo, file.path, component);
	}
	if (afterContent.trim()) {
		await MarkdownRenderer.render(app, afterContent, panelInfo, file.path, component);
	}

	[tabIngr, tabSteps, tabInfo].forEach((tab, i) => {
		tab.addEventListener("click", () => activateTab(_panels, _tabs, tabBar, i));
	});
	activateTab(_panels, _tabs, tabBar, 0);
}
