import { describe, it, expect } from "vitest";
import {
	compileUnitTable,
	compileQualifierTable,
	compileVocabulary,
	ENGLISH_VOCABULARY,
} from "../../src/parser/vocabulary";

describe("compileUnitTable", () => {
	it("falls back to the English vocabulary for an unknown locale", () => {
		const units = compileUnitTable("kl-KL", "");
		expect(units.forms.get("tbsp")).toBe("tbsp");
		expect(units.forms.get("cups")).toBe("cup");
	});

	it("adds locale forms on top of English", () => {
		const units = compileUnitTable("pt-PT", "");
		expect(units.forms.get("colher de sopa")).toBe("c. sopa");
		expect(units.forms.get("gr")).toBe("g");
		// shared metric units still resolve through the English base
		expect(units.forms.get("kg")).toBe("kg");
	});

	it("lets a locale suppress a conflicting English form", () => {
		expect(ENGLISH_VOCABULARY.units.forms.get("c")).toBe("cup");
		expect(compileUnitTable("pt-PT", "").forms.has("c")).toBe(false);
	});

	it("gives user aliases precedence over both locale and English", () => {
		const units = compileUnitTable("pt-PT", "colher de sopa => tbsp\ncups => mug");
		expect(units.forms.get("colher de sopa")).toBe("tbsp");
		expect(units.forms.get("cups")).toBe("mug");
	});

	it("reports the longest form in words so the matcher knows its lookahead", () => {
		expect(compileUnitTable("pt-PT", "").maxWords).toBeGreaterThanOrEqual(3);
		expect(compileUnitTable("pt-PT", "a b c d => x").maxWords).toBe(4);
	});
});

describe("compileQualifierTable", () => {
	it("is empty for the base locale, leaving English names untouched", () => {
		expect(compileQualifierTable("en").forms.size).toBe(0);
	});

	it("carries the locale's size and preparation words", () => {
		const qualifiers = compileQualifierTable("pt-PT").forms;
		expect(qualifiers.has("picada")).toBe(true);
		expect(qualifiers.has("media")).toBe(true);
		expect(qualifiers.has("qb")).toBe(true);
	});


	it("does not treat variety words as qualifiers", () => {
		const qualifiers = compileQualifierTable("pt-PT").forms;
		for (const variety of ["roxa", "preta", "branco", "integral", "doce", "frances"]) {
			expect(qualifiers.has(variety)).toBe(false);
		}
	});
});

describe("compileVocabulary", () => {
	it("bundles the unit and qualifier tables", () => {
		const vocabulary = compileVocabulary("pt-PT", "");
		expect(vocabulary.units.forms.size).toBeGreaterThan(0);
		expect(vocabulary.qualifiers.forms.size).toBeGreaterThan(0);
	});
});
