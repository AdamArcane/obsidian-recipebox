import { describe, it, expect } from "vitest";
import { formatTime, parseTimeInput } from "../../src/ui/timer/time-format";

describe("formatTime", () => {
	it("formats seconds under an hour as MM:SS", () => {
		expect(formatTime(90)).toBe("01:30");
	});

	it("formats an hour or more as H:MM:SS", () => {
		expect(formatTime(3661)).toBe("1:01:01");
	});

	it("clamps negative input to zero", () => {
		expect(formatTime(-5)).toBe("00:00");
	});

	it("floors a fractional seconds value", () => {
		expect(formatTime(90.9)).toBe("01:30");
	});
});

describe("parseTimeInput", () => {
	it("parses H:MM:SS", () => {
		expect(parseTimeInput("1:02:03")).toBe(3723);
	});

	it("parses MM:SS", () => {
		expect(parseTimeInput("2:30")).toBe(150);
	});

	it("parses a bare number as whole minutes", () => {
		expect(parseTimeInput("5")).toBe(300);
	});

	it("parses a bare decimal number as fractional minutes", () => {
		expect(parseTimeInput("1.5")).toBe(90);
	});

	it("returns null for an out-of-range seconds or minutes component", () => {
		expect(parseTimeInput("1:60")).toBeNull();
		expect(parseTimeInput("1:60:00")).toBeNull();
	});

	it("returns null for zero or negative-resulting input", () => {
		expect(parseTimeInput("0")).toBeNull();
		expect(parseTimeInput("0:00")).toBeNull();
	});

	it("returns null for unparseable input", () => {
		expect(parseTimeInput("abc")).toBeNull();
		expect(parseTimeInput("")).toBeNull();
	});
});
