import { describe, it, expect } from "vitest";
import { resolveNutritionDisplay, NUTRITION_FIELDS } from "../../src/ui/recipe-view/nutrition-fields";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";

const CALORIES = NUTRITION_FIELDS.find((f) => f.label === "Calories")!;

describe("resolveNutritionDisplay", () => {
	it("returns '—' when the field is entirely absent", () => {
		expect(resolveNutritionDisplay({}, CALORIES, DEFAULT_SETTINGS, 4, 1)).toBe("—");
	});

	it("scales the raw value by the multiplier", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "per-serving" as const, nutritionDisplay: "per-serving" as const };
		expect(resolveNutritionDisplay({ calories: 100 }, CALORIES, settings, 4, 2)).toBe("200");
	});

	it("converts per-serving source to total display using servings", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "per-serving" as const, nutritionDisplay: "total" as const };
		expect(resolveNutritionDisplay({ calories: 100 }, CALORIES, settings, 4, 1)).toBe("400");
	});

	it("converts total source to per-serving display using servings", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "recipe-total" as const, nutritionDisplay: "per-serving" as const };
		expect(resolveNutritionDisplay({ calories: 400 }, CALORIES, settings, 4, 1)).toBe("100");
	});

	it("shows the raw scaled value when conversion is needed but servings is unavailable", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "per-serving" as const, nutritionDisplay: "total" as const };
		expect(resolveNutritionDisplay({ calories: 100 }, CALORIES, settings, null, 1)).toBe("100");
	});

	it("appends the field's unit when present", () => {
		const protein = NUTRITION_FIELDS.find((f) => f.label === "Protein")!;
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "per-serving" as const, nutritionDisplay: "per-serving" as const };
		expect(resolveNutritionDisplay({ protein: 20 }, protein, settings, 4, 1)).toBe("20 g");
	});

	it("rounds a near-whole-number value but keeps one decimal otherwise", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "per-serving" as const, nutritionDisplay: "per-serving" as const };
		expect(resolveNutritionDisplay({ calories: 99.98 }, CALORIES, settings, 4, 1)).toBe("100");
		expect(resolveNutritionDisplay({ calories: 99.5 }, CALORIES, settings, 4, 1)).toBe("99.5");
	});
});
