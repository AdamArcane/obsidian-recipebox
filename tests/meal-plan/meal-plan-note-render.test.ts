import { describe, it, expect } from "vitest";
import { dayRank, renderMealPlanLine, insertMealPlanEntryIntoText, writeMealPlanNote } from "../../src/meal-plan/meal-plan-note/render";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { MealPlanEntry } from "../../src/types";
import type { MealPlanSection } from "../../src/meal-plan/meal-plan-note/parse";

function entry(overrides: Partial<MealPlanEntry> = {}): MealPlanEntry {
	return { id: "1", recipePath: "Pasta.md", addedDate: "2024-01-01", contributions: {}, ...overrides };
}

describe("dayRank", () => {
	it("ranks weekdays in Monday-Sunday order", () => {
		expect(dayRank("Monday")).toBeLessThan(dayRank("Tuesday"));
		expect(dayRank("Saturday")).toBeLessThan(dayRank("Sunday"));
	});

	it("ranks queue/unscheduled labels first (rank 0)", () => {
		expect(dayRank(undefined)).toBe(0);
		expect(dayRank("Queue")).toBe(0);
		expect(dayRank("Meal Plan Queue")).toBe(0);
		expect(dayRank("Unscheduled")).toBe(0);
	});

	it("ranks an unrecognized day label after all weekdays", () => {
		expect(dayRank("Someday")).toBeGreaterThan(dayRank("Sunday"));
	});
});

describe("renderMealPlanLine", () => {
	it("renders a recipe entry as a wikilink checkbox line", () => {
		expect(renderMealPlanLine(entry(), "Pasta", DEFAULT_SETTINGS)).toBe("- [ ] [[Pasta]]");
	});

	it("renders a custom (no recipePath) entry using its label", () => {
		const e = entry({ recipePath: "", label: "Leftover Pizza" });
		expect(renderMealPlanLine(e, "Pasta", DEFAULT_SETTINGS)).toBe("- [ ] Leftover Pizza");
	});

	it("appends the #leftovers tag when isLeftovers is set", () => {
		const e = entry({ isLeftovers: true });
		expect(renderMealPlanLine(e, "Pasta", DEFAULT_SETTINGS)).toBe("- [ ] [[Pasta]] #leftovers");
	});

	it("formats the meal type suffix per the configured notation", () => {
		const e = entry({ meal: "Dinner" });
		const tag = { ...DEFAULT_SETTINGS, mealTypeNotation: "tag" as const, mealTypeFieldName: "meal" };
		expect(renderMealPlanLine(e, "Pasta", tag)).toBe("- [ ] [[Pasta]] #meal/dinner");

		const dataview = { ...DEFAULT_SETTINGS, mealTypeNotation: "dataview" as const, mealTypeFieldName: "meal" };
		expect(renderMealPlanLine(e, "Pasta", dataview)).toBe("- [ ] [[Pasta]] [meal:: Dinner]");

		const text = { ...DEFAULT_SETTINGS, mealTypeNotation: "text" as const };
		expect(renderMealPlanLine(e, "Pasta", text)).toBe("- [ ] [[Pasta]] (Dinner)");
	});
});

describe("insertMealPlanEntryIntoText", () => {
	it("inserts a new line into an existing day section", () => {
		const noteText = "# Meal Plan\n\n## Monday\n- [ ] [[Pasta]]\n";
		const e = entry({ recipePath: "Salad.md", day: "Monday" });
		const result = insertMealPlanEntryIntoText(noteText, e, "Salad", DEFAULT_SETTINGS);
		expect(result).toContain("- [ ] [[Salad]]");
		expect(result.indexOf("## Monday")).toBeLessThan(result.indexOf("[[Salad]]"));
	});

	it("creates a new day section in day-rank order when the day doesn't exist yet", () => {
		const noteText = "# Meal Plan\n\n## Monday\n- [ ] [[Pasta]]\n\n## Wednesday\n- [ ] [[Soup]]\n";
		const e = entry({ recipePath: "Salad.md", day: "Tuesday" });
		const result = insertMealPlanEntryIntoText(noteText, e, "Salad", DEFAULT_SETTINGS);
		const mondayIdx = result.indexOf("## Monday");
		const tuesdayIdx = result.indexOf("## Tuesday");
		const wednesdayIdx = result.indexOf("## Wednesday");
		expect(mondayIdx).toBeLessThan(tuesdayIdx);
		expect(tuesdayIdx).toBeLessThan(wednesdayIdx);
	});

	it("inserts a queue entry without creating a '## Meal Plan Queue' heading", () => {
		const noteText = "# Meal Plan\n";
		const e = entry({ recipePath: "Salad.md", day: undefined });
		const result = insertMealPlanEntryIntoText(noteText, e, "Salad", DEFAULT_SETTINGS);
		expect(result).not.toContain("## Meal Plan Queue");
		expect(result).toContain("- [ ] [[Salad]]");
	});
});

describe("writeMealPlanNote", () => {
	function section(header: string | undefined, raws: string[]): MealPlanSection {
		return { header, lines: raws.map((raw) => ({ kind: "raw" as const, wikilink: "", day: undefined, mealType: undefined, checked: false, raw })) };
	}

	it("writes new entries grouped and ordered by day", () => {
		const entries = [entry({ recipePath: "Soup.md", day: "Wednesday" }), entry({ recipePath: "Pasta.md", day: "Monday" })];
		const result = writeMealPlanNote([], entries, (p) => p.replace(".md", ""), DEFAULT_SETTINGS);
		const mondayIdx = result.indexOf("## Monday");
		const wednesdayIdx = result.indexOf("## Wednesday");
		expect(mondayIdx).toBeGreaterThan(-1);
		expect(mondayIdx).toBeLessThan(wednesdayIdx);
	});

	it("excludes leftovers-only entries (empty recipePath) from the rendered note", () => {
		const entries = [entry({ recipePath: "", label: "Leftovers", day: "Monday" })];
		const result = writeMealPlanNote([], entries, (p) => p, DEFAULT_SETTINGS);
		expect(result).not.toContain("Leftovers");
	});

	it("preserves raw non-entry lines from the existing section", () => {
		const sections = [section("Monday", ["Some note to keep."])];
		const result = writeMealPlanNote(sections, [], (p) => p, DEFAULT_SETTINGS);
		expect(result).toContain("Some note to keep.");
	});

	it("omits a day section entirely when it has no new entries and no preserved content", () => {
		const sections = [section("Monday", [""])];
		const result = writeMealPlanNote(sections, [], (p) => p, DEFAULT_SETTINGS);
		expect(result).not.toContain("## Monday");
	});

	it("always starts with the '# Meal Plan' title", () => {
		const result = writeMealPlanNote([], [], (p) => p, DEFAULT_SETTINGS);
		expect(result.startsWith("# Meal Plan")).toBe(true);
	});
});
