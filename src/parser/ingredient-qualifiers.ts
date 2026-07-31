/**
 * Lifts size and preparation words out of an ingredient name and into its note,
 * so "cebola picada" and "cebola" become the same grocery line while the recipe
 * still reads "cebola (picada)".
 */
import { PhraseTable, normalisePhrase } from "./unit-table";

export interface QualifierSplit {
	name: string;
	qualifiers: string[];
}

export function extractQualifiers(name: string, table: PhraseTable): QualifierSplit {
	if (table.forms.size === 0) return { name, qualifiers: [] };

	const words = name.split(/\s+/).filter(Boolean);
	const kept: string[] = [];
	const qualifiers: string[] = [];

	for (let i = 0; i < words.length; ) {
		let matched = 0;
		// Longest first, so "em cubos" is preferred over a bare "em".
		for (let count = Math.min(table.maxWords, words.length - i); count >= 1; count--) {
			const phrase = normalisePhrase(words.slice(i, i + count).join(" "));
			const display = table.forms.get(phrase);
			if (display !== undefined) {
				// The table's own spelling, not the recipe's, so "q.b." survives the
				// trailing-punctuation strip and casing stays consistent in notes.
				qualifiers.push(display);
				matched = count;
				break;
			}
		}
		if (matched === 0) {
			kept.push(words[i]);
			i += 1;
		} else {
			i += matched;
		}
	}

	// Commas and dashes that separated a lifted qualifier would otherwise dangle.
	const cleaned = kept
		.join(" ")
		.replace(/\s*[,;]\s*$/g, "")
		.replace(/\s*[,;]\s*/g, ", ")
		.replace(/^[\s,;-]+|[\s,;-]+$/g, "")
		.trim();

	return { name: cleaned, qualifiers };
}
