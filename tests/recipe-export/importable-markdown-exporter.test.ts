import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({
	stringifyYaml: (obj: Record<string, unknown>) =>
		Object.entries(obj)
			.map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
			.join("\n"),
}));

import { exportImportableMarkdown } from "../../src/recipe-export/exporters/importable-markdown-exporter";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { RECIPE_FRONTMATTER } from "../../src/settings/frontmatter-keys";
import { makeExportData, DEFAULT_EXPORT_OPTIONS } from "./fixtures";

describe("exportImportableMarkdown", () => {
	it("wraps a YAML frontmatter block with the canonical recipe type", () => {
		const md = exportImportableMarkdown(makeExportData(), {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(md.startsWith("---\n")).toBe(true);
		expect(md).toContain(`${RECIPE_FRONTMATTER.type}: "${DEFAULT_SETTINGS.recipeType}"`);
	});

	it("always uses the canonical Ingredients/Instructions headings, ignoring configured heading settings", () => {
		const settings = { ...DEFAULT_SETTINGS, ingredientsHeading: "Stuff You Need", instructionsHeading: "Steps" };
		const md = exportImportableMarkdown(makeExportData(), {}, settings, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain("## Ingredients");
		expect(md).toContain("## Instructions");
		expect(md).not.toContain("Stuff You Need");
		expect(md).not.toContain("## Steps");
	});

	it("writes servings and time fields into frontmatter when present", () => {
		const data = makeExportData({ servings: 4, meta: { diet: [], allergens: [], times: { prep: 10, cook: 20, total: 30 }, favorite: false, cookedCount: 0, lastMade: null } });
		const md = exportImportableMarkdown(data, {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain(`${RECIPE_FRONTMATTER.servings}: 4`);
		expect(md).toContain(`${RECIPE_FRONTMATTER.prepTime}: 10`);
		expect(md).toContain(`${RECIPE_FRONTMATTER.cookTime}: 20`);
		expect(md).toContain(`${RECIPE_FRONTMATTER.totalTime}: 30`);
	});

	it("strips Obsidian markdown from ingredient and instruction lines", () => {
		const data = makeExportData({
			ingredientGroups: [{ heading: null, lines: ["1 cup [[Flour]]"] }],
		});
		const md = exportImportableMarkdown(data, {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain("1 cup Flour");
		expect(md).not.toContain("[[");
	});

	it("ends with exactly one trailing newline", () => {
		const md = exportImportableMarkdown(makeExportData(), {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(md.endsWith("\n")).toBe(true);
		expect(md.endsWith("\n\n")).toBe(false);
	});
});
