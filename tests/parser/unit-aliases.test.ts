import { describe, it, expect } from "vitest";
import { compileUnitAliases, DEFAULT_UNIT_ALIASES } from "../../src/parser/unit-aliases";

describe("compileUnitAliases", () => {
	it("parses alias/unit pairs and ignores comments and blank lines", () => {
		const { forms, errors } = compileUnitAliases("# a comment\n\nsaqueta => saqueta\nc. sopa => tbsp\n");
		expect(forms).toEqual({ saqueta: "saqueta", "c. sopa": "tbsp" });
		expect(errors).toEqual([]);
	});

	it("keeps an empty unit, which consumes the alias without contributing a unit", () => {
		const { forms, errors } = compileUnitAliases("pitada =>");
		expect(forms).toEqual({ pitada: "" });
		expect(errors).toEqual([]);
	});

	it("reports lines missing a separator or an alias", () => {
		const { forms, errors } = compileUnitAliases("saqueta\n=> tbsp");
		expect(forms).toEqual({});
		expect(errors).toEqual(["saqueta", "=> tbsp"]);
	});

	it("ships a default that is comments only, so nothing is aliased out of the box", () => {
		const { forms, errors } = compileUnitAliases(DEFAULT_UNIT_ALIASES);
		expect(forms).toEqual({});
		expect(errors).toEqual([]);
	});
});
