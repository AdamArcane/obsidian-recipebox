/**
 * Downloads a recipe's hero image (HTTP/HTTPS URL or data: URI) into the vault,
 * placing it in Obsidian's configured attachment folder relative to the recipe note.
 * Returns the vault-relative path on success, or null on any failure -- callers
 * treat failure as non-fatal and fall back to storing the original URL as-is.
 */
import { App, requestUrl } from "obsidian";
import { titleToFilename } from "./note-filename";
import { ensureParentFolders } from "../utils/vault-notes";

const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
	"image/avif": "avif",
	"image/bmp": "bmp",
};

function extensionFromMime(contentType: string): string | null {
	const base = contentType.split(";")[0].trim().toLowerCase();
	return MIME_TO_EXT[base] ?? null;
}

function extensionFromUrl(url: string): string | null {
	try {
		const { pathname } = new URL(url);
		const match = pathname.match(/\.([a-z0-9]+)$/i);
		const ext = match?.[1]?.toLowerCase() ?? null;
		return ext && Object.values(MIME_TO_EXT).includes(ext) ? ext : null;
	} catch {
		return null;
	}
}

/** Resolves where to put attachments for a note in the given vault folder. */
function resolveAttachmentFolder(app: App, noteFolder: string): string {
	let configured: string;
	try {
		// getConfig is an internal Obsidian API -- it exists on all desktop and
		// mobile builds, but isn't in the public type definitions.
		configured = (app.vault as unknown as { getConfig(key: string): unknown }).getConfig("attachmentFolderPath") as string ?? "";
	} catch {
		configured = "";
	}
	// "/" or "" means vault root.
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

/** Returns the first vault path for baseName.ext that doesn't already exist. */
async function uniqueVaultPath(app: App, folder: string, baseName: string, ext: string): Promise<string> {
	const build = (suffix: string) => {
		const name = `${baseName}${suffix}.${ext}`;
		return folder ? `${folder}/${name}` : name;
	};
	if (!app.vault.getFileByPath(build(""))) return build("");
	for (let i = 1; i <= 99; i++) {
		const path = build(`-${i}`);
		if (!app.vault.getFileByPath(path)) return path;
	}
	// Extremely unlikely, but don't block the import.
	return build(`-${Date.now()}`);
}

function decodeDataUri(dataUri: string): { bytes: ArrayBuffer; ext: string } | null {
	const match = dataUri.match(/^data:([^;,]+)(?:;[^,]*)?,([\s\S]+)$/);
	if (!match) return null;
	const ext = extensionFromMime(match[1]) ?? "jpg";
	try {
		const binary = atob(match[2]);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return { bytes: bytes.buffer, ext };
	} catch {
		return null;
	}
}

export interface FetchedImage {
	bytes: ArrayBuffer;
	ext: string;
}

/** Fetches image bytes from an HTTP(S) URL or data: URI. Null on any failure. */
export async function fetchImageBytes(source: string): Promise<FetchedImage | null> {
	try {
		if (source.startsWith("data:")) return decodeDataUri(source);
		const response = await requestUrl({ url: source, method: "GET" });
		const contentType = (response.headers?.["content-type"] as string | undefined) ?? "";
		const ext = extensionFromMime(contentType) ?? extensionFromUrl(source) ?? "jpg";
		return { bytes: response.arrayBuffer, ext };
	} catch {
		return null;
	}
}

/**
 * Writes already-fetched image bytes into the vault's attachment folder for a
 * note in noteFolder. Returns the vault path, or null on failure.
 */
export async function writeImageToVault(
	app: App,
	bytes: ArrayBuffer,
	ext: string,
	recipeTitle: string,
	noteFolder: string,
): Promise<string | null> {
	try {
		const attachmentFolder = resolveAttachmentFolder(app, noteFolder);
		const baseName = titleToFilename(recipeTitle || "recipe");
		const vaultPath = await uniqueVaultPath(app, attachmentFolder, baseName, ext);

		await ensureParentFolders(app, vaultPath);
		await app.vault.createBinary(vaultPath, bytes);
		return vaultPath;
	} catch {
		return null;
	}
}

export async function downloadRecipeImage(
	app: App,
	heroImage: string,
	recipeTitle: string,
	noteFolder: string,
): Promise<string | null> {
	const fetched = await fetchImageBytes(heroImage);
	if (!fetched) return null;
	return writeImageToVault(app, fetched.bytes, fetched.ext, recipeTitle, noteFolder);
}
