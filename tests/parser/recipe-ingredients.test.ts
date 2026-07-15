import { describe, it, expect } from "vitest";
import { extractIngredientLines } from "../../src/parser/recipe-ingredients";

describe("extractIngredientLines", () => {
	it("extracts list lines beneath the ingredients heading", () => {
		const body = "## Ingredients\n- flour\n- sugar\n## Instructions\n1. Mix.";
		expect(extractIngredientLines(body, "Ingredients")).toEqual(["- flour", "- sugar"]);
	});

	it("stops at a heading of equal or shallower depth", () => {
		const body = "## Ingredients\n- flour\n## Instructions\n- not an ingredient";
		expect(extractIngredientLines(body, "Ingredients")).toEqual(["- flour"]);
	});

	it("falls back to scanning the whole body for list lines when the heading is missing", () => {
		const body = "- flour\nSome prose.\n- sugar";
		expect(extractIngredientLines(body, "Ingredients")).toEqual(["- flour", "- sugar"]);
	});

	it("ignores non-list lines within the section", () => {
		const body = "## Ingredients\nSome note.\n- flour";
		expect(extractIngredientLines(body, "Ingredients")).toEqual(["- flour"]);
	});
});
