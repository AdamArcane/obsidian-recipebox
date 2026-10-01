import { describe, it, expect } from "vitest";
import { parseLeadingQuantity } from "../../src/parser/quantity-parse";

describe("parseLeadingQuantity", () => {
	it("parses a plain integer", () => {
		expect(parseLeadingQuantity("2 cups flour")).toEqual({ quantity: 2, rest: "cups flour" });
	});

	it("parses a plain decimal", () => {
		expect(parseLeadingQuantity("1.5 cups flour")).toEqual({ quantity: 1.5, rest: "cups flour" });
	});

	it("parses 'a'/'an' as quantity 1", () => {
		expect(parseLeadingQuantity("a pinch of salt")).toEqual({ quantity: 1, rest: "pinch of salt" });
		expect(parseLeadingQuantity("an onion")).toEqual({ quantity: 1, rest: "onion" });
	});

	it("parses a simple ASCII fraction", () => {
		expect(parseLeadingQuantity("1/2 cup sugar")).toEqual({ quantity: 0.5, rest: "cup sugar" });
	});

	it("parses a mixed ASCII number", () => {
		expect(parseLeadingQuantity("1 1/2 cups sugar")).toEqual({ quantity: 1.5, rest: "cups sugar" });
	});

	it("parses a standalone unicode fraction", () => {
		expect(parseLeadingQuantity("½ cup butter")).toEqual({ quantity: 0.5, rest: "cup butter" });
	});

	it("parses a whole number with an attached unicode fraction", () => {
		expect(parseLeadingQuantity("2½ cups rice")).toEqual({ quantity: 2.5, rest: "cups rice" });
	});

	it("returns null quantity when there is no leading number", () => {
		expect(parseLeadingQuantity("salt to taste")).toEqual({ quantity: null, rest: "salt to taste" });
	});

	it("handles a bad ASCII fraction (zero denominator) by falling through", () => {
		const result = parseLeadingQuantity("1/0 cup water");
		expect(result.quantity).not.toBe(Infinity);
	});
});

describe("decimal notation", () => {
	it("accepts a leading decimal point", () => {
		expect(parseLeadingQuantity(".5 teaspoon salt")).toEqual({ quantity: 0.5, rest: "teaspoon salt" });
	});

	it("accepts a comma as the decimal divider", () => {
		expect(parseLeadingQuantity("1,5 kg potatoes")).toEqual({ quantity: 1.5, rest: "kg potatoes" });
		expect(parseLeadingQuantity(",5 kg potatoes")).toEqual({ quantity: 0.5, rest: "kg potatoes" });
	});

	it("leaves a comma that follows the amount as text", () => {
		expect(parseLeadingQuantity("2, peeled onions")).toEqual({ quantity: 2, rest: ", peeled onions" });
	});
});

describe("parseLeadingQuantity ranges and spaced mixed numbers", () => {
	it("parses a whole number, a space, and a unicode fraction", () => {
		expect(parseLeadingQuantity("1 ½ cups panko")).toEqual({ quantity: 1.5, rest: "cups panko" });
	});

	it("reports the upper bound as quantity and the lower bound as min", () => {
		expect(parseLeadingQuantity("2-3 bananas")).toEqual({ quantity: 3, min: 2, rest: "bananas" });
		expect(parseLeadingQuantity("3 to 4 large eggs")).toEqual({ quantity: 4, min: 3, rest: "large eggs" });
		expect(parseLeadingQuantity("1/2 - 3/4 tsp sea salt")).toEqual({ quantity: 0.75, min: 0.5, rest: "tsp sea salt" });
		expect(parseLeadingQuantity("2–3 bananas")).toEqual({ quantity: 3, min: 2, rest: "bananas" });
		expect(parseLeadingQuantity("1 ½ - 2 cups milk")).toEqual({ quantity: 2, min: 1.5, rest: "cups milk" });
	});

	it("collapses an equal pair to a single number", () => {
		expect(parseLeadingQuantity("2-2 bananas")).toEqual({ quantity: 2, rest: "bananas" });
	});

	it("does not read hyphenated names, descending pairs, or chained numbers as ranges", () => {
		expect(parseLeadingQuantity("2-inch piece ginger")).toEqual({ quantity: 2, rest: "-inch piece ginger" });
		expect(parseLeadingQuantity("5-1 thing").min).toBeUndefined();
		expect(parseLeadingQuantity("1-2-3 sauce").min).toBeUndefined();
		expect(parseLeadingQuantity("2 tomatoes")).toEqual({ quantity: 2, rest: "tomatoes" });
		expect(parseLeadingQuantity("1 to taste")).toEqual({ quantity: 1, rest: "to taste" });
	});

	it("keeps a following digit as part of the name", () => {
		expect(parseLeadingQuantity("2-3 12 oz cans tomatoes")).toEqual({ quantity: 3, min: 2, rest: "12 oz cans tomatoes" });
	});
});
