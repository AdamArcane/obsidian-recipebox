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

export function findRecipeMdIngredients(lines: string[]): RecipeMdRange | null {
	const breaks: number[] = [];
	for (let i = 0; i < lines.length && breaks.length < 2; i++) {
		if (THEMATIC_BREAK.test(lines[i])) breaks.push(i);
	}

	// One break is an ordinary horizontal rule, not a RecipeMD ingredient block.
	if (breaks.length < 2) return null;

	return { start: breaks[0] + 1, end: breaks[1] };
}
