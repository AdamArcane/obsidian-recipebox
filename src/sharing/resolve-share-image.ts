/**
 * Resolves a recipe's header image into something embeddable in a
 * standalone shared HTML page. External URLs are used as-is (no size
 * concern -- the recipient's browser fetches those directly, the Worker
 * never stores their bytes). Vault-local images have no public URL, so
 * they're downscaled, re-encoded as JPEG, and base64-embedded as a data
 * URI instead (the Worker API has no separate image-upload endpoint).
 *
 * The downscale/re-encode pass exists because the Worker enforces a payload
 * size cap (see share-worker-client.ts) that a raw local photo can easily
 * exceed once base64-inflated -- and it makes the shared page load faster
 * for the recipient regardless of the cap. It also incidentally shrinks
 * (never eliminates) the copyright surface of a scraper-sourced image,
 * since the embedded bytes are a re-encoded derivative, not a verbatim
 * copy -- that's a side effect, not a substitute for the attribution
 * requirement below.
 *
 * If the image still doesn't fit the budget after resizing, it's omitted
 * entirely rather than sent oversized or left to fail as an opaque Worker
 * error -- callers get a human-readable reason to surface to the user
 * (share-modal.ts), never a silent drop.
 *
 * isScraperOrigin decides whether the shared page must show visible photo
 * attribution (copyright mitigation, see build-share-html.ts). The
 * codebase has no way to tell "user photographed this" from "recipe-scrapers
 * populated this" for a given image field, so per spec: if the recipe has
 * any detectable source URL at all, treat its image as scraper-origin and
 * show attribution rather than guessing it's safe to omit.
 */
import { App, TFile } from "obsidian";
import { RecipeExportData } from "../recipe-export/recipe-export-data";
import { findSourceUrl } from "./find-source-url";

/**
 * Placeholder written into the HTML and JSON-LD when the image is a vault
 * file. The Worker replaces every occurrence of this string with the real
 * image URL after storing the bytes at {userShortId}/{recipeSlug}/image.
 */
export const VAULT_IMAGE_PLACEHOLDER = "__RB_IMAGE_URL__";

export interface ResolvedShareImage {
	src: string;
	isScraperOrigin: boolean;
	/** Raw JPEG bytes for vault-local images; absent for external URLs. */
	bytes?: ArrayBuffer;
	contentType?: string;
}

export interface ShareImageResolution {
	image: ResolvedShareImage | null;
	/** Human-readable reason the image was left out, or null if one was included (or there was none to begin with). */
	omittedReason: string | null;
}

const MIME_BY_EXTENSION: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	gif: "image/gif",
	svg: "image/svg+xml",
	avif: "image/avif",
	bmp: "image/bmp",
};

// Starting points, not final numbers -- tune against real output.
const MAX_DIMENSION = 1200;
// The image's own budget, not the whole ~500KB Worker cap: HTML markup,
// ingredients, and instructions also count toward that cap, so the image
// needs to leave headroom rather than assume it can use the entire thing.
const IMAGE_BUDGET_BYTES = 350 * 1024;
const QUALITY_PASSES = [0.8, 0.5];

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

async function decodeToCanvas(bytes: ArrayBuffer, mime: string): Promise<HTMLCanvasElement> {
	const blob = new Blob([bytes], { type: mime });
	const bitmap = await createImageBitmap(blob);
	try {
		const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
		const width = Math.round(bitmap.width * scale);
		const height = Math.round(bitmap.height * scale);

		const canvas = activeDocument.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D context unavailable");
		ctx.drawImage(bitmap, 0, 0, width, height);
		return canvas;
	} finally {
		bitmap.close();
	}
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) { reject(new Error("Failed to encode image")); return; }
				void blob.arrayBuffer().then(resolve);
			},
			"image/jpeg",
			quality,
		);
	});
}

/** Resizes, re-encodes, and budget-checks a vault image; drops quality once more if still over. */
async function encodeVaultImage(app: App, file: TFile): Promise<{ bytes: ArrayBuffer | null; omittedReason: string | null }> {
	const mime = MIME_BY_EXTENSION[file.extension.toLowerCase()];
	if (!mime) {
		return { bytes: null, omittedReason: "This image format isn't supported for sharing, so the recipe was shared without an image." };
	}

	let canvas: HTMLCanvasElement;
	try {
		const rawBytes = await app.vault.readBinary(file);
		canvas = await decodeToCanvas(rawBytes, mime);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { bytes: null, omittedReason: `Image processing failed: ${message}` };
	}

	for (const quality of QUALITY_PASSES) {
		const buf = await canvasToJpegBytes(canvas, quality);
		// Budget is checked against raw byte size (not base64 length) since the
		// image now travels as a separate Worker KV key, not embedded in HTML.
		if (buf.byteLength <= IMAGE_BUDGET_BYTES) return { bytes: buf, omittedReason: null };
	}

	return { bytes: null, omittedReason: "The recipe's image was too large to include even after compression, so the recipe was shared without it." };
}

export async function resolveShareImage(
	app: App,
	data: RecipeExportData,
	frontmatter: Record<string, unknown>,
): Promise<ShareImageResolution> {
	if (!data.image) return { image: null, omittedReason: null };

	const isScraperOrigin = findSourceUrl(frontmatter) !== null;

	if (data.image.kind === "url") {
		return { image: { src: data.image.url, isScraperOrigin }, omittedReason: null };
	}

	const { bytes, omittedReason } = await encodeVaultImage(app, data.image.file);
	if (!bytes) return { image: null, omittedReason };
	// src is a placeholder: the Worker replaces it with the real image URL after
	// storing the bytes at {userShortId}/{recipeSlug}/image.
	return { image: { src: VAULT_IMAGE_PLACEHOLDER, isScraperOrigin, bytes, contentType: "image/jpeg" }, omittedReason: null };
}
