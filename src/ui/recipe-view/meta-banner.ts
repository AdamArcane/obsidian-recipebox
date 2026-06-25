/**
 * Renders the desktop recipe meta banner — the multiplier stepper, nutrition
 * cells, and action buttons (favorite, mark cooked, meal plan toggle).
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { RECIPE_FRONTMATTER } from "../../settings/frontmatter-keys";
import { RecipeViewDeps } from "./recipe-view-deps";
import { NUTRITION_FIELDS, resolveNutritionDisplay } from "./nutrition-fields";
import { renderFavoriteToggle } from "./favorite-toggle";
import { renderMealPlanToggle } from "./meal-plan-toggle";
import { renderMarkCookedButton } from "./mark-cooked-button";
import { MealPlanEntry } from "../../types";

function renderMultiplierCell(
	container: HTMLElement,
	app: App,
	file: TFile,
	multiplier: number,
): void {
	const cell = container.createDiv({ cls: "rb-banner-cell rb-multiplier-cell" });
	// cell.createSpan({ cls: "rb-nutrition-label", text: "Scale" });
	const control = cell.createDiv({ cls: "rb-stepper" });

	const decBtn = control.createEl("button", { text: "−", cls: "rb-step-btn" });
	const input = control.createEl("input", {
		cls: "rb-step-input",
		attr: { type: "number", value: String(multiplier), min: "0.5", step: "0.5" },
	});
	const incBtn = control.createEl("button", { text: "+", cls: "rb-step-btn" });

	async function commit(value: number): Promise<void> {
		const clamped = Math.max(0.5, Math.round(value * 2) / 2);
		input.value = String(clamped);
		await app.fileManager.processFrontMatter(file, (fm) => {
			const f = fm as Record<string, unknown>;
			if (clamped === 1) delete f[RECIPE_FRONTMATTER.multiplier];
			else f[RECIPE_FRONTMATTER.multiplier] = clamped;
		});
	}

	decBtn.addEventListener("click", () => void commit(parseFloat(input.value) - 0.5));
	incBtn.addEventListener("click", () => void commit(parseFloat(input.value) + 0.5));
	input.addEventListener("change", () => void commit(parseFloat(input.value)));
}

function renderServingsCell(
	container: HTMLElement,
	baseServings: number | null,
	multiplier: number,
): void {
	if (baseServings === null) return;
	const cell = container.createDiv({ cls: "rb-banner-cell rb-servings-cell" });
	const scaled = baseServings * multiplier;
	const display = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, "");
	cell.createSpan({ cls: "rb-servings-label", text: "Serves" });
	cell.createSpan({ cls: "rb-servings-value", text: display });
}

function renderNutritionCell(
	container: HTMLElement,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	servings: number | null,
	multiplier: number,
): void {
	const cell = container.createDiv({ cls: "rb-banner-cell rb-nutrition-cell" });
	const grid = cell.createDiv({ cls: "rb-nutrition-grid" });
	for (const field of NUTRITION_FIELDS) {
		const value = resolveNutritionDisplay(fm, field, settings, servings, multiplier);
		grid.createSpan({ cls: "rb-nutrition-label", text: field.label });
		grid.createSpan({ cls: "rb-nutrition-value", text: value });
	}
}

export function renderMetaBanner(
	container: HTMLElement,
	app: App,
	file: TFile,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	multiplier: number,
	servings: number | null,
	inPlan: boolean,
	planEntries: MealPlanEntry[],
	deps: RecipeViewDeps,
): void {
	const banner = container.createDiv({ cls: "rb-meta-banner" });
	const cells = banner.createDiv({ cls: "rb-banner-cells" });
	renderMultiplierCell(cells, app, file, multiplier);
	renderServingsCell(cells, servings, multiplier);
	renderNutritionCell(cells, fm, settings, servings, multiplier);

	const actions = banner.createDiv({ cls: "rb-header-actions" });
	renderFavoriteToggle(actions, app, file, fm);
	renderMarkCookedButton(actions, app, file, settings, deps);
	renderMealPlanToggle(actions, app, file, inPlan, planEntries, deps);
}
