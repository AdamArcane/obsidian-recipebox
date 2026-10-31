/** Tests image storage destination resolution for the three user-selected modes. */
import { describe, expect, it } from "vitest";
import { resolveImageStorageFolder } from "../../src/importer/attachment-folder";

const noteFolder = "Recipes/Dinner";

describe("resolveImageStorageFolder", () => {
	it("stores images beside the recipe in Recipe Folder mode", () => {
		expect(resolveImageStorageFolder("recipe-folder", "Attachments", "Custom", noteFolder)).toBe(noteFolder);
	});

	it("uses Obsidian's configured attachment folder in Obsidian Default mode", () => {
		expect(resolveImageStorageFolder("obsidian-default", "", "Custom", noteFolder)).toBe("");
		expect(resolveImageStorageFolder("obsidian-default", "./", "Custom", noteFolder)).toBe(noteFolder);
		expect(resolveImageStorageFolder("obsidian-default", "./Images", "Custom", noteFolder)).toBe("Recipes/Dinner/Images");
		expect(resolveImageStorageFolder("obsidian-default", "Attachments", "Custom", noteFolder)).toBe("Attachments");
	});

	it("uses the custom folder, with an empty value meaning vault root", () => {
		expect(resolveImageStorageFolder("custom", "Attachments", "Recipe Images", noteFolder)).toBe("Recipe Images");
		expect(resolveImageStorageFolder("custom", "Attachments", "", noteFolder)).toBe("");
	});
});