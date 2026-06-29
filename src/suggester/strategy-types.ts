/**
 * Types for the meal suggester's named mode system: scoring rules and
 * the mode container that holds filters + rules together.
 * Lives in the suggester module to keep core types.ts free of discovery imports.
 */
import type { FieldFilter } from "../types";

/**
 * Direction for a scoring rule.
 * - "favor-high": higher field values score better (e.g. cookedCount, favorite=true).
 * - "favor-low": lower field values score better (e.g. recipes made a long time ago).
 * - "favor-none": absence of the field scores best; any present value scores worst.
 * Weight is derived automatically from position in the rules list (first rule gets
 * the highest weight), so users control relative importance by reordering, not numbers.
 */
export type ScoringDirection = "favor-high" | "favor-low" | "favor-none";

/** A single scoring signal in the meal suggester ranking formula. */
export interface ScoringRule {
	/** Frontmatter key or "#tagname" pseudo-field to score by. */
	field: string;
	direction: ScoringDirection;
}

/**
 * A named, independently-editable set of pre-filters and scoring rules.
 * Built-in modes ship with sensible defaults and can be edited but not deleted.
 */
export interface SuggesterMode {
	id: string;
	name: string;
	filters: FieldFilter[];
	rules: ScoringRule[];
	isBuiltin: boolean;
	/** Only one mode may have isDefault=true at a time (radio-button semantics). */
	isDefault: boolean;
}
