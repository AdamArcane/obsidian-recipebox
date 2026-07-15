import { describe, it, expect } from "vitest";
import { compileGiDictionary, DEFAULT_GI_DICTIONARY } from "../../src/parser/glycemic-dictionary";

describe("compileGiDictionary", () => {
	it("compiles one pattern per non-comment, non-blank line", () => {
		const { patterns, errors } = compileGiDictionary("white bread\n# a comment\n\nbagel");
		expect(patterns.map((p) => p.source)).toEqual(["white bread", "bagel"]);
		expect(errors).toEqual([]);
	});

	it("compiles patterns case-insensitively", () => {
		const { patterns } = compileGiDictionary("white bread");
		expect(patterns[0].pattern.test("White Bread")).toBe(true);
	});

	it("supports regex syntax like word boundaries", () => {
		const { patterns } = compileGiDictionary("\\bsugar\\b");
		expect(patterns[0].pattern.test("sugar")).toBe(true);
		expect(patterns[0].pattern.test("sugary")).toBe(false);
	});

	it("collects an error for an invalid regex pattern instead of throwing", () => {
		const { patterns, errors } = compileGiDictionary("valid line\n[unclosed");
		expect(patterns).toHaveLength(1);
		expect(errors).toEqual(["Invalid pattern: [unclosed"]);
	});

	it("compiles the shipped default dictionary without errors", () => {
		const { errors } = compileGiDictionary(DEFAULT_GI_DICTIONARY);
		expect(errors).toEqual([]);
	});
});
