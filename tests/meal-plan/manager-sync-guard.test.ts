import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ moment: () => ({ format: () => "" }), getLanguage: () => "en", Events: class { trigger() {} on() {} }, Notice: class {} }));

const { syncMealPlanNote } = vi.hoisted(() => ({ syncMealPlanNote: vi.fn(async () => false) }));
vi.mock("../../src/meal-plan/meal-plan-note-sync", () => ({ syncMealPlanNote }));

import { GroceryManager } from "../../src/grocery/manager";

describe("GroceryManager.syncFromMealPlanNote", () => {
	it("does not read the note while one of our own meal plan edits is mid-write", async () => {
		const manager = new GroceryManager({} as never, { getSettings: () => ({}) as never, save: async () => {} });
		let finish!: () => void;
		const edit = (manager as unknown as { mutatingMealPlan: (fn: () => Promise<void>) => Promise<void> })
			.mutatingMealPlan(() => new Promise<void>((resolve) => { finish = resolve; }));

		await manager.syncFromMealPlanNote();
		expect(syncMealPlanNote).not.toHaveBeenCalled();

		finish();
		await edit;
		await manager.syncFromMealPlanNote();
		expect(syncMealPlanNote).toHaveBeenCalledTimes(1);
	});
});
