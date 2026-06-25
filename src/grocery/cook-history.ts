/**
 * Appends a "cooked" entry to a recipe note — either as a bullet in the note
 * body, as a frontmatter date array, or both, depending on settings.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { CookedImageResult } from "../ui/recipe-view/recipe-view-deps";

async function saveUploadedImage(app: App, recipeFile: TFile, filename: string, data: ArrayBuffer): Promise<TFile | null> {
	try {
		const attachPath = await (app.fileManager as unknown as {
			getAvailablePathForAttachment: (name: string, sourcePath: string) => Promise<string>;
		}).getAvailablePathForAttachment(filename, recipeFile.path);
		return await app.vault.createBinary(attachPath, data);
	} catch {
		// Fallback: write alongside recipe file
		const dir = recipeFile.parent?.path ?? "";
		const fallbackPath = dir ? `${dir}/${filename}` : filename;
		try {
			return await app.vault.createBinary(fallbackPath, data);
		} catch {
			return null;
		}
	}
}

async function resolveImage(app: App, recipeFile: TFile, image: CookedImageResult): Promise<TFile | null> {
	if (image.kind === "vault-file") return image.file;
	return saveUploadedImage(app, recipeFile, image.filename, image.data);
}

const HISTORY_IMAGE_WIDTH = 200;

function buildEntryLine(date: string, notes: string, imageFile: TFile | null): string {
	const notesText = notes.trim();
	const firstLine = notesText ? `**${date}:** ${notesText}` : `**${date}:**`;
	if (!imageFile) return `- ${firstLine}`;
	const imgEmbed = `![[${imageFile.name}|${HISTORY_IMAGE_WIDTH}]]`;
	// Image on its own indented line so it doesn't run into the note text
	return `- ${firstLine}\n  ${imgEmbed}`;
}

async function appendNoteBodyEntry(
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	entryLine: string,
): Promise<void> {
	const heading = `## ${settings.cookHistoryHeading}`;
	await app.vault.process(recipeFile, (content) => {
		const headingIdx = content.split("\n").findIndex((l) => l.trim() === heading);
		if (headingIdx >= 0) {
			const lines = content.split("\n");
			let insertAt = headingIdx + 1;
			while (insertAt < lines.length && !lines[insertAt].trim()) insertAt++;
			lines.splice(insertAt, 0, entryLine);
			return lines.join("\n");
		}
		const trimmed = content.trimEnd();
		return `${trimmed}\n\n${heading}\n${entryLine}\n`;
	});
}

async function appendFrontmatterEntry(
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	date: string,
): Promise<void> {
	const prop = settings.cookHistoryFrontmatterProperty;
	await app.fileManager.processFrontMatter(recipeFile, (fm) => {
		const f = fm as Record<string, unknown>;
		const existing = Array.isArray(f[prop]) ? (f[prop] as string[]) : [];
		if (!existing.includes(date)) {
			f[prop] = [date, ...existing];
		}
	});
}

export async function appendCookHistoryEntry(
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	date: string,
	notes: string,
	image: CookedImageResult | null
): Promise<void> {
	const storage = settings.cookHistoryStorage ?? "note";

	if (storage !== "frontmatter") {
		const imageFile = image ? await resolveImage(app, recipeFile, image) : null;
		const entryLine = buildEntryLine(date, notes, imageFile);
		await appendNoteBodyEntry(app, recipeFile, settings, entryLine);
	}

	if (storage !== "note") {
		await appendFrontmatterEntry(app, recipeFile, settings, date);
	}
}
