import { describe, it, expect } from "vitest";
import { exportRecipeJsonLd, toIsoDuration, ingredientText } from "../../src/recipe-export/exporters/json-ld-exporter";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { makeExportData } from "./fixtures";

describe("toIsoDuration", () => {
	it("formats minutes under an hour as PT<m>M", () => {
		expect(toIsoDuration(30)).toBe("PT30M");
	});

	it("formats an exact hour as PT<h>H", () => {
		expect(toIsoDuration(60)).toBe("PT1H");
	});

	it("formats hours and minutes together", () => {
		expect(toIsoDuration(90)).toBe("PT1H30M");
	});

	it("returns undefined for null or non-positive minutes", () => {
		expect(toIsoDuration(null)).toBeUndefined();
		expect(toIsoDuration(0)).toBeUndefined();
		expect(toIsoDuration(-5)).toBeUndefined();
	});
});

describe("ingredientText", () => {
	it("joins quantity, unit, name, and a parenthesised note", () => {
		expect(
			ingredientText({ quantity: 2, unit: "cup", name: "flour", note: "sifted", tags: [], raw: "", sourcePath: "", sourceLabel: "" }),
		).toBe("2 cup flour (sifted)");
	});

	it("omits missing parts cleanly", () => {
		expect(
			ingredientText({ quantity: null, unit: "", name: "salt", note: null, tags: [], raw: "", sourcePath: "", sourceLabel: "" }),
		).toBe("salt");
	});

	it("strips Obsidian wikilink syntax from the name", () => {
		expect(
			ingredientText({ quantity: 1, unit: "", name: "[[Flour|Bread Flour]]", note: null, tags: [], raw: "", sourcePath: "", sourceLabel: "" }),
		).toBe("1 Bread Flour");
	});
});

describe("exportRecipeJsonLd", () => {
	it("produces a schema.org Recipe with the basic fields set", () => {
		const recipe = exportRecipeJsonLd(makeExportData(), {}, DEFAULT_SETTINGS);
		expect(recipe["@context"]).toBe("https://schema.org");
		expect(recipe["@type"]).toBe("Recipe");
		expect(recipe.name).toBe("Test Recipe");
		expect(recipe.recipeYield).toBe("4");
		expect(recipe.recipeIngredient).toEqual(["2 cup flour", "1 egg"]);
	});

	it("maps recognized diet strings to schema.org enum URLs, passing through unknowns", () => {
		const data = makeExportData({
			meta: { diet: ["vegan", "made-up-diet"], allergens: [], times: { prep: null, cook: null, total: null }, favorite: false, cookedCount: 0, lastMade: null },
		});
		const recipe = exportRecipeJsonLd(data, {}, DEFAULT_SETTINGS);
		expect(recipe.suitableForDiet).toEqual(["https://schema.org/VeganDiet", "made-up-diet"]);
	});

	it("folds allergens into keywords since there is no schema.org slot for them", () => {
		const data = makeExportData({
			meta: { diet: [], allergens: ["peanuts", "shellfish"], times: { prep: null, cook: null, total: null }, favorite: false, cookedCount: 0, lastMade: null },
		});
		const recipe = exportRecipeJsonLd(data, {}, DEFAULT_SETTINGS);
		expect(recipe.keywords).toBe("peanuts, shellfish");
	});

	it("groups instruction steps under a HowToSection when the group has a heading", () => {
		const data = makeExportData({
			instructionGroups: [{ heading: "Dough", headingLevel: 3, steps: ["Mix.", "Knead."] }],
		});
		const recipe = exportRecipeJsonLd(data, {}, DEFAULT_SETTINGS);
		expect(recipe.recipeInstructions).toEqual([
			{
				"@type": "HowToSection",
				name: "Dough",
				itemListElement: [
					{ "@type": "HowToStep", text: "Mix." },
					{ "@type": "HowToStep", text: "Knead." },
				],
			},
		]);
	});

	it("emits flat HowToStep entries when a group has no heading", () => {
		const recipe = exportRecipeJsonLd(makeExportData(), {}, DEFAULT_SETTINGS);
		expect(recipe.recipeInstructions).toEqual([
			{ "@type": "HowToStep", text: "Mix." },
			{ "@type": "HowToStep", text: "Bake." },
		]);
	});

	it("omits image entirely for a vault-relative image (not a fetchable URL)", () => {
		const data = makeExportData({ image: { kind: "vault", file: { path: "img.png" } as never } });
		const recipe = exportRecipeJsonLd(data, {}, DEFAULT_SETTINGS);
		expect(recipe.image).toBeUndefined();
	});
});
