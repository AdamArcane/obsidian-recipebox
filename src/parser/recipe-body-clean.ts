/**
 * Strips redundant content from the rendered recipe body — the title heading
 * and hero image embed — when the recipe view already displays them separately.
 */
import { findHeadingIndex } from "./recipe-heading-search";

export interface BodyCleanOptions {
	stripTitle: boolean;
	stripImage: boolean;
	title?: string;
	imageValue?: string;
}

// Unwrap wikilink/embed syntax to bare filename: ![[x|alias]] → x, [[x#anchor]] → x
function resolveImageTarget(value: string): string {
	const wikiMatch = value.match(/^!?\[\[([^\]#|]+)/);
	if (wikiMatch) return wikiMatch[1].trim();
	return value.trim();
}

const EXCESS_BLANK_RE = /\n{3,}/g;

export function stripRedundantBodyContent(body: string, options: BodyCleanOptions): string {
	let lines = body.split("\n");

	if (options.stripTitle && options.title) {
		const { index } = findHeadingIndex(lines, options.title);
		if (index >= 0 && lines[index].startsWith("# ")) {
			lines.splice(index, 1);
		}
	}

	if (options.stripImage && options.imageValue) {
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
