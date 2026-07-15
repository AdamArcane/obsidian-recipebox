import { describe, it, expect, vi } from "vitest";
import { isGroupCollapsed, setGroupCollapsed, autoCollapseGroups } from "../../src/grocery/group-collapse";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { RecipeBoxSettings } from "../../src/settings/settings-types";
import type { GroceryItem } from "../../src/types";

function freshSettings(overrides: Partial<RecipeBoxSettings> = {}): RecipeBoxSettings {
	return {
		...DEFAULT_SETTINGS,
		state: { ...DEFAULT_SETTINGS.state, collapsedSections: {} },
		...overrides,
	};
}

function item(overrides: Partial<GroceryItem> = {}): GroceryItem {
	return { key: "x", name: "x", unit: "", quantity: null, category: "Other", sources: [], checked: false, ...overrides };
}

describe("isGroupCollapsed", () => {
	it("returns false when the group has no recorded state", () => {
		expect(isGroupCollapsed(freshSettings(), "Produce")).toBe(false);
	});

	it("returns true when the group is recorded as collapsed", () => {
		const settings = freshSettings({ state: { ...DEFAULT_SETTINGS.state, collapsedSections: { Produce: true } } });
		expect(isGroupCollapsed(settings, "Produce")).toBe(true);
	});
});

describe("setGroupCollapsed", () => {
	it("records a group as collapsed and saves", async () => {
		const settings = freshSettings();
		const save = vi.fn().mockResolvedValue(undefined);
		await setGroupCollapsed(settings, save, "Produce", true);
		expect(settings.state.collapsedSections.Produce).toBe(true);
		expect(save).toHaveBeenCalledOnce();
	});

	it("removes the key entirely when un-collapsing", async () => {
		const settings = freshSettings({ state: { ...DEFAULT_SETTINGS.state, collapsedSections: { Produce: true } } });
		const save = vi.fn().mockResolvedValue(undefined);
		await setGroupCollapsed(settings, save, "Produce", false);
		expect(settings.state.collapsedSections).not.toHaveProperty("Produce");
		expect(save).toHaveBeenCalledOnce();
	});

	it("does not call save when the state is already what was requested", async () => {
		const settings = freshSettings();
		const save = vi.fn().mockResolvedValue(undefined);
		await setGroupCollapsed(settings, save, "Produce", false);
		expect(save).not.toHaveBeenCalled();
	});
});

describe("autoCollapseGroups", () => {
	it("does nothing when the auto-collapse setting is off", async () => {
		const settings = freshSettings({ autoCollapseCompletedSections: false });
		const save = vi.fn().mockResolvedValue(undefined);
		const items = [item({ key: "a", category: "Produce", checked: true })];
		await autoCollapseGroups(items, "a", settings, save);
		expect(save).not.toHaveBeenCalled();
	});

	it("collapses a category group once every item in it is checked", async () => {
		const settings = freshSettings({ autoCollapseCompletedSections: true, groupingMode: "category" });
		const save = vi.fn().mockResolvedValue(undefined);
		const items = [
			item({ key: "a", category: "Produce", checked: true }),
			item({ key: "b", category: "Produce", checked: true }),
		];
		await autoCollapseGroups(items, "a", settings, save);
		expect(settings.state.collapsedSections.Produce).toBe(true);
		expect(save).toHaveBeenCalledOnce();
	});

	it("does not collapse when some items in the group are still unchecked", async () => {
		const settings = freshSettings({ autoCollapseCompletedSections: true, groupingMode: "category" });
		const save = vi.fn().mockResolvedValue(undefined);
		const items = [
			item({ key: "a", category: "Produce", checked: true }),
			item({ key: "b", category: "Produce", checked: false }),
		];
		await autoCollapseGroups(items, "a", settings, save);
		expect(settings.state.collapsedSections.Produce).toBeUndefined();
		expect(save).not.toHaveBeenCalled();
	});

	it("skips a group that is already collapsed", async () => {
		const settings = freshSettings({
			autoCollapseCompletedSections: true,
			groupingMode: "category",
			state: { ...DEFAULT_SETTINGS.state, collapsedSections: { Produce: true } },
		});
		const save = vi.fn().mockResolvedValue(undefined);
		const items = [item({ key: "a", category: "Produce", checked: true })];
		await autoCollapseGroups(items, "a", settings, save);
		expect(save).not.toHaveBeenCalled();
	});

	it("groups by source label when groupingMode is 'recipe'", async () => {
		const settings = freshSettings({ autoCollapseCompletedSections: true, groupingMode: "recipe" });
		const save = vi.fn().mockResolvedValue(undefined);
		const items = [
			item({ key: "a", sources: [{ kind: "recipe", label: "Pasta" }], checked: true }),
		];
		await autoCollapseGroups(items, "a", settings, save);
		expect(settings.state.collapsedSections.Pasta).toBe(true);
	});
});
