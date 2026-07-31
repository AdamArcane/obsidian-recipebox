import { ENGLISH_UNITS } from "../../src/parser/unit-table";
import { describe, it, expect } from "vitest";
import { parseGroceryNoteText } from "../../src/grocery/grocery-note/parse";

describe("parseGroceryNoteText", () => {
	it("groups checkbox lines under their preceding ## category heading", () => {
		const text = "## Produce\n- [ ] 2 cups flour\n- [x] 1 apple";
		const sections = parseGroceryNoteText(text, ENGLISH_UNITS);
		expect(sections).toHaveLength(1);
		expect(sections[0].category).toBe("Produce");
		expect(sections[0].lines).toHaveLength(2);
	});

	it("parses an unchecked item line into a structured GroceryLine", () => {
		const sections = parseGroceryNoteText("## Baking\n- [ ] 2 cups flour", ENGLISH_UNITS);
		expect(sections[0].lines[0]).toMatchObject({
			kind: "item",
			name: "flour",
			unit: "cup",
			quantity: 2,
			checked: false,
		});
	});

	it("parses a checked item line, case-insensitive checkbox marker", () => {
		const sections = parseGroceryNoteText("## Baking\n- [X] 1 egg", ENGLISH_UNITS);
		expect(sections[0].lines[0]).toMatchObject({ checked: true, name: "egg" });
	});

	it("ignores lines before the first category heading", () => {
		const sections = parseGroceryNoteText("# Grocery List\n\n## Baking\n- [ ] flour", ENGLISH_UNITS);
		expect(sections).toHaveLength(1);
		expect(sections[0].lines).toHaveLength(1);
	});

	it("treats a non-checkbox line within a section as opaque", () => {
		const sections = parseGroceryNoteText("## Baking\nSome free-form note.", ENGLISH_UNITS);
		expect(sections[0].lines[0]).toMatchObject({ kind: "opaque", raw: "Some free-form note." });
	});

	it("treats a checkbox line that fails to parse as an ingredient as opaque", () => {
		const sections = parseGroceryNoteText("## Baking\n- [ ] ", ENGLISH_UNITS);
		expect(sections[0].lines[0].kind).toBe("opaque");
	});

	it("assigns each parsed item a dedup key from name+unit", () => {
		const sections = parseGroceryNoteText("## Baking\n- [ ] 2 cups flour", ENGLISH_UNITS);
		expect(sections[0].lines[0].key).toBe("flour|cup");
	});

	it("supports multiple category sections", () => {
		const text = "## Produce\n- [ ] apple\n## Baking\n- [ ] flour";
		const sections = parseGroceryNoteText(text, ENGLISH_UNITS);
		expect(sections.map((s) => s.category)).toEqual(["Produce", "Baking"]);
	});
});
