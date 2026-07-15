import { describe, it, expect } from "vitest";
import { fileInRecipeFolders, isRecipeSelected } from "../../src/parser/recipe-location";
import type { TFile, CachedMetadata } from "obsidian";

function file(path: string): TFile {
	return { path } as TFile;
}

describe("fileInRecipeFolders", () => {
	it("matches everything when no folders are configured", () => {
		expect(fileInRecipeFolders(file("Anywhere/Note.md"), [])).toBe(true);
	});

	it("matches a file directly under a configured folder", () => {
		expect(fileInRecipeFolders(file("Recipes/Pasta.md"), ["Recipes"])).toBe(true);
	});

	it("matches a file nested deeper under a configured folder", () => {
		expect(fileInRecipeFolders(file("Recipes/Italian/Pasta.md"), ["Recipes"])).toBe(true);
	});

	it("tolerates a trailing slash on the configured folder", () => {
		expect(fileInRecipeFolders(file("Recipes/Pasta.md"), ["Recipes/"])).toBe(true);
	});

	it("does not match a sibling folder with a shared prefix", () => {
		expect(fileInRecipeFolders(file("RecipesArchive/Pasta.md"), ["Recipes"])).toBe(false);
	});

	it("does not match a file outside all configured folders", () => {
		expect(fileInRecipeFolders(file("Notes/Pasta.md"), ["Recipes"])).toBe(false);
	});
});

describe("isRecipeSelected", () => {
	it("reads a true boolean frontmatter value", () => {
		const cache = { frontmatter: { selected: true } } as unknown as CachedMetadata;
		expect(isRecipeSelected(cache, "selected")).toBe(true);
	});

	it("loosely coerces string/number truthy values", () => {
		expect(isRecipeSelected({ frontmatter: { selected: "yes" } } as unknown as CachedMetadata, "selected")).toBe(true);
		expect(isRecipeSelected({ frontmatter: { selected: 1 } } as unknown as CachedMetadata, "selected")).toBe(true);
	});

	it("returns false when the property is absent or the cache is null", () => {
		expect(isRecipeSelected({ frontmatter: {} } as unknown as CachedMetadata, "selected")).toBe(false);
		expect(isRecipeSelected(null, "selected")).toBe(false);
	});
});
