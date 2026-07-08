/** Vault I/O helpers: read note text (returning empty string if absent), ensure parent folders exist, and write note content atomically. */
import { App, TFile, moment } from "obsidian";

// Resolves {token} date patterns in a note path using moment.js.
// Example: "Meal Plans/{YYYY}/Week {ww}.md" -> "Meal Plans/2026/Week 28.md"
// Curly braces (not bare tokens) avoid collisions with folder/file names that
// happen to contain format letters like M, D, or Y.
export function resolveNotePath(template: string, date: Date = new Date()): string {
	const m = moment(date);
	return template.replace(/\{([^}]+)\}/g, (_, fmt: string) => m.format(fmt));
}

export async function readNoteOrEmpty(app: App, path: string): Promise<string> {
	const file = app.vault.getFileByPath(path);
	if (!file) return "";
	return app.vault.read(file);
}

export async function ensureParentFolders(app: App, filePath: string): Promise<void> {
	const segments = filePath.split("/").slice(0, -1);
	let current = "";
	for (const segment of segments) {
		current = current ? `${current}/${segment}` : segment;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}

export async function writeNote(app: App, path: string, content: string): Promise<void> {
	const file = app.vault.getFileByPath(path);
	if (file) {
		await app.vault.modify(file, content);
	} else {
		await ensureParentFolders(app, path);
		await app.vault.create(path, content);
	}
}

export async function getOrCreateNote(app: App, path: string, initialContent: string): Promise<TFile> {
	const file = app.vault.getFileByPath(path);
	if (file) return file;
	await ensureParentFolders(app, path);
	return app.vault.create(path, initialContent);
}
