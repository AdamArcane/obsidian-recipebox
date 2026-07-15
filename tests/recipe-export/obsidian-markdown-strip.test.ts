import { describe, it, expect } from "vitest";
import { stripObsidianMarkdown } from "../../src/recipe-export/obsidian-markdown-strip";

describe("stripObsidianMarkdown", () => {
	it("converts an embed into a standard markdown image", () => {
		expect(stripObsidianMarkdown("![[photo.jpg]]")).toBe("![photo.jpg](photo.jpg)");
	});

	it("uses the alias as the label for an aliased embed", () => {
		expect(stripObsidianMarkdown("![[photo.jpg|My Photo]]")).toBe("![My Photo](photo.jpg)");
	});

	it("replaces a wikilink with its alias, or the target if there's no alias", () => {
		expect(stripObsidianMarkdown("[[Recipes/Pasta]]")).toBe("Recipes/Pasta");
		expect(stripObsidianMarkdown("[[Recipes/Pasta|Pasta Night]]")).toBe("Pasta Night");
	});

	it("strips a heading/block reference from a wikilink target", () => {
		expect(stripObsidianMarkdown("[[Recipes/Pasta#Ingredients]]")).toBe("Recipes/Pasta");
	});

	it("flattens a callout into a plain blockquote with its title", () => {
		expect(stripObsidianMarkdown("> [!note] Remember to preheat")).toBe("> Remember to preheat");
	});

	it("flattens a titleless callout to a bare blockquote marker", () => {
		expect(stripObsidianMarkdown("> [!note]")).toBe(">");
	});

	it("leaves plain text and unrelated markdown unchanged", () => {
		expect(stripObsidianMarkdown("Just plain text.")).toBe("Just plain text.");
	});

	it("handles an embed followed by other text on the same line", () => {
		expect(stripObsidianMarkdown("See ![[photo.jpg]] above")).toBe("See ![photo.jpg](photo.jpg) above");
	});
});
