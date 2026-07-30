import { describe, it, expect } from "vitest";
import { buildInfoTokens } from "../../src/suggester/result-info-line";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { localDateISO } from "../../src/utils/date";
import type { SuggesterMode } from "../../src/suggester/strategy-types";

function mode(rules: SuggesterMode["rules"]): SuggesterMode {
	return { id: "m", name: "Mode", filters: [], rules, isBuiltin: false, isDefault: false };
}

describe("buildInfoTokens", () => {
	it("renders a 'Never made' token for lastMade when absent", () => {
		const tokens = buildInfoTokens({}, mode([{ field: "lastMade", direction: "favor-low" }]), DEFAULT_SETTINGS);
		expect(tokens).toContain("Never made");
	});

	// lastMade holds a local calendar date, the same way mark-cooked writes it, so
	// these build their fixtures with localDateISO. toISOString would resolve to the
	// UTC day and drift by one either side of midnight.
	it("renders 'Made today'/'Made yesterday' for recent lastMade dates", () => {
		const tokens = buildInfoTokens({ lastMade: localDateISO() }, mode([{ field: "lastMade", direction: "favor-low" }]), DEFAULT_SETTINGS);
		expect(tokens).toContain("Made today");

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const older = buildInfoTokens({ lastMade: localDateISO(yesterday) }, mode([{ field: "lastMade", direction: "favor-low" }]), DEFAULT_SETTINGS);
		expect(older).toContain("Made yesterday");
	});

	it("renders 'Last made Nd ago' for an older date", () => {
		const past = new Date();
		past.setDate(past.getDate() - 10);
		const tokens = buildInfoTokens(
			{ lastMade: localDateISO(past) },
			mode([{ field: "lastMade", direction: "favor-low" }]),
			DEFAULT_SETTINGS,
		);
		expect(tokens).toContain("Last made 10d ago");
	});

	it("shows 'Favorited' only when the favorite field is true, omitting it otherwise", () => {
		const withFav = buildInfoTokens({ favorite: true }, mode([{ field: "favorite", direction: "favor-high" }]), DEFAULT_SETTINGS);
		expect(withFav).toContain("Favorited");
		const withoutFav = buildInfoTokens({ favorite: false }, mode([{ field: "favorite", direction: "favor-high" }]), DEFAULT_SETTINGS);
		expect(withoutFav).not.toContain("Favorited");
	});

	it("renders cookedCount as 'Made Nx', or 'Never cooked' when zero/absent", () => {
		const cooked = buildInfoTokens({ cookedCount: 5 }, mode([{ field: "cookedCount", direction: "favor-high" }]), DEFAULT_SETTINGS);
		expect(cooked).toContain("Made 5x");
		const never = buildInfoTokens({}, mode([{ field: "cookedCount", direction: "favor-high" }]), DEFAULT_SETTINGS);
		expect(never).toContain("Never cooked");
	});

	it("renders a generic field as 'field: value'", () => {
		const tokens = buildInfoTokens({ cuisine: "italian" }, mode([{ field: "cuisine", direction: "favor-high" }]), DEFAULT_SETTINGS);
		expect(tokens).toContain("cuisine: italian");
	});

	it("caps rule-derived tokens at 3, ignoring additional rules", () => {
		const fourRules = mode([
			{ field: "a", direction: "favor-high" },
			{ field: "b", direction: "favor-high" },
			{ field: "c", direction: "favor-high" },
			{ field: "d", direction: "favor-high" },
		]);
		const tokens = buildInfoTokens({ a: 1, b: 2, c: 3, d: 4 }, fourRules, DEFAULT_SETTINGS);
		expect(tokens).toEqual(["a: 1", "b: 2", "c: 3"]);
	});

	it("appends prep/cook timing tokens after rule tokens", () => {
		const tokens = buildInfoTokens({ prepTime: 10, cookTime: 20 }, mode([]), DEFAULT_SETTINGS);
		expect(tokens).toEqual(["Prep 10m", "Cook 20m"]);
	});

	it("omits a timing token when the value is zero or absent", () => {
		const tokens = buildInfoTokens({ prepTime: 0 }, mode([]), DEFAULT_SETTINGS);
		expect(tokens).toEqual([]);
	});

	it("returns an empty array when there is nothing meaningful to show", () => {
		expect(buildInfoTokens({}, mode([]), DEFAULT_SETTINGS)).toEqual([]);
	});
});
