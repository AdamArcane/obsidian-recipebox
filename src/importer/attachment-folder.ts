import type { ImageStorageLocation } from "../settings/settings-types";

/** Resolves the selected image destination into a vault-relative folder path. */
export function resolveImageStorageFolder(
	location: ImageStorageLocation,
	configuredAttachmentFolder: string,
	customFolder: string,
	noteFolder: string,
): string {
	if (location === "recipe-folder") return noteFolder;
	if (location === "custom") return customFolder;
	return resolveObsidianAttachmentFolder(configuredAttachmentFolder, noteFolder);
}

function resolveObsidianAttachmentFolder(configured: string, noteFolder: string): string {
	if (!configured || configured === "/") return "";
	// "./" or "./sub" means relative to the note's folder.
	if (configured.startsWith("./")) {
		const sub = configured.slice(2);
		if (!sub) return noteFolder;
		return noteFolder ? `${noteFolder}/${sub}` : sub;
	}
	// Absolute vault path.
	return configured;
}