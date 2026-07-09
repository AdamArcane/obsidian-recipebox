/**
 * Strips redundant content from the rendered recipe body — the title heading
 * and hero image embed — when the recipe view already displays them separately.
 */
import { findHeadingIndex } from "./recipe-heading-search";

export interface BodyCleanOptions {
	cleanNoteBody: boolean;
	title?: string;
	imageValue?: string;
}


const IMAGE_TOKEN_RE = /!\[\[([^\]\n]+)\]\]|!\[[^\]\n]*\]\(([^)\n]+)\)/g;

// Unwrap wikilink/embed syntax to bare filename: ![[x|alias]] → x, [[x#anchor]] → x
export function resolveImageTarget(value: string): string {
	const wikiMatch = value.match(/^!?\[\[([^\]#|]+)/);
	if (wikiMatch) return wikiMatch[1].trim();
	return value.trim();
}

function parseMarkdownImageTarget(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	// Markdown allows <url> as destination plus an optional title.
	if (trimmed.startsWith("<")) {
		const end = trimmed.indexOf(">");
		if (end > 1) return trimmed.slice(1, end).trim() || null;
	}

	const firstToken = trimmed.split(/\s+/)[0]?.trim() ?? "";
	return firstToken || null;
}

function resolveImageTokenTarget(match: RegExpExecArray): string | null {
	if (match[1]) return resolveImageTarget(`![[${match[1]}]]`) || null;
	if (match[2]) return parseMarkdownImageTarget(match[2]);
	return null;
}

// Finds the first image reference in the note body in reading order.
export function findFirstImageInBody(body: string): string | null {
	IMAGE_TOKEN_RE.lastIndex = 0;
	const match = IMAGE_TOKEN_RE.exec(body);
	if (!match) return null;
	return resolveImageTokenTarget(match);
}

const EXCESS_BLANK_RE = /\n{3,}/g;

export function stripRedundantBodyContent(body: string, options: BodyCleanOptions): string {
	let lines = body.split("\n");

	if (options.cleanNoteBody && options.title) {
		const { index } = findHeadingIndex(lines, options.title);
		if (index >= 0 && lines[index].startsWith("# ")) {
			lines.splice(index, 1);
		}
	}

	if (options.cleanNoteBody && options.imageValue) {
		const target = resolveImageTarget(options.imageValue);
		const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		// Obsidian wikilink embed: ![[target]] or ![[target|alias]] or ![[target#anchor]]
		const wikilinkEmbed = new RegExp(`^!\\[\\[${escapedTarget}(?:[|#][^\\]]*)?\\]\\]$`);
		// Standard markdown image: ![alt](target) or ![alt](target "title")
		const mdImage = new RegExp(`^!\\[[^\\]]*\\]\\(${escapedTarget}(?:\\s+"[^"]*")?\\)$`);
		lines = lines.filter(l => !wikilinkEmbed.test(l.trim()) && !mdImage.test(l.trim()));
	}

	return lines.join("\n").replace(EXCESS_BLANK_RE, "\n\n").trimStart();
}
