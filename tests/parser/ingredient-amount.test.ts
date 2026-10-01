import { describe, it, expect } from "vitest";
import { parseIngredientLine } from "../../src/parser/ingredient-parse";
import { scaleAmount } from "../../src/parser/ingredient-amount";
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
