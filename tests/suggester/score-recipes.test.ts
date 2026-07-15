import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({
	getAllTags: (cache: { tags?: { tag: string }[] } | null) =>
		cache?.tags ? cache.tags.map((t) => t.tag) : null,
}));

import { computePoolRanges, scoreCandidate, extractTagsFromCache } from "../../src/suggester/score-recipes";
import type { CandidateMeta } from "../../src/suggester/score-recipes";
import type { ScoringRule } from "../../src/suggester/strategy-types";
import type { FieldType } from "../../src/discovery/filter-types";
import type { CachedMetadata } from "obsidian";

function candidate(frontmatter: Record<string, unknown>, tags: string[] = []): CandidateMeta {
	return { frontmatter, tags };
}

describe("computePoolRanges", () => {
	it("computes min/max across candidates for a numeric field used in a rule", () => {
		const candidates = [candidate({ calories: 100 }), candidate({ calories: 500 }), candidate({ calories: 300 })];
		const rules: ScoringRule[] = [{ field: "calories", direction: "favor-high" }];
		const fieldTypes: Record<string, FieldType> = { calories: "number" };
		expect(computePoolRanges(candidates, rules, fieldTypes)).toEqual({ calories: { min: 100, max: 500 } });
	});

	it("skips string and boolean fields (not normalized by range)", () => {
		const candidates = [candidate({ cuisine: "italian" })];
		const rules: ScoringRule[] = [{ field: "cuisine", direction: "favor-high" }];
		const fieldTypes: Record<string, FieldType> = { cuisine: "string" };
		expect(computePoolRanges(candidates, rules, fieldTypes)).toEqual({});
	});

	it("defaults to a 0-0 range when no candidate has a usable value", () => {
		const candidates = [candidate({})];
		const rules: ScoringRule[] = [{ field: "calories", direction: "favor-high" }];
		const fieldTypes: Record<string, FieldType> = { calories: "number" };
		expect(computePoolRanges(candidates, rules, fieldTypes)).toEqual({ calories: { min: 0, max: 0 } });
	});
});

describe("scoreCandidate", () => {
	it("returns 0 when there are no rules", () => {
		expect(scoreCandidate(candidate({}), [], {}, {})).toBe(0);
	});

	it("scores the highest value in the pool as 1.0 for favor-high", () => {
		const rules: ScoringRule[] = [{ field: "calories", direction: "favor-high" }];
		const fieldTypes: Record<string, FieldType> = { calories: "number" };
		const poolRanges = { calories: { min: 100, max: 500 } };
		expect(scoreCandidate(candidate({ calories: 500 }), rules, fieldTypes, poolRanges)).toBe(1);
		expect(scoreCandidate(candidate({ calories: 100 }), rules, fieldTypes, poolRanges)).toBe(0);
	});

	it("inverts the score for favor-low", () => {
		const rules: ScoringRule[] = [{ field: "calories", direction: "favor-low" }];
		const fieldTypes: Record<string, FieldType> = { calories: "number" };
		const poolRanges = { calories: { min: 100, max: 500 } };
		expect(scoreCandidate(candidate({ calories: 500 }), rules, fieldTypes, poolRanges)).toBe(0);
		expect(scoreCandidate(candidate({ calories: 100 }), rules, fieldTypes, poolRanges)).toBe(1);
	});

	it("scores favor-none as 1 when the field is absent and 0 when present", () => {
		const rules: ScoringRule[] = [{ field: "lastMade", direction: "favor-none" }];
		expect(scoreCandidate(candidate({}), rules, {}, {})).toBe(1);
		expect(scoreCandidate(candidate({ lastMade: "2024-01-01" }), rules, { lastMade: "date" }, {})).toBe(0);
	});

	it("scores a missing value as neutral (0.5) for favor-high/favor-low", () => {
		const rules: ScoringRule[] = [{ field: "calories", direction: "favor-high" }];
		const fieldTypes: Record<string, FieldType> = { calories: "number" };
		const poolRanges = { calories: { min: 100, max: 500 } };
		expect(scoreCandidate(candidate({}), rules, fieldTypes, poolRanges)).toBe(0.5);
	});

	it("weights earlier rules more heavily than later ones", () => {
		const rules: ScoringRule[] = [
			{ field: "calories", direction: "favor-high" },
			{ field: "protein", direction: "favor-high" },
		];
		const fieldTypes: Record<string, FieldType> = { calories: "number", protein: "number" };
		const poolRanges = {
			calories: { min: 0, max: 100 },
			protein: { min: 0, max: 100 },
		};
		// First rule maxed, second at zero: weighted (1*2 + 0*1) / 3 = 0.666...
		const score = scoreCandidate(candidate({ calories: 100, protein: 0 }), rules, fieldTypes, poolRanges);
		expect(score).toBeCloseTo(2 / 3, 5);
	});
});

describe("extractTagsFromCache", () => {
	it("returns tags without their leading '#'", () => {
		const cache = { tags: [{ tag: "#vegan" }, { tag: "#quick" }] } as unknown as CachedMetadata;
		expect(extractTagsFromCache(cache)).toEqual(["vegan", "quick"]);
	});

	it("returns an empty array for a null cache", () => {
		expect(extractTagsFromCache(null)).toEqual([]);
	});
});
