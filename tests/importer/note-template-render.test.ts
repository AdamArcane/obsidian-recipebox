import { describe, it, expect, vi } from "vitest";

// vault-notes.ts (pulled in for the custom-template read path) imports the
// `moment` value from "obsidian", a types-only package with no runtime JS.
// The default template path used below never calls readNoteOrEmpty, so this
// stub is never exercised, but it must exist for the import chain to resolve.
vi.mock("obsidian", () => ({ moment: () => ({ format: () => "" }) }));

import { buildRecipeNote } from "../../src/importer/note-template-render";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { ExtractedRecipe } from "../../src/importer/recipe-extract-types";
import type { App } from "obsidian";

const FAKE_APP = {} as App;

function recipe(overrides: Partial<ExtractedRecipe> = {}): ExtractedRecipe {
	return {
		title: "Test Recipe",
		description: "A description.",
		heroImage: "hero.jpg",
		servings: "4",
		prepTime: 10,
		cookTime: 20,
		totalTime: 30,
		ingredientGroups: [{ name: null, items: ["flour", "sugar"] }],
		instructionGroups: [{ name: null, items: ["Mix.", "Bake."] }],
		notesGroups: [],
		sourceUrl: "https://example.com",
		calories: 300,
		protein: 20,
		fat: 10,
		carbs: 40,
		...overrides,
	};
}

describe("buildRecipeNote", () => {
	it("renders the default template with substituted frontmatter and body content", async () => {
		const note = await buildRecipeNote(FAKE_APP, recipe(), DEFAULT_SETTINGS);
		expect(note).toContain("source: https://example.com");
		expect(note).toContain("servings: 4");
		expect(note).toContain(`## ${DEFAULT_SETTINGS.ingredientsHeading}`);
		expect(note).toContain("- flour");
		expect(note).toContain("- sugar");
		expect(note).toContain(`## ${DEFAULT_SETTINGS.instructionsHeading}`);
		expect(note).toContain("1. Mix.");
		expect(note).toContain("2. Bake.");
		expect(note).toContain("A description.");
	});

	it("numbers instruction sub-groups continuously across groups", async () => {
		const withGroups = recipe({
			instructionGroups: [
				{ name: "Dough", items: ["Mix."] },
				{ name: "Bake", items: ["Bake it."] },
			],
		});
		const note = await buildRecipeNote(FAKE_APP, withGroups, DEFAULT_SETTINGS);
		expect(note).toContain("1. Mix.");
		expect(note).toContain("2. Bake it.");
	});

	it("removes the whole Notes heading block when notesGroups is empty", async () => {
		const note = await buildRecipeNote(FAKE_APP, recipe({ notesGroups: [] }), DEFAULT_SETTINGS);
		expect(note).not.toContain(`## ${DEFAULT_SETTINGS.notesHeading}`);
	});

	it("keeps the Notes heading and renders content when notesGroups is non-empty", async () => {
		const note = await buildRecipeNote(FAKE_APP, recipe({ notesGroups: [{ name: null, items: ["Freezes well."] }] }), DEFAULT_SETTINGS);
		expect(note).toContain(`## ${DEFAULT_SETTINGS.notesHeading}`);
		expect(note).toContain("Freezes well.");
	});
});
