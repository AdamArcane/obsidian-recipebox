/**
 * Locates the ingredient block of a RecipeMD note, which separates title,
 * ingredients and instructions with thematic breaks instead of headings:
 *
 *   # Title
 *   ---
 *   - *600g* flour
 *   ---
 *   1. Mix.
 *
 * Used only when no ingredients heading is present, so heading-based recipes
 * keep their existing behaviour.
 */
const THEMATIC_BREAK = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;

export interface RecipeMdRange {
	/** First line of the ingredient block. */
	start: number;
	/** Line of the closing break, exclusive. */
	end: number;
}

const BULLET_ITEM = /^\s*[-*+]\s/;
const HEADING = /^#{1,6}\s/;

/**
 * With the closing break absent, everything after the opening one must read as an
 * ingredient block: bullets and group headings only. A numbered line means the
 * note has instructions and simply uses a horizontal rule, so it is not RecipeMD.
 */
function looksLikeIngredientsOnly(lines: string[]): boolean {
	let bullets = 0;
	for (const line of lines) {
		if (!line.trim()) continue;
		if (BULLET_ITEM.test(line)) { bullets++; continue; }
		if (HEADING.test(line)) continue;
		return false;
	}
	return bullets > 0;
}

export function findRecipeMdIngredients(lines: string[]): RecipeMdRange | null {
	const breaks: number[] = [];
	for (let i = 0; i < lines.length && breaks.length < 2; i++) {
		if (THEMATIC_BREAK.test(lines[i])) breaks.push(i);
	}

	if (breaks.length === 0) return null;

	if (breaks.length === 1) {
		// The spec allows omitting the closing break when a recipe has no
		// instructions. Accept that only when the remainder is unambiguous, so an
		// ordinary horizontal rule in a prose note is not mistaken for one.
		const rest = lines.slice(breaks[0] + 1);
		return looksLikeIngredientsOnly(rest) ? { start: breaks[0] + 1, end: lines.length } : null;
	}

	return { start: breaks[0] + 1, end: breaks[1] };
}
