import { describe, it, expect } from "vitest";
import { resolveShareAccentColors } from "../../src/sharing/resolve-share-accent";

describe("resolveShareAccentColors", () => {
	it("falls back to the default accent when no color was captured", () => {
		expect(resolveShareAccentColors(null)).toEqual({ light: "#7c5cff", dark: "#a48fff" });
	});

	it("falls back to the default when the captured value isn't a valid hex color", () => {
		expect(resolveShareAccentColors("not-a-color")).toEqual({ light: "#7c5cff", dark: "#a48fff" });
		expect(resolveShareAccentColors("rgb(1,2,3)")).toEqual({ light: "#7c5cff", dark: "#a48fff" });
	});

	it("uses a captured color with sufficient contrast against the dark background for both modes", () => {
		// A bright color like pure white or yellow has plenty of contrast against #1e1e1e.
		expect(resolveShareAccentColors("#ffff00")).toEqual({ light: "#ffff00", dark: "#ffff00" });
	});

	it("falls back to the default when the captured color would be unreadable on the dark background", () => {
		// A very dark color close to the #1e1e1e background fails the contrast check.
		expect(resolveShareAccentColors("#202020")).toEqual({ light: "#7c5cff", dark: "#a48fff" });
	});

	it("supports 3-digit hex shorthand", () => {
		expect(resolveShareAccentColors("#ff0")).toEqual({ light: "#ff0", dark: "#ff0" });
	});
});
