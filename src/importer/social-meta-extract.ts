/**
 * Extracts Open Graph / Twitter Card title and description from HTML, used as
 * the recipe source for social platforms that don't expose structured recipe data.
 */
import { decodeHtmlEntities } from "./html-entity-decode";

export interface SocialMeta {
	title: string;
	description: string;
}

// Matches <meta> tags with either attribute order (property/content or content/property)
const OG_TAG_RE =
	/<meta\s+(?:[^>]*?\s)?(?:property|name)=["']([^"']+)["'][^>]*?\s+content=["']([^"']*?)["'][^>]*?>|<meta\s+(?:[^>]*?\s)?content=["']([^"']*?)["'][^>]*?\s+(?:property|name)=["']([^"']+)["'][^>]*?>/gi;

const TITLE_TAG_RE = /<title[^>]*>([^<]*)<\/title>/i;
const YOUTUBE_SUFFIX_RE = /\s*-\s*YouTube\s*$/i;

function extractMeta(html: string): Map<string, string> {
	const map = new Map<string, string>();
	let m: RegExpExecArray | null;
	OG_TAG_RE.lastIndex = 0;
	while ((m = OG_TAG_RE.exec(html)) !== null) {
		const key = (m[1] ?? m[4] ?? "").toLowerCase();
		const value = m[2] ?? m[3] ?? "";
		if (key && !map.has(key)) map.set(key, value);
	}
	return map;
}

export function extractSocialMeta(html: string): SocialMeta {
	const meta = extractMeta(html);

	let title =
		meta.get("og:title") ??
		meta.get("twitter:title") ??
		TITLE_TAG_RE.exec(html)?.[1] ??
		"";
	let description =
		meta.get("og:description") ??
		meta.get("twitter:description") ??
		meta.get("description") ??
		"";

	title = decodeHtmlEntities(title).replace(YOUTUBE_SUFFIX_RE, "").trim();
	description = decodeHtmlEntities(description).trim();

	return { title, description };
}
