import { describe, it, expect } from "vitest";
import { recordContributions, unrecordContributions, severScheduleLinks } from "../../src/grocery/contribution-history";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { RecipeBoxSettings } from "../../src/settings/settings-types";
import type { ContributionMap, GroceryContributionSource } from "../../src/types";

function freshSettings(): RecipeBoxSettings {
	return {
		...DEFAULT_SETTINGS,
		state: { ...DEFAULT_SETTINGS.state, groceryContributions: {} },
	};
}

describe("recordContributions", () => {
	it("adds a new contribution record under its key", () => {
		const settings = freshSettings();
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 2 } };
		const source: GroceryContributionSource = { kind: "recipe", path: "Pasta.md" };
		recordContributions(contributions, source, settings);
		expect(settings.state.groceryContributions["flour|cup"]).toEqual([{ source, quantity: 2 }]);
	});

	it("does not double-record from the same recipe source", () => {
		const settings = freshSettings();
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 2 } };
		const source: GroceryContributionSource = { kind: "recipe", path: "Pasta.md" };
		recordContributions(contributions, source, settings);
		recordContributions(contributions, source, settings);
		expect(settings.state.groceryContributions["flour|cup"]).toHaveLength(1);
	});

	it("distinguishes recipe sources by path", () => {
		const settings = freshSettings();
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 2 } };
		recordContributions(contributions, { kind: "recipe", path: "Pasta.md" }, settings);
		recordContributions(contributions, { kind: "recipe", path: "Bread.md" }, settings);
		expect(settings.state.groceryContributions["flour|cup"]).toHaveLength(2);
	});
});

describe("unrecordContributions", () => {
	it("removes a matching contribution record", () => {
		const settings = freshSettings();
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 2 } };
		const source: GroceryContributionSource = { kind: "recipe", path: "Pasta.md" };
		recordContributions(contributions, source, settings);
		unrecordContributions(contributions, source, settings);
		expect(settings.state.groceryContributions["flour|cup"]).toBeUndefined();
	});

	it("does nothing when the key has no history", () => {
		const settings = freshSettings();
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 2 } };
		expect(() => unrecordContributions(contributions, { kind: "manual" }, settings)).not.toThrow();
	});
});

describe("severScheduleLinks", () => {
	it("strips day/mealType from recipe sources matching the given path", () => {
		const settings = freshSettings();
		settings.state.groceryContributions["flour|cup"] = [
			{ source: { kind: "recipe", path: "Pasta.md", day: "Monday", mealType: "dinner" }, quantity: 2 },
		];
		severScheduleLinks("Pasta.md", settings);
		expect(settings.state.groceryContributions["flour|cup"][0].source).toEqual({ kind: "recipe", path: "Pasta.md" });
	});

	it("leaves records for other recipe paths untouched", () => {
		const settings = freshSettings();
		const other: GroceryContributionSource = { kind: "recipe", path: "Bread.md", day: "Tuesday" };
		settings.state.groceryContributions["flour|cup"] = [{ source: other, quantity: 1 }];
		severScheduleLinks("Pasta.md", settings);
		expect(settings.state.groceryContributions["flour|cup"][0].source).toEqual(other);
	});

	it("leaves manual sources untouched", () => {
		const settings = freshSettings();
		settings.state.groceryContributions["flour|cup"] = [{ source: { kind: "manual" }, quantity: 1 }];
		severScheduleLinks("Pasta.md", settings);
		expect(settings.state.groceryContributions["flour|cup"][0].source).toEqual({ kind: "manual" });
	});
});
