/**
 * The single spelling rule every vocabulary lookup goes through. Kept apart from
 * the tables it feeds because the matchers, the compilers and the locale contract
 * test all need it and none of them should depend on each other.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Lowercases, strips accents and periods, and collapses whitespace, so "C. Sopa",
 * "c.  sopa" and "c sopa" all reach the same key. Matching is done on whole words
 * rather than character offsets because stripping accents changes string length.
 */
export function normalisePhrase(text: string): string {
	return text
		.normalize("NFD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.replace(/\./g, "")
		.trim()
		.replace(/\s+/g, " ");
}
