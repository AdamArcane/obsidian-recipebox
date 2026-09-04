import { describe, it, expect } from "vitest";
import { applyNutritionEdits } from "../../src/ui/recipe-view/nutrition-write";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";

describe("applyNutritionEdits", () => {
	it("writes to the configured property name", () => {
		const fm: Record<string, unknown> = {};
		applyNutritionEdits(fm, DEFAULT_SETTINGS, { caloriesProperty: "250" });
		expect(fm.calories).toBe(250);
	});

	it("migrates an alias key to the configured name and deletes the alias", () => {
		const fm: Record<string, unknown> = { kcal: 300 };
		applyNutritionEdits(fm, DEFAULT_SETTINGS, { caloriesProperty: "300" });
		expect(fm.calories).toBe(300);
		expect(fm.kcal).toBeUndefined();
	});

	it("deletes the property when the field is cleared", () => {
		const fm: Record<string, unknown> = { calories: 300 };
		applyNutritionEdits(fm, DEFAULT_SETTINGS, { caloriesProperty: "" });
		expect(fm.calories).toBeUndefined();
	});

	it("flattens a legacy nested nutrition block onto the flat key", () => {
		const fm: Record<string, unknown> = { nutrition: { calories: 100, protein: 10 } };
		applyNutritionEdits(fm, DEFAULT_SETTINGS, { caloriesProperty: "120", proteinProperty: "10" });
		expect(fm.calories).toBe(120);
		expect(fm.protein).toBe(10);
		expect(fm.nutrition).toBeUndefined();
	});

	it("removes the nested block entirely once it's empty", () => {
		const fm: Record<string, unknown> = { nutrition: { calories: 100 } };
		applyNutritionEdits(fm, DEFAULT_SETTINGS, { caloriesProperty: "" });
		expect(fm.nutrition).toBeUndefined();
	});

	it("ignores unparseable input", () => {
		const fm: Record<string, unknown> = { calories: 100 };
		applyNutritionEdits(fm, DEFAULT_SETTINGS, { caloriesProperty: "not a number" });
		expect(fm.calories).toBe(100);
	});
});
