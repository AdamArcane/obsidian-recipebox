import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({
	getAllTags: () => [],
	setIcon: () => {},
}));

import { buildBadgeSummaryLine } from "../../src/recipe-export/exporters/badge-summary-text";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { makeExportData } from "./fixtures";
import type { CustomBadge } from "../../src/types";

function badge(overrides: Partial<CustomBadge> = {}): CustomBadge {
	return {
		type: "badge",
		property: "",
		label: "",
		color: "default",
		valueType: "auto",
		splitArray: false,
		enabled: true,
		builtin: false,
		...overrides,
	};
}

describe("buildBadgeSummaryLine", () => {
	it("leads with 'Serves N' when servings is set", () => {
		const line = buildBadgeSummaryLine(makeExportData({ servings: 4 }), {}, { ...DEFAULT_SETTINGS, headerBadges: [] });
		expect(line).toBe("Serves 4");
	});

	it("formats a fractional servings count without trailing zeros", () => {
		const line = buildBadgeSummaryLine(makeExportData({ servings: 4.5 }), {}, { ...DEFAULT_SETTINGS, headerBadges: [] });
		expect(line).toBe("Serves 4.5");
	});

	it("omits servings entirely when null", () => {
		const line = buildBadgeSummaryLine(makeExportData({ servings: null }), {}, { ...DEFAULT_SETTINGS, headerBadges: [] });
		expect(line).toBe("");
	});

	it("skips disabled badges and separator/newline pseudo-badges", () => {
		const settings = {
			...DEFAULT_SETTINGS,
			headerBadges: [
				badge({ property: "cuisine", label: "Cuisine", enabled: false }),
				badge({ type: "separator" }),
			],
		};
		const line = buildBadgeSummaryLine(makeExportData({ servings: null }), { cuisine: "italian" }, settings);
		expect(line).toBe("");
	});

	it("includes an enabled property badge's resolved value with its label", () => {
		const settings = {
			...DEFAULT_SETTINGS,
			headerBadges: [badge({ property: "cuisine", label: "Cuisine" })],
		};
		const line = buildBadgeSummaryLine(makeExportData({ servings: null }), { cuisine: "italian" }, settings);
		expect(line).toBe("Cuisine italian");
	});

	it("appends nutrition entries after servings and badges", () => {
		const data = makeExportData({ servings: 2, nutrition: { Calories: "300", Protein: "20g" } });
		const line = buildBadgeSummaryLine(data, {}, { ...DEFAULT_SETTINGS, headerBadges: [] });
		expect(line).toBe("Serves 2 · 300 Calories · 20g Protein");
	});
});
