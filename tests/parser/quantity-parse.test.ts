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
