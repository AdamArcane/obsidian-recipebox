/**
 * Expands a stem across explicitly listed endings, for locales whose adjectives
 * carry gender and number.
 */

/**
 * This is not morphology and must not become it. The endings are spelled out at
 * the call site, so nothing is inferred from a word's shape and the rule that
 * governs qualifiers still holds: a variety word can only be lifted if someone
 * writes it out. It exists so a four-form adjective cannot ship missing one of
 * its forms, which is invisible in a flat list of two hundred words.
 */
export function inflect(stem: string, ...endings: string[]): string[] {
	return endings.map((ending) => stem + ending);
}
