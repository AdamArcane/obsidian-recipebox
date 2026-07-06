/**
 * Parses the meal plan note Markdown into a structured list of sections and
 * entry lines, extracting recipe wikilinks, day headings, and meal-type suffixes.
 */
import { deslugifyMealType } from "../../utils/text-case";

export interface MealPlanLine {
	kind: "entry" | "raw";
	wikilink: string;
	label?: string;       // set for custom meal lines (no wikilink), undefined for recipe lines
	isLeftovers?: boolean;
	day: string | undefined;
	mealType: string | undefined;
	checked: boolean;
	raw: string;
}

export interface MealPlanSection {
	header: string | undefined;
	lines: MealPlanLine[];
}

// Matches recipe lines: - [ ] [[Target|Alias]] ...
// Group 1: checkbox char, Group 2: wikilink target, Group 3: suffix
const RECIPE_LINE_RE = /^[-*+]\s+(?:\[([x ])\]\s+)?\[\[([^\]|]+)(?:\|[^\]]+)?\]\](.*)?$/i;

// Matches custom meal lines (no wikilink): - [ ] Grilled Cheese #meal/lunch
// Group 1: checkbox char, Group 2: meal name, Group 3: trailing tags/suffix
const CUSTOM_LINE_RE = /^[-*+]\s+(?:\[([x ])\]\s+)?([^[].+?)\s*(#\S.*)?$/i;

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

		const recipeMatch = raw.match(RECIPE_LINE_RE);
		if (recipeMatch) {
			const recipeSuffix = recipeMatch[3] ?? "";
			const recipeIsLeftovers = /#leftovers\b/i.test(recipeSuffix);
			const recipeMealSuffix = recipeSuffix.replace(/#leftovers\b/gi, "").trim();
			current.lines.push({
				kind: "entry",
				wikilink: recipeMatch[2].trim(),
				isLeftovers: recipeIsLeftovers || undefined,
				day: current.header,
				mealType: extractMealType(recipeMealSuffix, fieldName),
				checked: recipeMatch[1]?.toLowerCase() === "x",
				raw,
			});
			continue;
		}

		const customMatch = raw.match(CUSTOM_LINE_RE);
		if (customMatch) {
			const suffix = customMatch[3] ?? "";
			const isLeftovers = /#leftovers\b/i.test(suffix);
			// Strip #leftovers from the suffix before extracting meal type so it
			// doesn't get misinterpreted as an unknown field value.
			const mealSuffix = suffix.replace(/#leftovers\b/gi, "").trim();
			current.lines.push({
				kind: "entry",
				wikilink: "",
				label: customMatch[2].trim(),
				isLeftovers: isLeftovers || undefined,
				day: current.header,
				mealType: extractMealType(mealSuffix, fieldName),
				checked: customMatch[1]?.toLowerCase() === "x",
				raw,
			});
			continue;
		}

		current.lines.push({ kind: "raw", wikilink: "", day: undefined, mealType: undefined, checked: false, raw });
	}

	sections.push(current);
	return sections;
}
