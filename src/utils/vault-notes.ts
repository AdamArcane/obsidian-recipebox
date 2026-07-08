/** Vault I/O helpers: read note text (returning empty string if absent), ensure parent folders exist, and write note content atomically. */
import { App, TFile, moment } from "obsidian";

type MomentFormatter = {
	format: (pattern: string) => string;
};

function formatWithMoment(date: Date, pattern: string): string {
	// Obsidian's exported moment value can be loosely typed in some tooling setups.
	// Narrowing through unknown keeps strict lint rules from treating this as implicit any.
	const createMoment = moment as unknown as (input: Date) => MomentFormatter;
	return createMoment(date).format(pattern);
}

// Resolves {token} date patterns in a note path using moment.js.
// Example: "Meal Plans/{YYYY}/Week {ww}.md" -> "Meal Plans/2026/Week 28.md"
// Curly braces (not bare tokens) avoid collisions with folder/file names that
// happen to contain format letters like M, D, or Y.
export function resolveNotePath(template: string, date: Date = new Date()): string {
	return template.replace(/\{([^}]+)\}/g, (_match: string, fmt: string) => formatWithMoment(date, fmt));
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
