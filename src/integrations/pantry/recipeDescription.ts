/**
 * Builds the Pantry description for a grocery line from the recipes that
 * contributed to it. Pure. The recipe name is the note's file name, which is
 * what the user sees in Obsidian, so no vault lookup is needed.
 */
import type { GroceryContributionSource } from "../../types";

export function describeSources(contributions: Array<{ source: GroceryContributionSource }> | undefined): string {
	if (!contributions) return "";
	const names: string[] = [];
	for (const { source } of contributions) {
		if (source.kind !== "recipe") continue;
		const name = (source.path.split("/").pop() ?? source.path).replace(/\.md$/i, "").trim();
		// The same recipe can be planned on several days. Name it once.
		if (name && !names.includes(name)) names.push(name);
	}
	return names.join(", ");
}
