import { describe, it, expect } from "vitest";
import { parseIngredientLine } from "../../src/parser/ingredient-parse";
import { scaleAmount, scaleNumbers } from "../../src/parser/ingredient-amount";
import { rescaleIngredientLine } from "../../src/recipe-export/rescale-ingredient-line";

function amountOf(line: string, multiplier: number) {
	const parsed = parseIngredientLine(line);
	if (!parsed) throw new Error("did not parse");
	return scaleAmount(parsed, multiplier);
}

describe("scaleAmount", () => {
	it("scales both ends of a range", () => {
		expect(amountOf("2-3 bananas", 2).text).toBe("4–6");
		expect(amountOf("1/2 - 3/4 tsp sea salt", 2).text).toBe("1–1 1/2");
	});

	it("scales a second measure with the same multiplier", () => {
		expect(amountOf("125 g / 4 oz rice sticks", 2).alt).toEqual({ text: "8", unit: "oz" });
	});

	it("shows scaled metric amounts as decimals, in both measures", () => {
		expect(amountOf("125 g / 4 oz rice sticks", 1 / 3).text).toBe("41.7");
		expect(amountOf("8 cups|1892 ml water", 1 / 3).alt).toEqual({ text: "631", unit: "ml" });
		expect(amountOf("1 1/2 kg flour", 1).text).toBe("1.5");
		expect(amountOf("12.5 g yeast", 1).text).toBe("12.5");
		expect(amountOf("1.25 kg potatoes", 1).text).toBe("1.25");
		expect(amountOf("0.25 l stock", 1).text).toBe("0.25");
	});

	it("shows one number when a scaled range collapses", () => {
		expect(amountOf("1-1.01 tsp salt", 1).text).toBe("1");
	});
});

describe("rescaleIngredientLine with ranges and second measures", () => {
	it("keeps ranges and second measures intact when rescaling", () => {
		expect(rescaleIngredientLine("- 2-3 bananas", 2)).toBe("- 4-6 bananas");
		expect(rescaleIngredientLine("- 125 g / 4 oz rice sticks", 2)).toBe("- 250 g / 8 oz rice sticks");
		expect(rescaleIngredientLine("- 1 ½ cups panko", 2)).toBe("- 3 cup panko");
	});

	it("round-trips: a rescaled line parses back to the same amounts", () => {
		const once = rescaleIngredientLine("- 3 to 4 large eggs", 2);
		expect(parseIngredientLine(once)).toMatchObject({ quantity: 8, quantityMin: 6 });
	});
});

describe("second measure ranges", () => {
	it("parses and rescales a range in both measures", () => {
		expect(parseIngredientLine("125-150 g / 4-5 oz rice")).toMatchObject({
			quantity: 150, quantityMin: 125, alt: { quantity: 5, quantityMin: 4, unit: "oz" },
		});
		expect(rescaleIngredientLine("- 125-150 g / 4-5 oz rice", 2)).toBe("- 250-300 g / 8-10 oz rice");
	});
});

describe("scaleNumbers", () => {
	it("scales every numeric field together", () => {
		const parsed = parseIngredientLine("2-3 g / 4-5 oz salt");
		if (!parsed) throw new Error("did not parse");
		expect(scaleNumbers(parsed, 2)).toEqual({ quantity: 6, quantityMin: 4, alt: { quantity: 10, quantityMin: 8, unit: "oz" } });
	});

	it("omits optional fields for a plain ingredient", () => {
		const parsed = parseIngredientLine("2 cups flour");
		if (!parsed) throw new Error("did not parse");
		expect(scaleNumbers(parsed, 2)).toEqual({ quantity: 4 });
	});
});
