/**
 * Typed read/write access to the recipe-share frontmatter property. The four
 * share values (slug, token, created, expires) are never read or written
 * independently, so they're stored as one nested object rather than four
 * flat properties -- a genuine nested YAML object (Obsidian's Properties
 * panel renders it as a collapsed block), not a stringified JSON blob.
 */
import { App, CachedMetadata, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { findValue } from "../parser/frontmatter-lookup";

export interface ShareData {
	slug: string;
	token: string;
	created: string;
	expires: string;
}

function readString(obj: Record<string, unknown>, key: string): string | null {
	const raw = obj[key];
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	return trimmed || null;
}

export function getShareData(
	cache: CachedMetadata | null,
	settings: RecipeBoxSettings,
): ShareData | null {
	const fm: Record<string, unknown> = cache?.frontmatter ?? {};
	const raw = findValue(fm, [settings.shareDataProperty]);
	if (!raw || typeof raw !== "object") return null;
	const obj = raw as Record<string, unknown>;
	const slug = readString(obj, "slug");
	const token = readString(obj, "token");
	const created = readString(obj, "created");
	const expires = readString(obj, "expires");
	if (!slug || !token || !created || !expires) return null;
	return { slug, token, created, expires };
}

export async function setShareData(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	data: ShareData,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		const f = fm as Record<string, unknown>;
		f[settings.shareDataProperty] = { ...data };
	});
}

export async function clearShareData(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		const f = fm as Record<string, unknown>;
		delete f[settings.shareDataProperty];
	});
}
