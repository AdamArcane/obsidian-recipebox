import { describe, it, expect } from "vitest";
import { isHighGi } from "../../src/parser/glycemic-match";
import type { CompiledPattern } from "../../src/parser/glycemic-dictionary";

function pattern(re: RegExp, source: string): CompiledPattern {
	return { pattern: re, source };
}

describe("isHighGi", () => {
	it("returns true when a pattern matches the name", () => {
		const patterns: CompiledPattern[] = [pattern(/white bread/i, "white bread")];
		expect(isHighGi("White Bread", patterns)).toBe(true);
	});

	it("returns false when no pattern matches", () => {
		const patterns: CompiledPattern[] = [pattern(/white bread/i, "white bread")];
		expect(isHighGi("brown rice", patterns)).toBe(false);
	});

	it("returns false for an empty pattern list", () => {
		expect(isHighGi("white bread", [])).toBe(false);
	});

	it("checks every pattern, not just the first", () => {
		const patterns: CompiledPattern[] = [
			pattern(/potato/i, "potato"),
			pattern(/white bread/i, "white bread"),
		];
		expect(isHighGi("slice of white bread", patterns)).toBe(true);
	});
});
