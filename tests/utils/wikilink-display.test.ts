import { describe, it, expect } from "vitest";
import { parseWholeWikilink, renderWikilinksAsText } from "../../src/utils/wikilink-display";

describe("renderWikilinksAsText", () => {
	it("uses the alias when one is given", () => {
		expect(renderWikilinksAsText("Note from [[Kate|my sister]]")).toBe("Note from my sister");
	});

	it("falls back to the link target without an alias", () => {
		expect(renderWikilinksAsText("Note from [[Kate]]")).toBe("Note from Kate");
	});

	it("shows heading references the way Obsidian does", () => {
		expect(renderWikilinksAsText("See [[Pantry#Spices]]")).toBe("See Pantry > Spices");
	});

	it("handles several links and embeds in one string", () => {
		expect(renderWikilinksAsText("[[A|one]] and ![[B]]")).toBe("one and B");
	});

	it("leaves text without links alone", () => {
		expect(renderWikilinksAsText("Notes [not a link]")).toBe("Notes [not a link]");
	});
});

describe("parseWholeWikilink", () => {
	it("parses an aliased link", () => {
		expect(parseWholeWikilink("[[Kate|my sister]]")).toEqual({ linktext: "Kate", label: "my sister" });
	});

	it("parses a plain link, keeping the heading in the linktext", () => {
		expect(parseWholeWikilink("[[People/Kate#Recipes]]")).toEqual({
			linktext: "People/Kate#Recipes",
			label: "People/Kate > Recipes",
		});
	});

	it("rejects values that are not exactly one link", () => {
		expect(parseWholeWikilink("From [[Kate]]")).toBeNull();
		expect(parseWholeWikilink("![[Kate]]")).toBeNull();
		expect(parseWholeWikilink("Kate")).toBeNull();
		expect(parseWholeWikilink("[[ ]]")).toBeNull();
	});
});
