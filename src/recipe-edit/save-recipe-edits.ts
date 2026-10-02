/**
 * Obsidian glue for the edit-recipe save: body sections first (one
 * vault.process), then frontmatter (one processFrontMatter), then the
 * optional rename. Body goes first so a conflict aborts the whole save
 * before anything has been written. The note template is never involved.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { applySectionEdits, SectionEdit } from "./apply-section-edits";
import { applyFrontmatterEdits, FrontmatterEdits, hasFrontmatterEdits } from "./apply-frontmatter-edits";

export interface SaveRequest {
	sections: SectionEdit[];
	frontmatter: FrontmatterEdits;
	/** New basename (no extension) when the user opted into a rename, else null. */
	renameTo: string | null;
}

export type SaveResult =
	| { status: "saved"; renameSkipped: boolean }
	| { status: "conflict" };

export async function saveRecipeEdits(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	request: SaveRequest,
): Promise<SaveResult> {
	if (request.sections.length > 0) {
		let conflict = false;
		await app.vault.process(file, (current) => {
			const result = applySectionEdits(current, request.sections, {
				ingredients: settings.ingredientsHeading,
				steps: settings.instructionsHeading,
				notes: settings.notesHeading,
			});
			if (result.kind === "conflict") {
				conflict = true;
				return current;
			}
			return result.content;
		});
		if (conflict) return { status: "conflict" };
	}

	if (hasFrontmatterEdits(request.frontmatter)) {
		await app.fileManager.processFrontMatter(file, (fm) => {
			applyFrontmatterEdits(fm as Record<string, unknown>, settings, request.frontmatter);
		});
	}

	let renameSkipped = false;
	if (request.renameTo && request.renameTo !== file.basename) {
		const folder = file.parent?.path ?? "";
		const newPath = `${folder && folder !== "/" ? `${folder}/` : ""}${request.renameTo}.${file.extension}`;
		const existing = app.vault.getAbstractFileByPath(newPath);
		// On a case-insensitive filesystem a case-only rename resolves to this
		// same file; that is a valid rename, not a collision.
		if (existing && existing !== file) {
			renameSkipped = true;
		} else {
			await app.fileManager.renameFile(file, newPath);
		}
	}

	return { status: "saved", renameSkipped };
}
