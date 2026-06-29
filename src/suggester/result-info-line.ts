/**
 * Builds the secondary info tokens shown beneath each recipe title in the
 * suggester results list: active mode's scoring-field values (in rule order,
 * capped at 3) followed by prep/cook times when set.
 */
import { RecipeBoxSettings } from "../settings/settings-types";
import { SuggesterMode } from "./strategy-types";
import { RECIPE_FRONTMATTER } from "../settings/frontmatter-keys";
import { daysSince } from "../utils/date-distance";
import { formatMinutes } from "../parser/recipe-meta-read";
import { findValue } from "../parser/frontmatter-lookup";
import { ALIASES } from "../parser/recipe-meta-aliases";

const MAX_RULE_TOKENS = 3;

/** Formats a single scoring-rule field value as a readable token. */
function ruleToken(
	field: string,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
): string | null {
	const lastMadeKey = settings.lastMadeProperty;

	// lastMade: date-distance display
	if (field === lastMadeKey || field === "lastMade") {
		const raw = fm[lastMadeKey] ?? fm["lastMade"];
		if (!raw || typeof raw !== "string") return "Never made";
		const days = daysSince(raw);
		if (days === null) return "Never made";
		if (days === 0) return "Made today";
		if (days === 1) return "Made yesterday";
		return `Last made ${days}d ago`;
	}

	// favorite: only show when true — omit when false to avoid clutter
	if (field === RECIPE_FRONTMATTER.favorite) {
		const val = fm[field];
		return val === true || val === "true" ? "Favorited" : null;
	}

	// cookedCount: show as "Made N times"
	if (field === RECIPE_FRONTMATTER.cookedCount) {
		const raw = fm[field];
		const n = typeof raw === "number" ? raw : null;
		if (n === null || n === 0) return "Never cooked";
		return `Made ${n}x`;
	}

	// Generic field: render the raw value as a string if present
	const val = fm[field];
	if (val === undefined || val === null || val === "") return null;
	if (typeof val !== "string" && typeof val !== "number" && typeof val !== "boolean") return null;
	return `${field}: ${val}`;
}

/** Returns tokens for prep and cook times, omitting each if unset. */
function timingTokens(fm: Record<string, unknown>): string[] {
	const tokens: string[] = [];
	const prep = findValue(fm, ALIASES.prepTime);
	if (typeof prep === "number" && prep > 0) tokens.push(`Prep ${formatMinutes(prep)}`);
	const cook = findValue(fm, ALIASES.cookTime);
	if (typeof cook === "number" && cook > 0) tokens.push(`Cook ${formatMinutes(cook)}`);
	return tokens;
}

/**
 * Returns the list of info tokens for one recipe row. Empty if there is
 * nothing meaningful to show. Caller joins with " · ".
 */
export function buildInfoTokens(
	fm: Record<string, unknown>,
	mode: SuggesterMode,
	settings: RecipeBoxSettings,
): string[] {
	const tokens: string[] = [];

	for (const rule of mode.rules.slice(0, MAX_RULE_TOKENS)) {
		const t = ruleToken(rule.field, fm, settings);
		if (t !== null) tokens.push(t);
	}

	tokens.push(...timingTokens(fm));
	return tokens;
}
