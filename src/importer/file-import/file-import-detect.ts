/**
 * Classifies a parsed JSON object as a Mealie export, a schema.org Recipe, or
 * unsupported. Mealie is checked first: its JSON borrows schema.org field
 * names (recipeIngredient, recipeYield) without being schema.org, so testing
 * schema.org first would misroute it and lose ingredient sections.
 */
import type { ImportFormat } from "./file-import-types";

export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasRecipeType(node: JsonObject): boolean {
	const t = node["@type"];
	if (typeof t === "string") return t === "Recipe";
	return Array.isArray(t) && t.includes("Recipe");
}

/** Returns the schema.org Recipe node at the top level or inside @graph, if any. */
export function findSchemaRecipe(data: unknown): JsonObject | null {
	if (!isJsonObject(data)) return null;
	if (hasRecipeType(data)) return data;
	const graph = data["@graph"];
	if (Array.isArray(graph)) {
		for (const node of graph) {
			if (isJsonObject(node) && hasRecipeType(node)) return node;
		}
	}
	return null;
}

// Mealie's export uses snake_case (org_url, recipe_ingredient) in current
// versions; the camelCase spellings are its older API shape, kept as a fallback.
function isMealie(data: JsonObject): boolean {
	if (typeof data.slug !== "string") return false;
	if ("org_url" in data || "orgURL" in data) return true;
	const ingredients = data.recipe_ingredient ?? data.recipeIngredient;
	return Array.isArray(ingredients) && ingredients.some(isJsonObject);
}

export function detectFormat(data: unknown): ImportFormat | null {
	if (!isJsonObject(data)) return null;
	if (isMealie(data)) return "mealie";
	if (findSchemaRecipe(data)) return "schema-org";
	return null;
}
