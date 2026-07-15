import { describe, it, expect } from "vitest";
import { matchesFilters } from "../../src/discovery/filter-evaluate";
import type { FieldFilter } from "../../src/suggester/strategy-types";

describe("matchesFilters", () => {
	it("matches an empty filter set unconditionally", () => {
		expect(matchesFilters({}, [], [])).toBe(true);
	});

	it("ANDs multiple filters together", () => {
		const filters: FieldFilter[] = [
			{ field: "servings", operator: "gt", value: 2 },
			{ field: "servings", operator: "lt", value: 10 },
		];
		expect(matchesFilters({ servings: 4 }, [], filters)).toBe(true);
		expect(matchesFilters({ servings: 1 }, [], filters)).toBe(false);
	});

	it("evaluates tag pseudo-fields against the tag list, not frontmatter", () => {
		const has: FieldFilter[] = [{ field: "#vegan", operator: "has", value: null }];
		expect(matchesFilters({}, ["vegan"], has)).toBe(true);
		expect(matchesFilters({}, ["vegetarian"], has)).toBe(false);

		const notHas: FieldFilter[] = [{ field: "#vegan", operator: "not-has", value: null }];
		expect(matchesFilters({}, ["vegetarian"], notHas)).toBe(true);
	});

	it("fails any filter when the field is missing, except not-within-last", () => {
		const eqFilter: FieldFilter[] = [{ field: "cuisine", operator: "eq", value: "italian" }];
		expect(matchesFilters({}, [], eqFilter)).toBe(false);

		const notWithinLast: FieldFilter[] = [
			{ field: "lastMade", operator: "not-within-last", value: 7 },
		];
		expect(matchesFilters({}, [], notWithinLast)).toBe(true);
	});

	it("matches string equality case-insensitively and strips wikilinks", () => {
		const filters: FieldFilter[] = [{ field: "cuisine", operator: "eq", value: "italian" }];
		expect(matchesFilters({ cuisine: "[[Italian]]" }, [], filters)).toBe(true);
		expect(matchesFilters({ cuisine: "ITALIAN" }, [], filters)).toBe(true);
		expect(matchesFilters({ cuisine: "french" }, [], filters)).toBe(false);
	});

	it("matches array-valued fields when any element satisfies the operator", () => {
		const filters: FieldFilter[] = [{ field: "cuisine", operator: "eq", value: "french" }];
		expect(matchesFilters({ cuisine: ["Italian", "French"] }, [], filters)).toBe(true);
		expect(matchesFilters({ cuisine: ["Italian", "Spanish"] }, [], filters)).toBe(false);
	});

	it("matches 'contains' for substrings, case-insensitively", () => {
		const filters: FieldFilter[] = [{ field: "title", operator: "contains", value: "pasta" }];
		expect(matchesFilters({ title: "Creamy Pasta Bake" }, [], filters)).toBe(true);
		expect(matchesFilters({ title: "Rice Bowl" }, [], filters)).toBe(false);
	});

	it("matches 'one-of' against a set of options, case-insensitively", () => {
		const filters: FieldFilter[] = [
			{ field: "cuisine", operator: "one-of", value: ["italian", "french"] },
		];
		expect(matchesFilters({ cuisine: "French" }, [], filters)).toBe(true);
		expect(matchesFilters({ cuisine: "Thai" }, [], filters)).toBe(false);
	});

	it("matches 'between' for numeric ranges", () => {
		const filters: FieldFilter[] = [{ field: "calories", operator: "between", value: [100, 500] }];
		expect(matchesFilters({ calories: 300 }, [], filters)).toBe(true);
		expect(matchesFilters({ calories: 50 }, [], filters)).toBe(false);
	});

	it("matches boolean is-true/is-false", () => {
		expect(
			matchesFilters({ favorite: true }, [], [{ field: "favorite", operator: "is-true", value: null }]),
		).toBe(true);
		expect(
			matchesFilters({ favorite: false }, [], [{ field: "favorite", operator: "is-false", value: null }]),
		).toBe(true);
	});

	it("matches 'within-last' for a recent date and rejects an old one", () => {
		const recent = new Date();
		recent.setDate(recent.getDate() - 1);
		const old = new Date();
		old.setDate(old.getDate() - 30);

		const filters: FieldFilter[] = [{ field: "lastMade", operator: "within-last", value: 7 }];
		expect(matchesFilters({ lastMade: recent.toISOString() }, [], filters)).toBe(true);
		expect(matchesFilters({ lastMade: old.toISOString() }, [], filters)).toBe(false);
	});
});
