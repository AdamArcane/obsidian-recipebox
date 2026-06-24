import { TFile, CachedMetadata } from "obsidian";

export function fileInRecipeFolders(file: TFile, folders: string[]): boolean {
	if (folders.length === 0) return true;
	for (const folder of folders) {
		const base = folder.replace(/\/$/, "");
		if (file.path === base || file.path.startsWith(base + "/")) return true;
	}
	return false;
}

function looseBoolean(value: unknown): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;
	if (typeof value === "string") {
		const s = value.trim().toLowerCase();
		return s === "true" || s === "yes" || s === "1";
	}
	return false;
}

export function isRecipeSelected(cache: CachedMetadata | null, property: string): boolean {
	return looseBoolean(cache?.frontmatter?.[property]);
}
