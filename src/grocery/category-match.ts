import { CategoryOverride, CategorySource } from "../types";
import { CATEGORY_KEYWORDS } from "./category-dictionary";
import { pickTagCategory } from "./category-tags";

function longestMatchCategory(name: string): string {
	const lower = name.toLowerCase();
	let bestCategory = "Other";
	let bestLength = 0;

	for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
		for (const kw of keywords) {
			if (kw.length > bestLength && lower.includes(kw.toLowerCase())) {
				bestCategory = category;
				bestLength = kw.length;
			}
		}
	}

	return bestCategory;
}

export function categorize(
	name: string,
	tags: string[] | undefined,
	overrides: CategoryOverride[],
	source: CategorySource
): string {
	const lower = name.toLowerCase();

	// 1. User-defined overrides (longest match wins)
	let overrideCategory: string | null = null;
	let overrideLength = 0;
	for (const override of overrides) {
		if (override.match.length > overrideLength && lower.includes(override.match.toLowerCase())) {
			overrideCategory = override.category;
			overrideLength = override.match.length;
		}
	}
	if (overrideCategory) return overrideCategory;

	// 2. Tag-based resolution
	if (source === "tag" || source === "tag-then-dictionary") {
		const tagCategory = pickTagCategory(tags);
		if (tagCategory) return tagCategory;
		if (source === "tag") return "Other";
	}

	// 3. Built-in keyword dictionary
	return longestMatchCategory(name);
}
