/**
 * Renders RecipeExportData as a machine-readable JSON payload. This shape is
 * also the eventual share-link backend payload, so field names here are
 * load-bearing beyond just this exporter -- changing them later breaks that
 * consumer too.
 */
import { RecipeExportData, RecipeExportOptions } from "../recipe-export-data";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { stripObsidianMarkdown } from "../obsidian-markdown-strip";
import { resolveRawNutrition, RawNutrition } from "../nutrition-raw";

export interface RecipeExportJsonPayload {
	title: string;
	servings: number | null;
	multiplier: number;
	introContent: string;
	diet: string[];
	allergens: string[];
	times: { prep: number | null; cook: number | null; total: number | null };
	lastMade: string | null;
	ingredients: Array<{
		quantity: number | null;
		unit: string;
		name: string;
		note: string | null;
		tags: string[];
	}>;
	instructions: Array<{ heading: string | null; steps: string[] }>;
	nutrition: RawNutrition;
	// Reference only, no bytes -- image bundling (base64 embedding) isn't built yet.
	image: { kind: "vault" | "url"; value: string } | null;
	trailingSections: Array<{ heading: string; body: string }>;
}

export function buildRecipeExportJson(
	data: RecipeExportData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
	options: RecipeExportOptions,
): RecipeExportJsonPayload {
	return {
		title: data.title,
		servings: data.servings,
		multiplier: data.multiplier,
		introContent: stripObsidianMarkdown(data.introContent).trim(),
		diet: data.meta.diet,
		allergens: data.meta.allergens,
		times: data.meta.times,
		lastMade: options.includeCookHistoryAndSections ? data.meta.lastMade : null,
		ingredients: data.parsedIngredients.map((ing) => ({
			quantity: ing.quantity,
			unit: ing.unit,
			name: stripObsidianMarkdown(ing.name),
			note: ing.note ? stripObsidianMarkdown(ing.note) : null,
			tags: ing.tags,
		})),
		instructions: data.instructionGroups.map((group) => ({
			heading: group.heading,
			steps: group.steps.map((step) => stripObsidianMarkdown(step)),
		})),
		nutrition: resolveRawNutrition(frontmatter, settings, data.multiplier),
		image:
			data.image === null
				? null
				: data.image.kind === "url"
					? { kind: "url", value: data.image.url }
					: { kind: "vault", value: data.image.file.path },
		trailingSections: data.trailingSections.map((section) => ({
			heading: section.heading,
			body: stripObsidianMarkdown(section.body).trim(),
		})),
	};
}

export function exportRecipeJson(
	data: RecipeExportData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
	options: RecipeExportOptions,
): string {
	return JSON.stringify(buildRecipeExportJson(data, frontmatter, settings, options), null, 2);
}
