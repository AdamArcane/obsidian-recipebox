/**
 * Normalization and scoring logic for the meal suggester.
 * Weights are positional (first rule = highest weight), not user-entered.
 * Scoring uses pool min/max normalization per field; higher normalized value
 * always means "higher field value" before the direction flip.
 */
import { getAllTags, CachedMetadata } from "obsidian";
import type { ScoringRule } from "./strategy-types";
import { FieldType } from "../discovery/filter-types";
import { stripWikilink } from "../utils/wikilink-strip";

export interface CandidateMeta {
	frontmatter: Record<string, unknown>;
	tags: string[];
}

/** Per-field min/max range for normalization across the candidate pool. */
export interface FieldRange {
	min: number;
	max: number;
}

/**
 * Extracts the numeric value for a scoring rule's field, converting dates
 * to "days since today" so they sit on the same numeric scale as number fields.
 * Arrays use the first usable element; wikilink syntax is stripped from strings.
 */
function numericValue(candidate: CandidateMeta, field: string, type: FieldType): number | null {
	let raw: unknown = candidate.frontmatter[field];
	if (raw === null || raw === undefined) return null;

	// For arrays, use the first element — scoring a single representative value
	// is more useful than trying to aggregate across multiple values.
	if (Array.isArray(raw)) raw = raw[0] ?? null;
	if (raw === null || raw === undefined) return null;

	// Strip [[wikilink]] syntax so date/string values stored as links resolve correctly.
	if (typeof raw === "string") raw = stripWikilink(raw);

	if (type === "boolean") return raw === true ? 1 : 0;
	if (type === "number") return typeof raw === "number" ? raw : null;
	if (type === "date") {
		const d = typeof raw === "string" ? new Date(raw) : null;
		if (!d || isNaN(d.getTime())) return null;
		return (Date.now() - d.getTime()) / 86400000; // days since
	}
	// String: flat 1.0 when present (no meaningful ordering)
	return 1;
}

/**
 * Computes pool-level min/max ranges per field, used for normalization.
 * Only computed for fields that appear in the rules and have numeric/date types.
 */
export function computePoolRanges(
	candidates: CandidateMeta[],
	rules: ScoringRule[],
	fieldTypes: Record<string, FieldType>,
): Record<string, FieldRange> {
	const ranges: Record<string, FieldRange> = {};

	for (const rule of rules) {
		if (ranges[rule.field]) continue; // already computed for this field
		const type = fieldTypes[rule.field] ?? "string";
		if (type !== "number" && type !== "date") continue;

		let min = Infinity;
		let max = -Infinity;
		for (const c of candidates) {
			const val = numericValue(c, rule.field, type);
			if (val === null) continue;
			if (val < min) min = val;
			if (val > max) max = val;
		}
		ranges[rule.field] = {
			min: isFinite(min) ? min : 0,
			max: isFinite(max) ? max : 0,
		};
	}

	return ranges;
}

/**
 * Returns the composite score for a single candidate (0-1, higher = better match).
 * Weights are positional: rule at index 0 receives weight N, index 1 receives N-1, etc.
 * Missing values score 0.5 (neutral) so their rule's weight still contributes, but
 * doesn't push the recipe in either direction.
 */
export function scoreCandidate(
	candidate: CandidateMeta,
	rules: ScoringRule[],
	fieldTypes: Record<string, FieldType>,
	poolRanges: Record<string, FieldRange>,
): number {
	if (rules.length === 0) return 0;

	const n = rules.length;
	let weightedSum = 0;
	let totalWeight = 0;

	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		const weight = n - i; // first rule = highest weight
		const type = fieldTypes[rule.field] ?? "string";
		const val = numericValue(candidate, rule.field, type);

		// "favor-none" scores absence as 1.0 and any present value as 0.0,
		// which is different from "favor-low" (which still rewards lower values
		// over higher ones but treats presence as better than absence).
		if (rule.direction === "favor-none") {
			weightedSum += (val === null ? 1 : 0) * weight;
			totalWeight += weight;
			continue;
		}

		let normalized: number;
		if (val === null) {
			// Missing: neutral so absence doesn't actively hurt or help
			normalized = 0.5;
		} else if (type === "boolean" || type === "string") {
			normalized = val; // already 0 or 1
		} else {
			const range = poolRanges[rule.field];
			if (!range || range.max === range.min) {
				normalized = 0.5;
			} else {
				normalized = (val - range.min) / (range.max - range.min);
			}
		}

		const effective = rule.direction === "favor-low" ? 1 - normalized : normalized;
		weightedSum += effective * weight;
		totalWeight += weight;
	}

	return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/** Extracts all tags from an Obsidian cache entry (no leading "#"). */
export function extractTagsFromCache(cache: CachedMetadata | null): string[] {
	if (!cache) return [];
	return (getAllTags(cache) ?? []).map(t => t.slice(1));
}
