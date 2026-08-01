import { ENGLISH_VOCABULARY, compileVocabulary } from "../../src/parser/vocabulary";
import { describe, it, expect } from "vitest";
import { rescaleIngredientLine } from "../../src/recipe-export/rescale-ingredient-line";

const PT = compileVocabulary("pt-PT", "");

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

	// The multiplier has nothing to act on without a quantity, so rebuilding the
	// line could only lose text. It used to reformat anyway, which turned
	// "- sal q.b." into "- sal (q.b.)" once qualifiers moved into the note, and
	// cost English the trailing period in "- salt to taste."
	it("returns a line with no quantity unchanged", () => {
		expect(rescaleIngredientLine("- sal q.b.", 2, PT)).toBe("- sal q.b.");
		expect(rescaleIngredientLine("- salt to taste.", 2, ENGLISH_VOCABULARY)).toBe("- salt to taste.");
	});

	// The parser strips the preposition joining a unit to its ingredient. English
	// survives that ("4 cup flour"), Portuguese does not: "4 dente alho" is not a
	// sentence.
	it("restores the locale preposition between unit and ingredient", () => {
		expect(rescaleIngredientLine("- 2 dentes de alho", 2, PT)).toBe("- 4 dente de alho");
		expect(rescaleIngredientLine("- 200 g de farinha", 2, PT)).toBe("- 400 g de farinha");
	});

	// A "de" inside the ingredient's own name is not a joiner, and with no unit
	// there is no joint for one to sit in.
	it("does not invent a preposition where the parser removed none", () => {
		expect(rescaleIngredientLine("- 1 pão de ló", 2, PT)).toBe("- 2 pão de ló");
		expect(rescaleIngredientLine("- 2 cups of flour", 2, ENGLISH_VOCABULARY)).toBe("- 4 cup flour");
	});
});
