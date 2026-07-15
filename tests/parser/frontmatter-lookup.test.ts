import { describe, it, expect } from "vitest";
import { findValue } from "../../src/parser/frontmatter-lookup";

describe("findValue", () => {
	it("returns the value for an exact key match", () => {
		expect(findValue({ servings: 4 }, ["servings"])).toBe(4);
	});

	it("matches case-insensitively", () => {
		expect(findValue({ Servings: 4 }, ["servings"])).toBe(4);
	});

	it("returns the first matching candidate key in order", () => {
		expect(findValue({ yield: 2, servings: 4 }, ["servings", "yield"])).toBe(4);
		expect(findValue({ yield: 2 }, ["servings", "yield"])).toBe(2);
	});

	it("skips candidates whose value is null or undefined", () => {
		expect(findValue({ servings: null, yield: 4 }, ["servings", "yield"])).toBe(4);
		expect(findValue({ servings: undefined, yield: 4 }, ["servings", "yield"])).toBe(4);
	});

	it("returns undefined when no candidate key is present", () => {
		expect(findValue({ foo: 1 }, ["bar", "baz"])).toBeUndefined();
	});

	it("returns falsy-but-defined values like 0, false, and empty string", () => {
		expect(findValue({ servings: 0 }, ["servings"])).toBe(0);
		expect(findValue({ favorite: false }, ["favorite"])).toBe(false);
		expect(findValue({ note: "" }, ["note"])).toBe("");
	});
});
