/**
 * Binds the batch writer's ImportDeps to a real vault: adapter dispatch,
 * image resolution and the shared note writer.
 */
import type { App } from "obsidian";
import type { RecipeBoxSettings } from "../../settings/settings-types";
import { writeRecipeNote } from "../../ui/modals/import-submit";
import { downloadRecipeImage, writeImageToVault } from "../download-recipe-image";
import { imageExtensionFromFilename } from "./image-filename";
import { mealieToExtracted } from "./adapters/mealie-to-extracted";
import { schemaOrgToExtracted } from "./adapters/schema-org-to-extracted";
import type { ImportDeps } from "./file-import-run";

export function createVaultImportDeps(app: App, settings: RecipeBoxSettings): ImportDeps {
	return {
		convert: async (unit) => {
			if (unit.format === "mealie") return mealieToExtracted(unit.data);
			if (unit.format === "schema-org") return schemaOrgToExtracted(unit.data);
			return null;
		},
		exists: (path) => app.vault.getAbstractFileByPath(path) !== null,
		write: async (unit, recipe, path, folder) => {
			const warnings: string[] = [];
			let toSave = recipe;
			if (unit.image) {
				// A bundled image has no URL to fall back to, so it is always
				// written; downloadImagesOnImport governs remote downloads only.
				const ext = imageExtensionFromFilename(unit.image.path) ?? "jpg";
				const bytes = unit.image.bytes.buffer.slice(
					unit.image.bytes.byteOffset,
					unit.image.bytes.byteOffset + unit.image.bytes.byteLength,
				) as ArrayBuffer;
				const saved = await writeImageToVault(app, bytes, ext, recipe.title, folder);
				if (saved) toSave = { ...recipe, heroImage: saved };
				else warnings.push("The bundled image could not be saved.");
			} else if (settings.downloadImagesOnImport && recipe.heroImage) {
				const saved = await downloadRecipeImage(app, recipe.heroImage, recipe.title, folder);
				if (saved) toSave = { ...recipe, heroImage: saved };
				else warnings.push("The image could not be downloaded; the original link was kept.");
			}
			await writeRecipeNote(app, toSave, path, settings, { imageHandled: true });
			return warnings;
		},
	};
}
