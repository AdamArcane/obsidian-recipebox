/**
 * Parses the leading quantity token from an ingredient string, handling integers,
 * decimals, ASCII fractions, mixed numbers, and Unicode vulgar fractions.
 */
import { UNICODE_FRACTIONS, UNICODE_FRACTION_PATTERN } from "./quantity-fractions";

export interface QuantityResult {
	quantity: number | null;
	rest: string;
}

const FRACTION_SLASH = /[/⁄]/;

function tryAsciiFraction(token: string): number | null {
	const parts = token.split(FRACTION_SLASH);
	if (parts.length !== 2) return null;
	const num = parseFloat(parts[0]);
	const den = parseFloat(parts[1]);
	if (isNaN(num) || isNaN(den) || den === 0) return null;
	return num / den;
}

export function parseLeadingQuantity(input: string): QuantityResult {
	const trimmed = input.trim();

	// "a" or "an" followed by a space
	if (/^an?\s+\S/i.test(trimmed)) {
		return { quantity: 1, rest: trimmed.replace(/^an?\s+/i, "") };
	}

	// whole number + unicode fraction with no space e.g. "2½"
	const unicodeMixed = trimmed.match(
		new RegExp(`^(\\d+)(${UNICODE_FRACTION_PATTERN.source})(.*)$`)
	);
	if (unicodeMixed) {
		const whole = parseInt(unicodeMixed[1], 10);
		const frac = UNICODE_FRACTIONS[unicodeMixed[2]] ?? 0;
		return { quantity: whole + frac, rest: unicodeMixed[3].trim() };
	}

	// standalone unicode fraction with no preceding whole number
	const unicodeOnly = trimmed.match(
		new RegExp(`^(${UNICODE_FRACTION_PATTERN.source})(.*)$`)
	);
	if (unicodeOnly) {
		const frac = UNICODE_FRACTIONS[unicodeOnly[1]] ?? null;
		if (frac !== null) return { quantity: frac, rest: unicodeOnly[2].trim() };
	}

	// mixed number "1 1/2"
	const mixedAscii = trimmed.match(/^(\d+)\s+(\d+[/⁄]\d+)(.*)/);
	if (mixedAscii) {
		const frac = tryAsciiFraction(mixedAscii[2]);
		if (frac !== null) {
			return { quantity: parseInt(mixedAscii[1], 10) + frac, rest: mixedAscii[3].trim() };
		}
	}

	// simple ASCII fraction "1/2"
	const asciiOnly = trimmed.match(/^(\d+[/⁄]\d+)(.*)/);
	if (asciiOnly) {
		const frac = tryAsciiFraction(asciiOnly[1]);
		if (frac !== null) return { quantity: frac, rest: asciiOnly[2].trim() };
	}

	// Plain decimal or integer. Both "." and "," divide a decimal, and the leading
	// digit is optional, so ".5 teaspoon" and "1,5 kg" are amounts rather than the
	// start of an ingredient name. A comma is only a divider between digits, never
	// after them, so "2, peeled" keeps its trailing note.
	const plain = trimmed.match(/^(\d*[.,]\d+|\d+)(.*)/);
	if (plain) {
		return { quantity: parseFloat(plain[1].replace(",", ".")), rest: plain[2].trim() };
	}

	return { quantity: null, rest: trimmed };
}
