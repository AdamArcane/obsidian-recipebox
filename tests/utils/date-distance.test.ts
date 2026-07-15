import { describe, it, expect } from "vitest";
import { daysSince } from "../../src/utils/date-distance";

describe("daysSince", () => {
	it("returns 0 for today's date", () => {
		const now = new Date();
		const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		expect(daysSince(iso)).toBe(0);
	});

	it("computes whole days elapsed for a past date", () => {
		const past = new Date();
		past.setDate(past.getDate() - 5);
		const iso = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
		expect(daysSince(iso)).toBe(5);
	});

	it("returns a negative number for a future date", () => {
		const future = new Date();
		future.setDate(future.getDate() + 3);
		const iso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
		expect(daysSince(iso)).toBe(-3);
	});

	it("returns null for a malformed date string", () => {
		expect(daysSince("not-a-date")).toBeNull();
		expect(daysSince("2024-01")).toBeNull();
		expect(daysSince("")).toBeNull();
	});
});
