import { describe, it, expect } from "vitest";
import { resolveRawNutrition } from "../../src/recipe-export/nutrition-raw";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";

describe("resolveRawNutrition", () => {
	it("reads calories/protein/fat/carbs from their configured properties", () => {
		const fm = {
			[DEFAULT_SETTINGS.caloriesProperty]: 300,
			[DEFAULT_SETTINGS.proteinProperty]: 20,
			[DEFAULT_SETTINGS.fatProperty]: 10,
			[DEFAULT_SETTINGS.carbsProperty]: 40,
		};
		expect(resolveRawNutrition(fm, DEFAULT_SETTINGS, 1)).toEqual({ calories: 300, protein: 20, fat: 10, carbs: 40 });
	});

	it("scales every value by the multiplier", () => {
		const fm = { [DEFAULT_SETTINGS.caloriesProperty]: 300 };
		expect(resolveRawNutrition(fm, DEFAULT_SETTINGS, 2).calories).toBe(600);
	});

	it("returns null for fields that are absent", () => {
		expect(resolveRawNutrition({}, DEFAULT_SETTINGS, 1)).toEqual({ calories: null, protein: null, fat: null, carbs: null });
	});
});
