import { describe, it, expect, vi } from "vitest";
import { isDayAvailable, scheduleRecipes, SCHEDULE_DAYS } from "../../src/meal-plan/schedule-recipes";
import type { MealPlanEntry } from "../../src/types";

function entry(overrides: Partial<MealPlanEntry> = {}): MealPlanEntry {
	return { id: "1", recipePath: "x.md", addedDate: "", contributions: {}, ...overrides };
}

describe("isDayAvailable", () => {
	it("'skip-occupied': available only when the day has no entries", () => {
		expect(isDayAvailable("Monday", undefined, "skip-occupied", [])).toBe(true);
		expect(isDayAvailable("Monday", undefined, "skip-occupied", [entry({ day: "Monday" })])).toBe(false);
	});

	it("'one-per-meal-type': available when no entry on that day already has the meal type", () => {
		const plan = [entry({ day: "Monday", meal: "Dinner" })];
		expect(isDayAvailable("Monday", "Lunch", "one-per-meal-type", plan)).toBe(true);
		expect(isDayAvailable("Monday", "Dinner", "one-per-meal-type", plan)).toBe(false);
	});

	it("'one-per-meal-type' with no mealType falls back to skip-occupied semantics", () => {
		const plan = [entry({ day: "Monday" })];
		expect(isDayAvailable("Monday", undefined, "one-per-meal-type", plan)).toBe(false);
	});

	it("'stack-freely' is always available regardless of occupancy", () => {
		const plan = [entry({ day: "Monday" }), entry({ day: "Monday" })];
		expect(isDayAvailable("Monday", undefined, "stack-freely", plan)).toBe(true);
	});
});

describe("scheduleRecipes", () => {
	it("places recipes on the first available day under 'skip-occupied'", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		await scheduleRecipes(["Pasta.md"], [], { addMealPlanEntry, setMealType }, {
			mealType: undefined,
			fillMode: "skip-occupied",
			overflowToQueue: false,
		});
		expect(addMealPlanEntry).toHaveBeenCalledWith("Pasta.md", "Monday");
	});

	it("skips already-occupied days and moves to the next one", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		const initialPlan = [entry({ day: "Monday" })];
		await scheduleRecipes(["Pasta.md"], initialPlan, { addMealPlanEntry, setMealType }, {
			mealType: undefined,
			fillMode: "skip-occupied",
			overflowToQueue: false,
		});
		expect(addMealPlanEntry).toHaveBeenCalledWith("Pasta.md", "Tuesday");
	});

	it("routes straight to the queue for 'queue-only', ignoring day placement", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		await scheduleRecipes(["Pasta.md"], [], { addMealPlanEntry, setMealType }, {
			mealType: "Dinner",
			fillMode: "queue-only",
			overflowToQueue: false,
		});
		expect(addMealPlanEntry).toHaveBeenCalledWith("Pasta.md", undefined);
		expect(setMealType).toHaveBeenCalledWith("id1", "Dinner");
	});

	it("cycles days in order for 'stack-freely' across multiple recipes", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		await scheduleRecipes(["A.md", "B.md", "C.md"], [], { addMealPlanEntry, setMealType }, {
			mealType: undefined,
			fillMode: "stack-freely",
			overflowToQueue: false,
		});
		expect(addMealPlanEntry).toHaveBeenNthCalledWith(1, "A.md", "Monday");
		expect(addMealPlanEntry).toHaveBeenNthCalledWith(2, "B.md", "Tuesday");
		expect(addMealPlanEntry).toHaveBeenNthCalledWith(3, "C.md", "Wednesday");
	});

	it("wraps stack-freely placement back to Monday after a full week", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		const recipes = Array.from({ length: SCHEDULE_DAYS.length + 1 }, (_, i) => `R${i}.md`);
		await scheduleRecipes(recipes, [], { addMealPlanEntry, setMealType }, {
			mealType: undefined,
			fillMode: "stack-freely",
			overflowToQueue: false,
		});
		expect(addMealPlanEntry).toHaveBeenNthCalledWith(1, "R0.md", "Monday");
		expect(addMealPlanEntry).toHaveBeenNthCalledWith(8, `R${SCHEDULE_DAYS.length}.md`, "Monday");
	});

	it("sends overflow to the queue when overflowToQueue is true and every day is occupied", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		const fullPlan = SCHEDULE_DAYS.map((day) => entry({ day }));
		await scheduleRecipes(["Overflow.md"], fullPlan, { addMealPlanEntry, setMealType }, {
			mealType: undefined,
			fillMode: "skip-occupied",
			overflowToQueue: true,
		});
		expect(addMealPlanEntry).toHaveBeenCalledWith("Overflow.md", undefined);
	});

	it("silently skips a recipe when every day is occupied and overflow is disabled", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		const fullPlan = SCHEDULE_DAYS.map((day) => entry({ day }));
		await scheduleRecipes(["Overflow.md"], fullPlan, { addMealPlanEntry, setMealType }, {
			mealType: undefined,
			fillMode: "skip-occupied",
			overflowToQueue: false,
		});
		expect(addMealPlanEntry).not.toHaveBeenCalled();
	});

	it("accounts for recipes placed earlier in the same batch when picking the next day", async () => {
		const addMealPlanEntry = vi.fn().mockResolvedValue("id1");
		const setMealType = vi.fn().mockResolvedValue(undefined);
		await scheduleRecipes(["A.md", "B.md"], [], { addMealPlanEntry, setMealType }, {
			mealType: undefined,
			fillMode: "skip-occupied",
			overflowToQueue: false,
		});
		expect(addMealPlanEntry).toHaveBeenNthCalledWith(1, "A.md", "Monday");
		expect(addMealPlanEntry).toHaveBeenNthCalledWith(2, "B.md", "Tuesday");
	});
});
