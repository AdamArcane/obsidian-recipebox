import { describe, it, expect } from "vitest";
import { extractQualifiers } from "../../src/parser/ingredient-qualifiers";
import { compileQualifierTable } from "../../src/parser/vocabulary";
import { parseIngredientLine } from "../../src/parser/ingredient-parse";
import { compileVocabulary } from "../../src/parser/vocabulary";

const PT_QUALIFIERS = compileQualifierTable("pt-PT");
const PT = compileVocabulary("pt-PT", "");

describe("extractQualifiers", () => {
	it("lifts size and preparation words out of the name", () => {
		expect(extractQualifiers("cebola picada", PT_QUALIFIERS)).toEqual({ name: "cebola", qualifiers: ["picada"] });
		expect(extractQualifiers("cebola média", PT_QUALIFIERS)).toEqual({ name: "cebola", qualifiers: ["média"] });
	});

	it("keeps variety words, which change what you buy", () => {
		expect(extractQualifiers("cebola roxa", PT_QUALIFIERS)).toEqual({ name: "cebola roxa", qualifiers: [] });
		expect(extractQualifiers("pimenta preta", PT_QUALIFIERS)).toEqual({ name: "pimenta preta", qualifiers: [] });
		expect(extractQualifiers("arroz integral", PT_QUALIFIERS)).toEqual({ name: "arroz integral", qualifiers: [] });
	});

	it("lifts a variety's qualifier while keeping the variety", () => {
		expect(extractQualifiers("cebola roxa picada", PT_QUALIFIERS)).toEqual({
			name: "cebola roxa",
			qualifiers: ["picada"],
		});
	});

	it("prefers the longest phrase", () => {
		expect(extractQualifiers("cenouras em cubos", PT_QUALIFIERS)).toEqual({ name: "cenouras", qualifiers: ["em cubos"] });
	});

	it("tidies separators left behind by a lifted qualifier", () => {
		expect(extractQualifiers("cebola roxa, picada", PT_QUALIFIERS).name).toBe("cebola roxa");
	});

	it("does nothing when the locale declares no qualifiers", () => {
		expect(extractQualifiers("chopped onion", compileQualifierTable("en"))).toEqual({
			name: "chopped onion",
			qualifiers: [],
		});
	});
});

describe("parseIngredientLine with qualifiers", () => {
	it("merges q.b. lines onto the bare ingredient and records it as a note", () => {
		const plain = parseIngredientLine("- sal", PT);
		const toTaste = parseIngredientLine("- sal q.b.", PT);
		expect(toTaste?.name).toBe(plain?.name);
		expect(toTaste?.note).toBe("q.b.");
	});

	it("keeps an existing parenthesised note alongside the lifted qualifier", () => {
		const parsed = parseIngredientLine("- *1* cebola picada (opcional)", PT);
		expect(parsed).toMatchObject({ quantity: 1, name: "cebola", note: "opcional, picada" });
	});

	it("does not merge a red onion into a plain one", () => {
		expect(parseIngredientLine("- *1* cebola roxa", PT)?.name).toBe("cebola roxa");
		expect(parseIngredientLine("- *1* cebola grande", PT)?.name).toBe("cebola");
	});

	// "q.b." used to be a unit as well as a qualifier, so the two orderings keyed
	// differently and the grocery list carried salt twice. Lifting a leading
	// qualifier also exposes the preposition behind it, which is why the name is
	// "sal" rather than "de sal".
	it("parses a to-taste modifier the same way in either position", () => {
		const trailing = parseIngredientLine("- sal q.b.", PT);
		const leading = parseIngredientLine("- q.b. de sal", PT);
		expect(trailing).toMatchObject({ quantity: null, unit: "", name: "sal", note: "q.b." });
		expect(leading).toMatchObject({ quantity: null, unit: "", name: "sal", note: "q.b." });
	});
});
