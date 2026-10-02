import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mealieToExtracted } from "../../../src/importer/file-import/adapters/mealie-to-extracted";
import { detectFormat } from "../../../src/importer/file-import/file-import-detect";
import { schemaOrgToExtracted } from "../../../src/importer/file-import/adapters/schema-org-to-extracted";

const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/file-import/${name}`, "utf8")) as unknown;

describe("mealieToExtracted (real snake_case export)", () => {
	const r = mealieToExtracted(fixture("mealie-recipe.json"))!;

	it("maps basics, *_seconds times and source", () => {
		expect(r.title).toBe("Apfelkuchen mit Streuseln");
		expect(r.servings).toBe("12");
		expect([r.prepTime, r.cookTime, r.totalTime]).toEqual([15, 45, 60]);
		expect(r.sourceUrl).toBe("https://emmikochteinfach.de/apfelkuchen-mit-streuseln/");
		expect(r.heroImage).toBeNull();
	});
	it("uses Mealie's display text and starts groups at titled items", () => {
		expect(r.ingredientGroups).toEqual([
			{ name: null, items: ['150 g kalte Butter möglichst keine "streichzart"-Sorte verwenden', "150 g Zucker"] },
			{ name: "Topping", items: ["300 g weizenmehl alternativ Dinkelmehl Type 630"] },
		]);
		expect(r.instructionGroups.map(g => g.name)).toEqual([null, "FÜR DEN STREUSEL-BODEN UND TOPPING"]);
		expect(r.instructionGroups[1].items).toHaveLength(2);
	});
	it("maps notes and nutrition", () => {
		expect(r.notesGroups).toEqual([{ name: null, items: ["Tip: Better next day."] }]);
		expect(r.calories).toBe(288);
	});
	it("rejoins a split yield", () => {
		expect(mealieToExtracted({ name: "A", recipe_yield: "rolls", recipe_yield_quantity: 12 })!.servings).toBe("12 rolls");
		expect(mealieToExtracted({ name: "A", recipe_yield: null, recipe_servings: 0, recipe_yield_quantity: 0 })!.servings).toBeNull();
	});
	it("fails a unit with no name", () => {
		expect(mealieToExtracted({ slug: "x", name: "" })).toBeNull();
	});
	it("still reads the older camelCase spelling", () => {
		const old = mealieToExtracted({ name: "A", recipeYield: "4 servings", orgURL: "https://x.com/a", recipeIngredient: [{ display: "1 egg" }] })!;
		expect([old.servings, old.sourceUrl, old.ingredientGroups[0].items[0]]).toEqual(["4 servings", "https://x.com/a", "1 egg"]);
	});
});

describe("schemaOrgToExtracted", () => {
	it("extracts despite an allrecipes.com url and restores the real sourceUrl", async () => {
		const r = await schemaOrgToExtracted(fixture("schema-org-recipe.json"));
		expect(r?.title).toBe("Pancakes");
		expect(r?.sourceUrl).toBe("https://www.allrecipes.com/recipe/1/pancakes/");
		expect(r?.ingredientGroups[0].items).toHaveLength(3);
		expect(r?.instructionGroups[0].items).toEqual(["Mix.", "Fry."]);
		expect([r?.prepTime, r?.cookTime]).toEqual([10, 15]);
		expect(r?.calories).toBe(250);
	});
	it("drops a relative image and returns null for non-recipes", async () => {
		const data = { ...(fixture("schema-org-recipe.json") as object), image: "full.jpg" };
		expect((await schemaOrgToExtracted(data))?.heroImage).toBeNull();
		expect(await schemaOrgToExtracted({ "@type": "Thing" })).toBeNull();
	});
});

describe("Mealie schema.org export", () => {
	const data = fixture("mealie-export-schema.json");
	it("routes to schema.org and maps the core fields", async () => {
		expect(detectFormat(data)).toBe("schema-org");
		const r = await schemaOrgToExtracted(data);
		expect(r?.title).toBe("Classic Pesto Pasta");
		expect(r?.servings).toBe("4 servings");
		expect([r?.prepTime, r?.cookTime, r?.totalTime]).toEqual([10, 15, 25]);
		expect(r?.ingredientGroups[0].items).toHaveLength(5);
		expect(r?.instructionGroups[0].items).toHaveLength(3);
		expect(r?.heroImage).toBeNull();
	});
	it("keeps the notes array", async () => {
		const r = await schemaOrgToExtracted(data);
		expect(r?.notesGroups).toEqual([{ name: null, items: ["Top with fresh cherry tomatoes or toasted pine nuts for extra crunch."] }]);
	});
});
