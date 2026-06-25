/**
 * Detects whether an ingredient name refers to a specific cut or type of meat
 * and returns its safe-cooking temperature category if so.
 */
import { MEAT_CATEGORIES, NON_MEAT_QUALIFIERS, TempCategory } from "./meat-temps";

function wordBoundaryRegex(keyword: string): RegExp {
	const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	// Allow trailing "s" for plurals unless the keyword already ends in "s"
	const plural = keyword.endsWith("s") ? "" : "s?";
	return new RegExp(`(?<![\\w])${escaped}${plural}(?![\\w])`, "i");
}

export function detectMeatTemp(name: string): TempCategory | null {
	const lower = name.toLowerCase();

	for (const qualifier of NON_MEAT_QUALIFIERS) {
		if (wordBoundaryRegex(qualifier).test(lower)) return null;
	}

	for (const category of MEAT_CATEGORIES) {
		const sorted = [...category.keywords].sort((a, b) => b.length - a.length);
		for (const keyword of sorted) {
			if (wordBoundaryRegex(keyword).test(lower)) return category;
		}
	}

	return null;
}
