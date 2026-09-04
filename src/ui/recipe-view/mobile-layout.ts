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
import { findOrOpenLeaf } from "../../utils/open-leaf";
import { RECIPE_VIEW_TYPE } from "./recipe-view";
import { fmStr } from "./frontmatter-read-helpers";
import { describeSourceLink } from "./source-link-display";
import { NUTRITION_FIELDS, resolveNutritionDisplay } from "./nutrition-fields";
import { NutritionEditModal } from "../modals/modal-nutrition-edit";
import { RECIPE_FRONTMATTER } from "../../settings/frontmatter-keys";
import { getRecipeMetaAliases } from "../../parser/recipe-meta-aliases";
import { renderCookHistoryList } from "../../recipe-history/cook-history-render";
import { ShareStatus } from "../../sharing/share-status";
import { ShareRecipeModal } from "../modals/share-recipe-modal";

// ── Utilities ─────────────────────────────────────────────────────────────────

function activateTab(panels: HTMLElement[], tabs: HTMLElement[], tabBar: HTMLElement, index: number): void {
	// Use class-based visibility (not display:none) so all panels stay in the
	// layout and the grid wrapper holds the height of the tallest panel.
	panels.forEach((p, i) => p.toggleClass("rb-tab-panel--active", i === index));
	tabs.forEach((t, i) => t.toggleClass("rb-tab-active", i === index));
	// Measure the actual tab position so the underline works even when tabs have
	// mixed widths (text tabs flex:1, icon tab flex:0).
	const activeTab = tabs[index];
	if (activeTab) {
		tabBar.style.setProperty("--rb-tab-indicator-left", `${activeTab.offsetLeft}px`);
		tabBar.style.setProperty("--rb-tab-indicator-width", `${activeTab.offsetWidth}px`);
	}
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

function isMobilePrepBadge(badge: CustomBadge, settings: RecipeBoxSettings): boolean {
	if (!badge.property) return false;
	return getRecipeMetaAliases(settings).prepTime.some(a => a.toLowerCase() === badge.property.toLowerCase());
}

function isMobileCookBadge(badge: CustomBadge, settings: RecipeBoxSettings): boolean {
	if (!badge.property) return false;
	return getRecipeMetaAliases(settings).cookTime.some(a => a.toLowerCase() === badge.property.toLowerCase());
}

function isMobileTotalBadge(badge: CustomBadge, settings: RecipeBoxSettings): boolean {
	const aliases = getRecipeMetaAliases(settings);
	if (badge.property && aliases.totalTime.some(a => a.toLowerCase() === badge.property.toLowerCase())) return true;
	if (badge.formula) {
		const f = badge.formula.toLowerCase();
		const hasPrepRef = aliases.prepTime.some(a => f.includes(a.toLowerCase()));
		const hasCookRef = aliases.cookTime.some(a => f.includes(a.toLowerCase()));
		return hasPrepRef && hasCookRef;
	}
	return false;
}

function isMobileStaticBadge(badge: CustomBadge, settings: RecipeBoxSettings): boolean {
	return isMobilePrepBadge(badge, settings) || isMobileCookBadge(badge, settings) || isMobileTotalBadge(badge, settings);
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
	imageValue: string | null,
	settings: RecipeBoxSettings,
	meta: RecipeMeta,
	shareStatus: ShareStatus,
	saveSettings: () => Promise<void>,
): void {
	const card = container.createDiv({ cls: "rb-mobile-native-card" });
	if (imageValue) renderImageCard(card, app, imageValue);

	const metaCol = card.createDiv({ cls: "rb-mobile-native-meta" });

	const ratingGroup = metaCol.createDiv({ cls: "rb-mobile-native-group" });
	ratingGroup.createDiv({ cls: "rb-label-caps", text: "Rating" });
	renderStarRating(ratingGroup, app, file, fm, settings.ratingProperty, { hoverPreview: false });

	if (settings.cookHistoryEnabled) {
		const lastGroup = metaCol.createDiv({ cls: "rb-mobile-native-group" });
		lastGroup.createDiv({ cls: "rb-label-caps", text: "Last prepared" });
		const dateText = meta.lastMade ? formatDateValue(meta.lastMade) : "–";
		lastGroup.createDiv({ cls: "rb-mobile-native-value", text: dateText });
	}

	// Hidden entirely when not shared, matching "Last prepared" above -- this
	// box only ever shows fields with real values, never an empty/dash state.
	if (shareStatus.kind === "shared") {
		const shareGroup = metaCol.createDiv({ cls: "rb-mobile-native-group" });
		shareGroup.createDiv({ cls: "rb-label-caps", text: "Shared" });
		const days = shareStatus.daysLeft;
		const value = shareGroup.createDiv({
			cls: "rb-mobile-native-value rb-mobile-native-value--tappable",
			text: `${days} day${days === 1 ? "" : "s"} left`,
		});
		value.addEventListener("click", () => {
			new ShareRecipeModal(app, file, settings, saveSettings).open();
		});
	}
}

function renderMobileStatRow(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	meta: RecipeMeta,
): void {
	const enabled = settings.headerBadges.filter(b => b.enabled);

	const cells: { label: string; value: string }[] = [];
	if (enabled.some((badge) => isMobilePrepBadge(badge, settings)) && meta.times.prep !== null)
		cells.push({ label: "Prep time", value: formatMinutes(meta.times.prep) });
	if (enabled.some((badge) => isMobileCookBadge(badge, settings)) && meta.times.cook !== null)
		cells.push({ label: "Cook time", value: formatMinutes(meta.times.cook) });
	if (enabled.some((badge) => isMobileTotalBadge(badge, settings)) && meta.times.total !== null)
		cells.push({ label: "Total", value: formatMinutes(meta.times.total) });

	if (cells.length === 0) return;

	const row = container.createDiv({ cls: "rb-mobile-stat-row" });
	for (const { label, value } of cells) {
		const cell = row.createDiv({ cls: "rb-mobile-stat-cell" });
		cell.createDiv({ cls: "rb-label-caps rb-mobile-stat-label", text: label });
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
	scaleCell.createDiv({ cls: "rb-label-caps", text: "Scale" });
	const scaleValue = scaleCell.createDiv({ cls: "rb-mobile-scale-value", text: `${current}×` });

	// Servings cell (only if the recipe has a servings value)
	if (servings !== null) {
		scaleCol.createDiv({ cls: "rb-mobile-scale-divider" });
		const servingsCell = scaleCol.createDiv({ cls: "rb-mobile-scale-cell" });
		servingsCell.createDiv({ cls: "rb-label-caps", text: "Serves" });
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
	renderFavoriteToggle(actions, app, file, fm, settings);
	renderMarkCookedButton(actions, app, file, settings, deps);
	const planEntries = deps.getMealPlan().filter(e => e.recipePath === file.path);
	renderMealPlanToggle(actions, app, file, inPlan, planEntries, deps);
}

// Always renders, even with no nutrition data set, so tapping the strip is
// the "add" path on mobile too (mirrors the desktop banner cell, which
// always shows -- with -- placeholders rather than disappearing when empty).
function renderMobileNutritionStrip(
	container: HTMLElement,
	app: App,
	file: TFile,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	servings: number | null,
	multiplier: number,
): void {
	const strip = container.createDiv({
		cls: "rb-mobile-nutrition-strip rb-mobile-nutrition-strip--editable",
		attr: { role: "button", tabindex: "0", "aria-label": "Edit nutrition" },
	});
	for (const field of NUTRITION_FIELDS) {
		const cell = strip.createDiv({ cls: "rb-mobile-nutrition-cell" });
		const value = resolveNutritionDisplay(fm, field, settings, servings, multiplier);
		cell.createSpan({ cls: "rb-mobile-nutrition-value", text: value });
		cell.createSpan({ cls: "rb-label-caps", text: field.label });
	}
	const editCell = strip.createDiv({ cls: "rb-mobile-nutrition-edit-cell" });
	setIcon(editCell, "pencil");

	const openModal = (): void => new NutritionEditModal(app, file, fm, settings).open();
	strip.addEventListener("click", openModal);
	strip.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openModal();
		}
	});
}

