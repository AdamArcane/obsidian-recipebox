import { describe, expect, it } from "vitest";
import { reconcileSlots } from "../../src/meal-plan/meal-plan-slot-reconcile";
import { MealPlanEntry } from "../../src/types";

const entry = (id: string, day?: string, meal?: string): MealPlanEntry =>
	({ id, recipePath: "Soup.md", day, meal, addedDate: "2026-11-01", contributions: {} });

describe("reconcileSlots", () => {
	it("leaves matching entries alone, ignoring case", () => {
		const e = entry("a", "Monday", "dinner");
		expect(reconcileSlots([e], [{ day: "monday", mealType: "Dinner" }])).toBe(false);
		expect(e).toMatchObject({ day: "Monday", meal: "dinner" });
	});

	it("moves a single entry to the day written in the note", () => {
		const e = entry("a", "Monday", "Dinner");
		expect(reconcileSlots([e], [{ day: "Wednesday", mealType: "Dinner" }])).toBe(true);
		expect(e.day).toBe("Wednesday");
	});

	it("applies a meal type change", () => {
		const e = entry("a", "Monday", "Lunch");
		expect(reconcileSlots([e], [{ day: "Monday", mealType: "Dinner" }])).toBe(true);
		expect(e.meal).toBe("Dinner");
	});

	it("clears the meal type when the note drops it", () => {
		const e = entry("a", "Monday", "Lunch");
		reconcileSlots([e], [{ day: "Monday", mealType: undefined }]);
		expect(e.meal).toBeUndefined();
	});

	it("stores the queue as no day", () => {
		const e = entry("a", "Monday");
		reconcileSlots([e], [{ day: "Meal Plan Queue", mealType: undefined }]);
		expect(e.day).toBeUndefined();
		const q = entry("b");
		expect(reconcileSlots([q], [{ day: undefined, mealType: undefined }])).toBe(false);
	});

	it("a recipe on several days keeps unchanged entries and moves only the changed one", () => {
		const mon = entry("mon", "Monday");
		const wed = entry("wed", "Wednesday");
		expect(reconcileSlots([mon, wed], [{ day: "Wednesday", mealType: undefined }, { day: "Friday", mealType: undefined }])).toBe(true);
		expect(mon.day).toBe("Friday");
		expect(wed.day).toBe("Wednesday");
	});

	it("does not guess when counts differ", () => {
		const a = entry("a", "Monday");
		const b = entry("b", "Tuesday");
		expect(reconcileSlots([a, b], [{ day: "Friday", mealType: undefined }])).toBe(false);
		expect([a.day, b.day]).toEqual(["Monday", "Tuesday"]);
	});
});
