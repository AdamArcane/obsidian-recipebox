/**
 * Builds the prose summary line used by Plain Markdown export in place of
 * the on-screen badge row: same badges, same order, same resolved values as
 * renderBadgeRow(), joined as "·"-separated text instead of rendered as DOM
 * chips. Servings and nutrition are folded in unconditionally, since they're
 * baseline info a recipe display always wants even if the user hasn't
 * separately configured badges for them.
 */
import { RecipeBoxSettings } from "../../settings/settings-types";
import { RecipeExportData } from "../recipe-export-data";
import { resolveBadgeValues } from "../../ui/recipe-view/badges";

// Matches meta-banner.ts's on-screen "Serves" cell formatting, since a scaled
// servings count (base servings * multiplier) can land on an ugly decimal.
function formatServings(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function buildBadgeSummaryLine(
	data: RecipeExportData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
): string {
	const parts: string[] = [];

	if (data.servings !== null) parts.push(`Serves ${formatServings(data.servings)}`);

	for (const badge of settings.headerBadges) {
		if (!badge.enabled) continue;
		if ((badge.type ?? "badge") !== "badge") continue; // separators/newlines don't translate to prose
		if (!badge.formula && !badge.property) continue;

		for (const value of resolveBadgeValues(badge, frontmatter, settings)) {
			const label = !badge.hideLabel && badge.label ? `${badge.label} ` : "";
			const combined = `${label}${badge.prefix ?? ""}${value}${badge.suffix ?? ""}`.trim();
			if (combined) parts.push(combined);
		}
	}

	for (const [label, value] of Object.entries(data.nutrition)) {
		parts.push(`${value} ${label}`);
	}

	return parts.join(" · ");
}
