import { describe, it, expect } from "vitest";
import { toShareableRecipeData } from "../../src/sharing/share-export-data";
import { makeExportData } from "../recipe-export/fixtures";

describe("toShareableRecipeData", () => {
	it("narrows a full RecipeExportData down to the share allowlist", () => {
		const data = makeExportData({
			meta: {
				diet: ["vegan"],
				allergens: ["peanuts"],
				times: { prep: 10, cook: 20, total: 30 },
				favorite: true,
				cookedCount: 5,
				lastMade: "2024-01-01",
			},
		});
		const shareable = toShareableRecipeData(data);
		expect(shareable).not.toHaveProperty("diet");
		expect(shareable).not.toHaveProperty("allergens");
		expect(shareable).not.toHaveProperty("favorite");
		expect(shareable).not.toHaveProperty("cookedCount");
		expect(shareable).not.toHaveProperty("lastMade");
		expect(shareable.times).toEqual({ prep: 10, cook: 20, total: 30 });
	});

	it("carries over title, servings, ingredients, instructions, nutrition, and image", () => {
		const data = makeExportData({ title: "Pasta", servings: 4 });
		const shareable = toShareableRecipeData(data);
		expect(shareable.title).toBe("Pasta");
		expect(shareable.servings).toBe(4);
		expect(shareable.ingredientGroups).toEqual(data.ingredientGroups);
		expect(shareable.instructionGroups).toEqual(data.instructionGroups);
	});

	it("strips Obsidian markdown from the intro content", () => {
		const data = makeExportData({ introContent: "See [[Other Recipe]] for a variation." });
		expect(toShareableRecipeData(data).introContent).toBe("See Other Recipe for a variation.");
	});
});
