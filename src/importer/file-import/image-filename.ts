/**
 * Recognizes image files by extension. Kept free of obsidian imports so the
 * unit grouper stays unit-testable.
 */
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif", "bmp"];

export function imageExtensionFromFilename(name: string): string | null {
	const ext = name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? null;
	return ext && IMAGE_EXTENSIONS.includes(ext) ? ext : null;
}
