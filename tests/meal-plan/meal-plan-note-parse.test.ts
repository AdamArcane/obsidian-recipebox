import { describe, it, expect } from "vitest";
import { parseMealPlanNote } from "../../src/meal-plan/meal-plan-note/parse";

describe("parseMealPlanNote", () => {
	it("groups entries under day headings", () => {
		const body = "## Monday\n- [ ] [[Pasta]]";
		const sections = parseMealPlanNote(body);
		expect(sections).toHaveLength(2); // leading default section + Monday
		expect(sections[1].header).toBe("Monday");
		expect(sections[1].lines[0]).toMatchObject({ kind: "entry", wikilink: "Pasta", day: "Monday" });
	});

	it("renames an 'Unscheduled' heading to 'Meal Plan Queue'", () => {
		const body = "## Unscheduled\n- [ ] [[Pasta]]";
		const sections = parseMealPlanNote(body);
		expect(sections[1].header).toBe("Meal Plan Queue");
	});

	it("parses checked/unchecked recipe entries", () => {
		const body = "## Monday\n- [x] [[Pasta]]\n- [ ] [[Salad]]";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0].checked).toBe(true);
		expect(sections[1].lines[1].checked).toBe(false);
	});

	it("strips a wikilink alias, keeping only the target", () => {
		const body = "## Monday\n- [ ] [[Recipes/Pasta|Pasta Night]]";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0].wikilink).toBe("Recipes/Pasta");
	});

	it("parses a custom (non-wikilink) meal entry with a label", () => {
		const body = "## Monday\n- [ ] Leftover Pizza";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0]).toMatchObject({ kind: "entry", wikilink: "", label: "Leftover Pizza" });
	});

	it("detects the #leftovers tag and strips it from the meal-type suffix", () => {
		const body = "## Monday\n- [ ] [[Pasta]] #leftovers";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0].isLeftovers).toBe(true);
	});

	it("extracts a meal type from a #meal/slug tag", () => {
		const body = "## Monday\n- [ ] [[Pasta]] #meal/dinner";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0].mealType).toBe("Dinner");
	});

	it("extracts a meal type from a dataview inline field", () => {
		const body = "## Monday\n- [ ] [[Pasta]] [meal:: Dinner]";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0].mealType).toBe("Dinner");
	});

	it("extracts a meal type from a trailing parenthetical", () => {
		const body = "## Monday\n- [ ] [[Pasta]] (Dinner)";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0].mealType).toBe("Dinner");
	});

	it("extracts a legacy em-dash-suffixed meal type", () => {
		const body = "## Monday\n- [ ] [[Pasta]] — Dinner";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0].mealType).toBe("Dinner");
	});

	it("respects a custom mealTypeFieldName for tag/dataview extraction", () => {
		const body = "## Monday\n- [ ] [[Pasta]] #course/dinner";
		const sections = parseMealPlanNote(body, "course");
		expect(sections[1].lines[0].mealType).toBe("Dinner");
	});

	it("treats an unrecognized line as raw/opaque", () => {
		const body = "## Monday\nSome free-form note.";
		const sections = parseMealPlanNote(body);
		expect(sections[1].lines[0]).toMatchObject({ kind: "raw", raw: "Some free-form note." });
	});
});
