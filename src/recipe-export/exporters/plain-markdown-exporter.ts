/**
 * Renders RecipeExportData as human-readable plain Markdown: no YAML
 * frontmatter, a prose summary line in place of the on-screen badge row,
 * Obsidian-only syntax stripped so the file reads cleanly outside the vault.
 * Not meant to round-trip -- see recipe-export-spec's Importable Markdown
 * sub-format for that.
 */
import { RecipeExportData, RecipeExportOptions } from "../recipe-export-data";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { stripObsidianMarkdown } from "../obsidian-markdown-strip";
import { buildBadgeSummaryLine } from "./badge-summary-text";

export function exportPlainMarkdown(
	data: RecipeExportData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
	options: RecipeExportOptions,
): string {
	const lines: string[] = [`# ${data.title}`, ""];

	// includeImages off (the default) strips local vault images entirely, per spec,
	// since the export is a single .md file with no bundling in this build.
	// External URLs don't depend on the vault, so they're kept either way.
	if (data.image?.kind === "url") {
		lines.push(`![${data.title}](${data.image.url})`, "");
	} else if (data.image?.kind === "vault" && options.includeImages) {
		lines.push("*(image omitted -- image bundling not yet supported)*", "");
	}

	const summary = buildBadgeSummaryLine(data, frontmatter, settings);
	const allergensLine = data.meta.allergens.length > 0 ? `Contains: ${data.meta.allergens.join(", ")}` : null;
	if (summary) lines.push(`*${summary}*`);
	if (allergensLine) lines.push(`*${allergensLine}*`);
	if (summary || allergensLine) lines.push("");

	const intro = stripObsidianMarkdown(data.introContent).trim();
	if (intro) lines.push(intro, "");

	lines.push(`## ${settings.ingredientsHeading}`, "");
	for (const group of data.ingredientGroups) {
		if (group.lines.length === 0) continue;
		if (group.heading) lines.push(`### ${group.heading}`, "");
		for (const line of group.lines) lines.push(stripObsidianMarkdown(line));
		lines.push("");
	}

	lines.push(`## ${settings.instructionsHeading}`, "");
	for (const group of data.instructionGroups) {
		if (group.heading) lines.push(`${"#".repeat(Math.max(group.headingLevel, 3))} ${group.heading}`, "");
		group.steps.forEach((step, i) => lines.push(`${i + 1}. ${stripObsidianMarkdown(step)}`));
		lines.push("");
	}

	for (const section of data.trailingSections) {
		const body = stripObsidianMarkdown(section.body).trim();
		if (!body) continue;
		lines.push(`## ${section.heading}`, "", body, "");
	}

	return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
