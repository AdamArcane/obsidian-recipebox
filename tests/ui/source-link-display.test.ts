import { describe, it, expect } from "vitest";
import { describeSourceLink } from "../../src/ui/recipe-view/source-link-display";

describe("describeSourceLink", () => {
	it("shows a web URL as a link labelled with its hostname", () => {
		expect(describeSourceLink("https://www.seriouseats.com/recipes/123")).toEqual({
			kind: "external",
			label: "www.seriouseats.com",
			href: "https://www.seriouseats.com/recipes/123",
		});
		expect(describeSourceLink("http://example.com")).toEqual({
			kind: "external",
			label: "example.com",
			href: "http://example.com",
		});
	});

	it("renders a non-URL source as plain text rather than throwing", () => {
		// The reason this helper exists: the value is free text, so anything from
		// a cookbook title to a bare domain can appear here.
		expect(describeSourceLink("Grandma's handwritten notebook, page 42")).toEqual({
			kind: "text",
			label: "Grandma's handwritten notebook, page 42",
		});
		expect(describeSourceLink("example.com/recipe")).toEqual({
			kind: "text",
			label: "example.com/recipe",
		});
	});

	it("links a wikilink source to the note, labelled with its alias", () => {
		expect(describeSourceLink("[[Kate|my sister]]")).toEqual({
			kind: "internal",
			label: "my sister",
			linktext: "Kate",
		});
		expect(describeSourceLink("  [[Kate]]  ")).toEqual({
			kind: "internal",
			label: "Kate",
			linktext: "Kate",
		});
	});

	it("keeps free text that only mentions a note as plain text", () => {
		expect(describeSourceLink("From [[Kate]]")).toEqual({
			kind: "text",
			label: "From [[Kate]]",
		});
	});

	it("does not link non-web schemes that would produce a misleading label", () => {
		// new URL() parses both of these, reporting hostname "open" and "".
		expect(describeSourceLink("obsidian://open?file=Cookbook")).toEqual({
			kind: "text",
			label: "obsidian://open?file=Cookbook",
		});
		expect(describeSourceLink("mailto:chef@example.com")).toEqual({
			kind: "text",
			label: "mailto:chef@example.com",
		});
	});

	it("falls back to plain text when an http(s) value will not parse", () => {
		expect(describeSourceLink("https://")).toEqual({ kind: "text", label: "https://" });
	});

	it("treats a missing or blank source as nothing to render", () => {
		expect(describeSourceLink(null)).toBeNull();
		expect(describeSourceLink("")).toBeNull();
		expect(describeSourceLink("   ")).toBeNull();
	});

	it("trims surrounding whitespace from both label and href", () => {
		expect(describeSourceLink("  https://example.com  ")).toEqual({
			kind: "external",
			label: "example.com",
			href: "https://example.com",
		});
	});
});
