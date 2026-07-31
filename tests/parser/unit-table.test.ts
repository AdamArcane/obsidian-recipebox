import { describe, it, expect } from "vitest";
import { compileUnitTable, normaliseUnitForm, ENGLISH_UNITS } from "../../src/parser/unit-table";

describe("normaliseUnitForm", () => {
	it("lowercases, strips accents and periods, and collapses whitespace", () => {
		expect(normaliseUnitForm("C. Sopa")).toBe("c sopa");
		expect(normaliseUnitForm("c.  sopa")).toBe("c sopa");
		expect(normaliseUnitForm("chávena")).toBe("chavena");
	});
});

describe("compileUnitTable", () => {
	it("falls back to the English vocabulary for an unknown locale", () => {
		const table = compileUnitTable("kl-KL", "");
		expect(table.forms.get("tbsp")).toBe("tbsp");
		expect(table.forms.get("cups")).toBe("cup");
	});

	it("adds locale forms on top of English", () => {
		const table = compileUnitTable("pt-PT", "");
		expect(table.forms.get("colher de sopa")).toBe("c. sopa");
		expect(table.forms.get("gr")).toBe("g");
		// shared metric units still resolve through the English base
		expect(table.forms.get("kg")).toBe("kg");
	});

	it("lets a locale suppress a conflicting English form", () => {
		expect(ENGLISH_UNITS.forms.get("c")).toBe("cup");
		expect(compileUnitTable("pt-PT", "").forms.has("c")).toBe(false);
	});

	it("gives user aliases precedence over both locale and English", () => {
		const table = compileUnitTable("pt-PT", "colher de sopa => tbsp\ncups => mug");
		expect(table.forms.get("colher de sopa")).toBe("tbsp");
		expect(table.forms.get("cups")).toBe("mug");
	});

	it("reports the longest form in words so the matcher knows its lookahead", () => {
		expect(compileUnitTable("pt-PT", "").maxWords).toBeGreaterThanOrEqual(3);
		expect(compileUnitTable("pt-PT", "a b c d => x").maxWords).toBe(4);
	});
});
