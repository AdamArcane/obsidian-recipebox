import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ moment: () => ({ format: () => "" }), getLanguage: () => "en" }));

import { syncMealPlanNote } from "../../src/meal-plan/meal-plan-note-sync";
import { MealPlanEntry } from "../../src/types";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { RecipeBoxSettings } from "../../src/settings/settings-types";

// A vault with one meal plan note. Wikilinks resolve to "<name>.md".
function setup(noteText: string, entries: MealPlanEntry[]) {
	const settings = structuredClone(DEFAULT_SETTINGS) as RecipeBoxSettings;
	settings.mealPlanPath = "Meal Plan.md";
	settings.autoAddOnSync = false;
	settings.state.mealPlan = entries;
	const file = { path: "Meal Plan.md" };
	const app = {
		vault: {
			getFileByPath: (p: string) => (p === "Meal Plan.md" ? file : null),
			read: async () => noteText,
		},
		metadataCache: { getFirstLinkpathDest: (name: string) => ({ path: `${name}.md` }) },
	};
	const sink = { getSettings: () => settings, save: vi.fn(async () => {}) };
	return { app, sink, settings };
}

const entry = (id: string, recipePath: string, day?: string, meal?: string): MealPlanEntry =>
	({ id, recipePath, day, meal, addedDate: "2026-11-01", contributions: {} });

describe("syncMealPlanNote: reading changes made elsewhere", () => {
	it("moves an entry whose day changed in the note", async () => {
		const { app, sink, settings } = setup("# Meal Plan\n\n## Friday\n- [ ] [[Soup]]\n", [entry("a", "Soup.md", "Monday")]);
		const changed = await syncMealPlanNote(app as never, sink);
		expect(changed).toBe(true);
		expect(settings.state.mealPlan[0].day).toBe("Friday");
		expect(sink.save).toHaveBeenCalledTimes(1);
	});

	it("applies a changed meal type", async () => {
		const { app, sink, settings } = setup("## Monday\n- [ ] [[Soup]] #meal/dinner\n", [entry("a", "Soup.md", "Monday", "Lunch")]);
		await syncMealPlanNote(app as never, sink);
		expect(settings.state.mealPlan[0].meal).toBe("Dinner");
	});

	it("reports no change when the note already matches", async () => {
		const { app, sink } = setup("## Monday\n- [ ] [[Soup]] #meal/dinner\n", [entry("a", "Soup.md", "Monday", "Dinner")]);
		expect(await syncMealPlanNote(app as never, sink)).toBe(false);
		expect(sink.save).not.toHaveBeenCalled();
	});

	it("still adds and removes entries as before", async () => {
		const { app, sink, settings } = setup("## Monday\n- [ ] [[Pasta]]\n", [entry("a", "Soup.md", "Monday")]);
		await syncMealPlanNote(app as never, sink);
		expect(settings.state.mealPlan.map((e) => e.recipePath)).toEqual(["Pasta.md"]);
	});

	it("updates the meal type of a custom meal", async () => {
		const custom: MealPlanEntry = { id: "c", recipePath: "", label: "Pizza night", day: "Friday", meal: "Lunch", addedDate: "2026-11-01", contributions: {} };
		const { app, sink, settings } = setup("## Friday\n- [ ] Pizza night #meal/dinner\n", [custom]);
		await syncMealPlanNote(app as never, sink);
		expect(settings.state.mealPlan[0].meal).toBe("Dinner");
	});
});