// ── Swipe gesture ─────────────────────────────────────────────────────────────

/**
 * Attaches horizontal swipe detection to `container` so the user can swipe
 * left/right to change tabs. Vertical scrolling within panels is not affected:
 * we only lock and prevent default once the gesture is confirmed horizontal
 * (dx > dy * 1.5 and at least 8px of movement).
 */
function attachSwipeGesture(
	container: HTMLElement,
	component: Component,
	panels: HTMLElement[],
	tabs: HTMLElement[],
	tabBar: HTMLElement,
): void {
	let startX = 0;
	let startY = 0;
	let startTime = 0;
	let locked: "horizontal" | "vertical" | null = null;

	const onStart = (e: TouchEvent): void => {
		const t = e.touches[0];
		startX = t.clientX;
		startY = t.clientY;
		startTime = Date.now();
		locked = null;
	};

	const onMove = (e: TouchEvent): void => {
		if (locked === "vertical") return;
		const t = e.touches[0];
		const dx = Math.abs(t.clientX - startX);
		const dy = Math.abs(t.clientY - startY);
		if (locked === null && (dx > 8 || dy > 8)) {
			locked = dx >= dy * 1.5 ? "horizontal" : "vertical";
		}
		if (locked === "horizontal") {
			// Prevent vertical scroll and Obsidian's sidebar gesture while swiping between tabs
			e.stopPropagation();
			e.preventDefault();
		}
	};

	const onEnd = (e: TouchEvent): void => {
		if (locked !== "horizontal") return;
		const t = e.changedTouches[0];
		const dx = t.clientX - startX;
		if (Math.abs(dx) < 40 || Date.now() - startTime > 400) return;

		const currentIdx = tabs.findIndex(tab => tab.hasClass("rb-tab-active"));
		if (currentIdx < 0) return;
		const nextIdx = dx < 0
			? Math.min(currentIdx + 1, tabs.length - 1)
			: Math.max(currentIdx - 1, 0);
		if (nextIdx !== currentIdx) activateTab(panels, tabs, tabBar, nextIdx);
	};

	container.addEventListener("touchstart", onStart, { passive: true });
	container.addEventListener("touchmove", onMove, { passive: false });
	container.addEventListener("touchend", onEnd, { passive: true });

	// Clean up when the view unloads so the listeners don't outlive the element
	component.register(() => {
		container.removeEventListener("touchstart", onStart);
		container.removeEventListener("touchmove", onMove);
		container.removeEventListener("touchend", onEnd);
	});
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function renderMobileLayout(
	container: HTMLElement,
	app: App,
	component: Component,
	file: TFile,
	fm: Record<string, unknown>,
	imageValue: string | null,
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
	shareStatus: ShareStatus,
): Promise<void> {
	let _panels: HTMLElement[] = [];
	let _tabs: HTMLElement[] = [];
	let _tabBar: HTMLElement = container; // forward-declared; replaced when tabs are built
	let _panelsWrapper: HTMLElement | null = null;

	// Description snippet
	const descriptionText = extractPlainText(beforeContent);
	if (descriptionText) {
		const descWrap = container.createDiv({ cls: "rb-mobile-desc" });
		descWrap.createSpan({ cls: "rb-mobile-desc-text", text: descriptionText });
		const moreLink = descWrap.createEl("a", { cls: "rb-mobile-desc-more", text: "More" });
		moreLink.addEventListener("click", () => {
			activateTab(_panels, _tabs, _tabBar, 2);
			// _panelsWrapper is set once tabs are built; scroll there so content is in view
			_panelsWrapper?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
		window.requestAnimationFrame(() => {
			if (descWrap.scrollHeight <= descWrap.clientHeight + 2) moreLink.hide();
		});
	}

	// Native card: image + rating + last-made + share status
	renderNativeCard(container, app, file, fm, imageValue, settings, meta, shareStatus, deps.saveSettings);

	// Tags row
	renderMobileTagRow(container, app, file, settings);

	// Fixed stat row (Prep / Cook / Total)
	renderMobileStatRow(container, settings, meta);

	// Remaining configurable badges (skip static time ones and lastMade, which appears in the native card)
	const skipOnMobile = (badge: CustomBadge): boolean => {
		if (isMobileStaticBadge(badge, settings)) return true;
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

	// All panels live inside this wrapper. display:grid with grid-area:1/1 makes them
	// stack in the same cell so the wrapper height always equals the tallest panel.
	// Swipe is also scoped here so it doesn't fire on the recipe header or action rows.
	const panelsWrapper = container.createDiv({ cls: "rb-tab-panels-wrapper" });
	_panelsWrapper = panelsWrapper;

	const panelIngr = panelsWrapper.createDiv({ cls: "rb-tab-panel" });
	const panelSteps = panelsWrapper.createDiv({ cls: "rb-tab-panel" });
	const panelInfo = panelsWrapper.createDiv({ cls: "rb-tab-panel" });
	_panels = [panelIngr, panelSteps, panelInfo];
	_tabs = [tabIngr, tabSteps, tabInfo];

	// 4th tab: cook history (icon-only to keep tab bar compact)
	if (settings.cookHistoryEnabled) {
		const tabHistory = tabBar.createEl("button", { cls: "rb-tab-btn rb-tab-btn--icon", attr: { "aria-label": "Cook history" } });
		setIcon(tabHistory, "clock");
		const panelHistory = panelsWrapper.createDiv({ cls: "rb-tab-panel" });
		_panels.push(panelHistory);
		_tabs.push(tabHistory);

		let historyRendered = false;
		function renderHistory(): void {
			panelHistory.empty();
			void renderCookHistoryList(panelHistory, app, file, settings, renderHistory);
		}

		const histIdx = _panels.length - 1;
		tabHistory.addEventListener("click", () => {
			activateTab(_panels, _tabs, tabBar, histIdx);
			// Lazy-render on first open so inactive recipes don't read disk on load
			if (!historyRendered) {
				historyRendered = true;
				renderHistory();
			}
		});
	}

	// Ingredients tab
	await renderIngredientsSection(
		panelIngr, app, file, ingredientGroups, settings, groceryItems, multiplier,
		(key) => { void deps.removeGroceryByKey(key); },
		() => { deps.openAddToGroceryModal(file); },
		component,
	);

	// Steps tab
	const timerOpts = settings.timersEnabled ? {
		autoStart: settings.timerAutoStart,
		compactByDefault: settings.timerCompactDisplay,
		rangeDefault: settings.timerRangeDefault,
		recipeName: file.basename,
		onNavigate: () => {
			void findOrOpenLeaf(app, RECIPE_VIEW_TYPE, file.path);
		},
	} : undefined;
	await renderInstructionsSection(panelSteps, app, component, file.path, instructionGroups, settings, timerOpts);

	// Info tab — nutrition + source URL + notes content
	renderMobileNutritionStrip(panelInfo, app, file, fm, settings, servings, multiplier);

	// Gated by the same setting as the desktop banner cell (meta-banner.ts):
	// one feature on two surfaces, never configured independently.
	//
	// The hostname comes from describeSourceLink, which checks the scheme before
	// parsing. new URL() used to run here unconditionally, one line above the
	// ^https?:// test meant to protect it, so a source that was not a web address
	// (a cookbook title, a bare domain) threw and took the whole Info tab render
	// with it -- leaving the tab bar wired to nothing.
	const source = settings.showRecipeSource
		? describeSourceLink(fmStr(fm, ["source", "url", "sourceUrl", "source_url"]))
		: null;
	if (source) {
		const urlRow = panelInfo.createDiv({ cls: "rb-info-url" });
		urlRow.createSpan({ cls: "rb-info-url-label", text: "Source: " });
		if (source.href) {
			urlRow.createEl("a", { href: source.href, text: source.label, attr: { target: "_blank", rel: "noopener" } });
		} else {
			urlRow.createSpan({ text: source.label });
		}
	}

	if (beforeContent.trim()) {
		await MarkdownRenderer.render(app, beforeContent, panelInfo, file.path, component);
	}
	if (afterContent.trim()) {
		await MarkdownRenderer.render(app, afterContent, panelInfo, file.path, component);
	}

	// Wire click handlers for the first 3 tabs; the optional history tab wires its
	// own handler above (it needs to trigger lazy rendering on first activation).
	[tabIngr, tabSteps, tabInfo].forEach((tab, i) => {
		tab.addEventListener("click", () => activateTab(_panels, _tabs, tabBar, i));
	});
	activateTab(_panels, _tabs, tabBar, 0);

	// Scope swipe to the panels wrapper so it doesn't fire on the header/action rows above
	attachSwipeGesture(panelsWrapper, component, _panels, _tabs, tabBar);
}
