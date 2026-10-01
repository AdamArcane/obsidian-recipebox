/**
 * Parses the leading quantity token from an ingredient string, handling integers,
 * decimals, ASCII fractions, mixed numbers, Unicode vulgar fractions, and ranges
 * ("2-3", "1/2 - 3/4", "3 to 4"). A range reports its upper bound as `quantity`
 * and its lower bound as `min`, so callers that only know about one number keep
 * working and simply see the larger amount.
 */
import { UNICODE_FRACTIONS, UNICODE_FRACTION_PATTERN } from "./quantity-fractions";

export interface QuantityResult {
	quantity: number | null;
	rest: string;
	/** Lower bound when the amount was written as a range; absent otherwise. */
	min?: number;
}

// "-", en dash, em dash, or the word "to" (which needs spaces on both sides so
// it cannot eat the start of a word like "tomatoes").
const RANGE_SEPARATOR = /^\s*(?:[-\u2013\u2014]|\bto\b)\s*/i;

const FRACTION_SLASH = /[/⁄]/;

function tryAsciiFraction(token: string): number | null {
	const parts = token.split(FRACTION_SLASH);
	if (parts.length !== 2) return null;
	const num = parseFloat(parts[0]);
	const den = parseFloat(parts[1]);
	if (isNaN(num) || isNaN(den) || den === 0) return null;
	return num / den;
}

function parseSingleQuantity(trimmed: string): QuantityResult {
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

	// whole number, a space, then a unicode fraction e.g. "1 ½". RecipeMD writes
	// mixed amounts this way. Without this the "1" was taken alone and the "½"
	// stayed at the front of the ingredient name ("½ cups panko").
	const unicodeSpaced = trimmed.match(
		new RegExp(`^(\\d+)\\s+(${UNICODE_FRACTION_PATTERN.source})(.*)$`)
	);
	if (unicodeSpaced) {
		const whole = parseInt(unicodeSpaced[1], 10);
		const frac = UNICODE_FRACTIONS[unicodeSpaced[2]] ?? 0;
		return { quantity: whole + frac, rest: unicodeSpaced[3].trim() };
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

export function parseLeadingQuantity(input: string): QuantityResult {
	const trimmed = input.trim();
	const first = parseSingleQuantity(trimmed);
	// "a"/"an" is a word, not a digit, so "a to b" must not read as a range.
	if (first.quantity === null || /^an?\s/i.test(trimmed)) return first;

	const sep = first.rest.match(RANGE_SEPARATOR);
	if (!sep) return first;

	// Only a range when a real number follows the separator. That keeps
	// "2-inch piece ginger" and "1 to taste" from being misread: the text after
	// the separator has no leading number, so the first parse stands.
	const second = parseSingleQuantity(first.rest.slice(sep[0].length));
	if (second.quantity === null || /^an?\s/i.test(first.rest.slice(sep[0].length))) return first;
	// A descending pair is not a range ("5-1"), and a trailing "-" or "/" means
	// this was part of a longer token such as "1-2-3 sauce". A following digit is
	// fine: "2-3 12 oz cans" is a range of 12 oz cans.
	if (second.quantity < first.quantity || /^[-/]/.test(second.rest)) return first;

	if (second.quantity === first.quantity) return { quantity: first.quantity, rest: second.rest };
	return { quantity: second.quantity, min: first.quantity, rest: second.rest };
}
