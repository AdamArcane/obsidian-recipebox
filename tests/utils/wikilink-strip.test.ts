import { describe, it, expect } from "vitest";
import { stripWikilink } from "../../src/utils/wikilink-strip";

describe("stripWikilink", () => {
	it("strips a plain wikilink to its bare path", () => {
		expect(stripWikilink("[[Recipes/Pasta]]")).toBe("Recipes/Pasta");
	});

	it("strips an embed wikilink", () => {
		expect(stripWikilink("![[Images/pasta.png]]")).toBe("Images/pasta.png");
	});

	it("strips an aliased wikilink, keeping only the path", () => {
		expect(stripWikilink("[[Recipes/Pasta|Pasta Night]]")).toBe("Recipes/Pasta");
	});

	it("strips a wikilink with a heading/block reference", () => {
		expect(stripWikilink("[[Recipes/Pasta#Ingredients]]")).toBe("Recipes/Pasta");
	});

	it("returns non-wikilink strings unchanged", () => {
		expect(stripWikilink("Recipes/Pasta")).toBe("Recipes/Pasta");
		expect(stripWikilink("")).toBe("");
	});
});
