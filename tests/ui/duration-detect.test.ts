import { describe, it, expect } from "vitest";
import { DURATION_RE, matchToSeconds } from "../../src/ui/timer/duration-detect";

function firstMatch(text: string): RegExpExecArray | null {
	DURATION_RE.lastIndex = 0;
	return DURATION_RE.exec(text);
}

describe("DURATION_RE / matchToSeconds", () => {
	it("parses plain minutes", () => {
		const m = firstMatch("Bake for 10 minutes")!;
		expect(matchToSeconds(m, "max")).toBe(600);
	});

	it("parses plain seconds", () => {
		const m = firstMatch("Microwave for 30 seconds")!;
		expect(matchToSeconds(m, "max")).toBe(30);
	});

	it("parses hours with optional minutes", () => {
		const m = firstMatch("Roast for 1 hour 30 minutes")!;
		expect(matchToSeconds(m, "max")).toBe(5400);
	});

	it("parses a bare hour with no minutes", () => {
		const m = firstMatch("Simmer for 2 hours")!;
		expect(matchToSeconds(m, "max")).toBe(7200);
	});

	it("resolves a minute range using the 'max' preference", () => {
		const m = firstMatch("Cook 10-15 minutes")!;
		expect(matchToSeconds(m, "max")).toBe(900);
	});

	it("resolves a minute range using the 'min' preference", () => {
		const m = firstMatch("Cook 10-15 minutes")!;
		expect(matchToSeconds(m, "min")).toBe(600);
	});

	it("resolves an hour range", () => {
		const m = firstMatch("Slow cook 2-3 hours")!;
		expect(matchToSeconds(m, "max")).toBe(10800);
	});

	it("resolves a 'to'-worded range the same as a hyphen range", () => {
		const m = firstMatch("Cook 10 to 15 minutes")!;
		expect(matchToSeconds(m, "max")).toBe(900);
	});

	it("does not match text with no duration", () => {
		expect(firstMatch("Season with salt and pepper")).toBeNull();
	});
});
