/**
 * Parses the meal plan note Markdown into a structured list of sections and
 * entry lines, extracting recipe wikilinks, day headings, and meal-type suffixes.
 */
import { deslugifyMealType } from "../../utils/text-case";

export interface MealPlanLine {
	kind: "entry" | "raw";
	wikilink: string;
	day: string | undefined;
	mealType: string | undefined;
	checked: boolean;
	raw: string;
}

export interface MealPlanSection {
	header: string | undefined;
	lines: MealPlanLine[];
}

// Matches both formats:
//   - [ ] [[Target|Alias]]   (plugin-written, with checkbox)
//   - [[Target|Alias]]       (manually written, no checkbox)
// Group 1: checkbox char (x / space), undefined when absent
// Group 2: wikilink target
// Group 3: everything after the wikilink (for meal-type suffix extraction)
const RECIPE_LINE_RE = /^[-*+]\s+(?:\[([x ])\]\s+)?\[\[([^\]|]+)(?:\|[^\]]+)?\]\](.*)?$/i;

function extractMealType(suffix: string, fieldName: string): string | undefined {
	const trimmed = suffix.trim();
	if (!trimmed) return undefined;

	// Try #fieldName/slug tag
	const tagRe = new RegExp(`#${escapeRegex(fieldName)}/([\\w-]+)`, "i");
	const tagMatch = trimmed.match(tagRe);
	if (tagMatch) return deslugifyMealType(tagMatch[1]);

	// Try [fieldName:: value] dataview field
	const dvRe = new RegExp(`\\[${escapeRegex(fieldName)}::\\s*([^\\]]+)\\]`, "i");
	const dvMatch = trimmed.match(dvRe);
	if (dvMatch) return dvMatch[1].trim() || undefined;

	// Try (value) parenthetical
	const parenMatch = trimmed.match(/\(([^)]+)\)\s*$/);
	if (parenMatch) return parenMatch[1].trim() || undefined;

	// Legacy em-dash suffix — keep recognizing so old notes don't lose their meal type
	const dashMatch = trimmed.match(/^[—–-]\s*(.+)$/);
	if (dashMatch) return dashMatch[1].trim() || undefined;

	return undefined;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseMealPlanNote(body: string, fieldName = "meal"): MealPlanSection[] {
	const sections: MealPlanSection[] = [];
	let current: MealPlanSection = { header: undefined, lines: [] };

	for (const raw of body.split("\n")) {
		if (raw.startsWith("## ")) {
			sections.push(current);
			const heading = raw.slice(3).trim();
			current = { header: heading.toLowerCase() === "unscheduled" ? "Meal Plan Queue" : heading, lines: [] };
			continue;
		}

		const m = raw.match(RECIPE_LINE_RE);
		if (m) {
			current.lines.push({
				kind: "entry",
				wikilink: m[2].trim(),
				day: current.header,
				mealType: extractMealType(m[3] ?? "", fieldName),
				checked: m[1]?.toLowerCase() === "x",
				raw,
			});
		} else {
			current.lines.push({ kind: "raw", wikilink: "", day: undefined, mealType: undefined, checked: false, raw });
		}
	}

	sections.push(current);
	return sections;
}
