import { describe, it, expect } from "vitest";
import { describeSourceLink } from "../../src/ui/recipe-view/source-link-display";

describe("describeSourceLink", () => {
	it("shows a web URL as a link labelled with its hostname", () => {
		expect(describeSourceLink("https://www.seriouseats.com/recipes/123")).toEqual({
			label: "www.seriouseats.com",
			href: "https://www.seriouseats.com/recipes/123",
		});
		expect(describeSourceLink("http://example.com")).toEqual({
			label: "example.com",
			href: "http://example.com",
		});
	});

	it("renders a non-URL source as plain text rather than throwing", () => {
		// The reason this helper exists: the value is free text, so anything from
		// a cookbook title to a bare domain can appear here.
		expect(describeSourceLink("Grandma's handwritten notebook, page 42")).toEqual({
			label: "Grandma's handwritten notebook, page 42",
			href: null,
		});
		expect(describeSourceLink("example.com/recipe")).toEqual({
			label: "example.com/recipe",
			href: null,
		});
	});

	it("does not link non-web schemes that would produce a misleading label", () => {
		// new URL() parses both of these, reporting hostname "open" and "".
		expect(describeSourceLink("obsidian://open?file=Cookbook")).toEqual({
			label: "obsidian://open?file=Cookbook",
			href: null,
		});
		expect(describeSourceLink("mailto:chef@example.com")).toEqual({
			label: "mailto:chef@example.com",
			href: null,
		});
	});

	it("falls back to plain text when an http(s) value will not parse", () => {
		expect(describeSourceLink("https://")).toEqual({ label: "https://", href: null });
	});

	it("treats a missing or blank source as nothing to render", () => {
		expect(describeSourceLink(null)).toBeNull();
		expect(describeSourceLink("")).toBeNull();
		expect(describeSourceLink("   ")).toBeNull();
	});

	it("trims surrounding whitespace from both label and href", () => {
		expect(describeSourceLink("  https://example.com  ")).toEqual({
			label: "example.com",
			href: "https://example.com",
		});
	});
});
