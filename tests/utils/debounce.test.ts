import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

// debounce.ts calls window.setTimeout/clearTimeout; this suite runs under
// vitest's "node" test environment (no browser globals), so `window` is
// stubbed to the global scope, which has real timers vi.useFakeTimers can
// still control.
beforeAll(() => {
	vi.stubGlobal("window", globalThis);
});

import { debounce } from "../../src/utils/debounce";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("debounce", () => {
	it("delays invocation until the wait period elapses with no further calls", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);
		debounced();
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledOnce();
	});

	it("resets the timer on each call, only firing once after the last call", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);
		debounced();
		vi.advanceTimersByTime(50);
		debounced();
		vi.advanceTimersByTime(50);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledOnce();
	});

	it("fires immediately on the leading edge when leading=true, and not again on trailing", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100, true);
		debounced();
		expect(fn).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledOnce();
	});

	it("fires again on the leading edge of a new call after the wait window closes", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100, true);
		debounced();
		vi.advanceTimersByTime(100);
		debounced();
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
