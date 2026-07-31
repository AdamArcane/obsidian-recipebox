import { ENGLISH_VOCABULARY } from "../../src/parser/unit-table";
import { describe, it, expect } from "vitest";
import { rescaleIngredientLine } from "../../src/recipe-export/rescale-ingredient-line";

describe("rescaleIngredientLine", () => {
	it("returns the raw line unchanged when the multiplier is 1", () => {
		expect(rescaleIngredientLine("- 2 cups flour", 1, ENGLISH_VOCABULARY)).toBe("- 2 cups flour");
	});

	it("scales the quantity and reformats the line", () => {
		expect(rescaleIngredientLine("- 2 cups flour", 2, ENGLISH_VOCABULARY)).toBe("- 4 cup flour");
	});

	it("preserves a checked/unchecked checkbox marker", () => {
		expect(rescaleIngredientLine("- [x] 2 cups flour", 2, ENGLISH_VOCABULARY)).toBe("- [x] 4 cup flour");
		expect(rescaleIngredientLine("- [ ] 2 cups flour", 2, ENGLISH_VOCABULARY)).toBe("- [ ] 4 cup flour");
	});

	it("preserves a numbered list marker", () => {
		expect(rescaleIngredientLine("1. 2 cups flour", 2, ENGLISH_VOCABULARY)).toBe("1. 4 cup flour");
	});

	it("re-appends the inline note and tags after scaling", () => {
		expect(rescaleIngredientLine("- 2 cups flour (sifted) #pantry", 2, ENGLISH_VOCABULARY)).toBe("- 4 cup flour (sifted) #pantry");
	});

	it("returns the raw line unchanged when it doesn't parse into a named ingredient", () => {
		expect(rescaleIngredientLine("- ", 2, ENGLISH_VOCABULARY)).toBe("- ");
	});

	it("formats a fractional scaled quantity via formatQuantity", () => {
		expect(rescaleIngredientLine("- 1 cup sugar", 0.5, ENGLISH_VOCABULARY)).toBe("- 1/2 cup sugar");
	});
});
