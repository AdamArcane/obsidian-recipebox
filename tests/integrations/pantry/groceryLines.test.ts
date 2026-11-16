import { describe, expect, it } from "vitest";
import { insertItem, removeByKey, scanGroceryNote, setCheckedByKey } from "../../../src/integrations/pantry/groceryLines";

// Stand-in for the real ingredient key: lowercase text minus a leading quantity.
const keyOf = (t: string): string | null => t.replace(/^[\d/. ]+(cups? )?/i, "").toLowerCase() || null;

const NOTE = ["# Grocery List", "", "## Dairy", "- [ ] milk", "- [x] 2 cups butter", "", "## Produce", "- [ ] apples", ""].join("\n");

describe("scanGroceryNote", () => {
	it("reads text, state, category and line index", () => {
		const items = scanGroceryNote(NOTE, keyOf);
		expect(items.map((i) => [i.key, i.checked, i.category, i.lineIndex])).toEqual([
			["milk", false, "Dairy", 3],
			["butter", true, "Dairy", 4],
			["apples", false, "Produce", 7],
		]);
		expect(items[1].text).toBe("2 cups butter");
	});
	it("accepts X and skips later duplicate keys", () => {
		const items = scanGroceryNote("## A\n- [X] milk\n- [ ] 3 milk", keyOf);
		expect(items).toHaveLength(1);
		expect(items[0].checked).toBe(true);
	});
	it("ignores lines that are not checkboxes", () => {
		expect(scanGroceryNote("## A\n- plain\nnotes %% here", keyOf)).toEqual([]);
	});
});

describe("edits", () => {
	it("setCheckedByKey changes only the checkbox", () => {
		expect(setCheckedByKey(NOTE, "butter", false, keyOf)).toContain("- [ ] 2 cups butter");
		expect(setCheckedByKey(NOTE, "milk", true, keyOf)).toContain("- [x] milk");
	});
	it("returns null when the key is gone", () => {
		expect(setCheckedByKey(NOTE, "eggs", true, keyOf)).toBeNull();
		expect(removeByKey(NOTE, "eggs", keyOf)).toBeNull();
	});
	it("removeByKey drops the line and keeps the heading", () => {
		const out = removeByKey("## A\n- [ ] milk\n", "milk", keyOf) ?? "";
		expect(out).toContain("## A");
		expect(out).not.toContain("milk");
	});
	it("insertItem goes under a matching heading, case insensitive", () => {
		const out = insertItem(NOTE, "cheese", false, " dairy ");
		const lines = out.split("\n");
		expect(lines.indexOf("- [ ] cheese")).toBe(5);
		expect(lines[6]).toBe("");
	});
	it("insertItem creates a missing heading at the end", () => {
		const out = insertItem(NOTE, "bread", true, "Bakery");
		expect(out.trimEnd().endsWith("## Bakery\n- [x] bread")).toBe(true);
	});
	it("insertItem appends plainly when the note has no headings", () => {
		expect(insertItem("- [ ] milk\n", "eggs", false, "Other")).toBe("- [ ] milk\n- [ ] eggs\n");
	});
});
