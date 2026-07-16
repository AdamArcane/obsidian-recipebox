import { describe, it, expect } from "vitest";
import { isFolderClickGalleryTarget } from "../../src/integrations/folder-click-match";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { RecipeBoxSettings } from "../../src/settings/settings-types";

function settingsWith(overrides: Partial<RecipeBoxSettings>): RecipeBoxSettings {
	return { ...DEFAULT_SETTINGS, recipeFolders: ["Recipes"], ...overrides };
}

describe("isFolderClickGalleryTarget", () => {
	it("returns false when the master toggle is off, even for an exact match", () => {
		const settings = settingsWith({ openGalleryOnFolderClick: false });
		expect(isFolderClickGalleryTarget("Recipes", settings)).toBe(false);
	});

	it("matches an exact configured recipe folder when the master toggle is on", () => {
		const settings = settingsWith({ openGalleryOnFolderClick: true });
		expect(isFolderClickGalleryTarget("Recipes", settings)).toBe(true);
	});

	it("does not match a subfolder when the subfolders toggle is off", () => {
		const settings = settingsWith({ openGalleryOnFolderClick: true, openGalleryOnFolderClickSubfolders: false });
		expect(isFolderClickGalleryTarget("Recipes/Desserts", settings)).toBe(false);
	});

	it("matches a subfolder when the subfolders toggle is on", () => {
		const settings = settingsWith({ openGalleryOnFolderClick: true, openGalleryOnFolderClickSubfolders: true });
		expect(isFolderClickGalleryTarget("Recipes/Desserts", settings)).toBe(true);
	});

	it("does not match an unrelated folder", () => {
		const settings = settingsWith({ openGalleryOnFolderClick: true, openGalleryOnFolderClickSubfolders: true });
		expect(isFolderClickGalleryTarget("Notes", settings)).toBe(false);
	});

	it("does not treat a folder with the same prefix but no separator as a subfolder", () => {
		const settings = settingsWith({ openGalleryOnFolderClick: true, openGalleryOnFolderClickSubfolders: true });
		expect(isFolderClickGalleryTarget("RecipesArchive", settings)).toBe(false);
	});

	it("normalizes a trailing slash on configured recipe folders", () => {
		const settings = settingsWith({ recipeFolders: ["Recipes/"], openGalleryOnFolderClick: true });
		expect(isFolderClickGalleryTarget("Recipes", settings)).toBe(true);
	});
});
