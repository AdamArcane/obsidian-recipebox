/**
 * Renders the final Markdown note for an imported recipe by substituting token
 * placeholders in a user-supplied or built-in template string.
 *
 * Token values are produced by note-template-tokens.ts; this file handles
 * grouped content (ingredients, instructions) and heading-depth detection.
 */
import { App } from "obsidian";
import { ExtractedRecipe, ImportedGroup } from "./recipe-extract-types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { buildTokenTable } from "./note-template-tokens";
import { readNoteOrEmpty } from "../utils/vault-notes";

const DEFAULT_TEMPLATE = `---
{{recipeTypePropertyName}}: {{recipeType}}
image: {{image}}
source: {{sourceUrl}}
servings: {{servings}}
prep: {{prepTime}}
cook: {{cookTime}}
total: {{totalTime}}
{{caloriesProperty}}: {{calories}}
{{proteinProperty}}: {{protein}}
{{fatProperty}}: {{fat}}
{{carbsProperty}}: {{carbs}}
{{allergensProperty}}:
---

{{description}}

## {{ingredientsHeading}}

{{ingredients}}

## {{instructionsHeading}}

{{instructions}}
`;

const MAX_HEADING_DEPTH = 6;

function subGroupHeadingPrefix(template: string, tokenPos: number): string {
	const before = template.slice(0, tokenPos);
	const lines = before.split("\n").reverse();
	for (const line of lines) {
		const m = line.match(/^(#{1,6})\s/);
		if (m) {
			const depth = Math.min(m[1].length + 1, MAX_HEADING_DEPTH);
			return "#".repeat(depth);
		}
	}
	return "###";
}

function flattenIngredients(groups: ImportedGroup[], subPrefix: string): string {
	const lines: string[] = [];
	for (const group of groups) {
		if (group.name !== null) lines.push(`${subPrefix} ${group.name}`);
		for (const item of group.items) lines.push(`- ${item}`);
	}
	return lines.join("\n");
}

function flattenInstructions(groups: ImportedGroup[], subPrefix: string): string {
	const lines: string[] = [];
	let stepNum = 1;
	for (const group of groups) {
		if (group.name !== null) lines.push(`${subPrefix} ${group.name}`);
		for (const step of group.items) {
			lines.push(`${stepNum}. ${step}`);
			stepNum++;
		}
	}
	return lines.join("\n");
}

function renderTemplate(template: string, recipe: ExtractedRecipe, tokens: Record<string, string>): string {
	let result = template;

	// Render grouped content tokens with heading-depth detection
	for (const [tokenName, groups] of [
		["ingredients", recipe.ingredientGroups],
		["instructions", recipe.instructionGroups],
	] as [string, ImportedGroup[]][]) {
		const placeholder = `{{${tokenName}}}`;
		const pos = result.indexOf(placeholder);
		if (pos < 0) continue;
		const subPrefix = subGroupHeadingPrefix(result, pos);
		const rendered =
			tokenName === "ingredients"
				? flattenIngredients(groups, subPrefix)
				: flattenInstructions(groups, subPrefix);
		result = result.slice(0, pos) + rendered + result.slice(pos + placeholder.length);
	}

	// Render all remaining scalar tokens
	for (const [key, value] of Object.entries(tokens)) {
		result = result.split(`{{${key}}}`).join(value);
	}

	return result;
}

export async function buildRecipeNote(
	app: App,
	recipe: ExtractedRecipe,
	settings: RecipeBoxSettings,
): Promise<string> {
	let template = DEFAULT_TEMPLATE;
	if (settings.importerTemplatePath) {
		const customTemplate = await readNoteOrEmpty(app, settings.importerTemplatePath);
		if (customTemplate) template = customTemplate;
	}
	const tokens = buildTokenTable(recipe, settings);
	return renderTemplate(template, recipe, tokens);
}
