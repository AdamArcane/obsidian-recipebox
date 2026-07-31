/**
 * Assembles a format-agnostic snapshot of a recipe file for export. Reuses
 * the same settings-aware parser functions RecipeView.buildLayoutContext()
 * calls, stripped of view-only concerns (DOM, layout IDs, grocery items,
 * meal plan entries).
 *
 * Ingredients are parsed directly from the raw lines here rather than via
 * parseRecipeFile(), because that helper unconditionally scales quantities
 * by the note's stored multiplier -- export needs to choose between the
 * note's current multiplier and 1 (base recipe) via options.applyCurrentMultiplier.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { RecipeIngredient, IngredientGroup, InstructionGroup } from "../types";
import { RecipeMeta, readRecipeMeta } from "../parser/recipe-meta-read";
import { TrailingSection, splitTrailingSections } from "../ui/recipe-view/section-extra-content";
import { getRecipeMetaAliases } from "../parser/recipe-meta-aliases";
import { fmNum } from "../ui/recipe-view/frontmatter-read-helpers";
import { stripFrontmatter } from "../parser/recipe-frontmatter-strip";
import { stripRedundantBodyContent } from "../parser/recipe-body-clean";
import { splitBodyAroundIngredients } from "../parser/recipe-ingredient-groups";
import { splitBodyAroundInstructions } from "../parser/recipe-instruction-groups";
import { readRecipeMultiplier } from "../parser/recipe-multiplier";
import { parseIngredientLine } from "../parser/ingredient-parse";
import { unitsFromSettings } from "../parser/unit-table";
import { hasIgnoreTag } from "../parser/ingredient-clean";
import { NUTRITION_FIELDS, resolveNutritionDisplay } from "../ui/recipe-view/nutrition-fields";
import { resolveImageFile, ABSOLUTE_URL_RE } from "../ui/recipe-view/image-resolve";
import { resolveHeroImageValue } from "../parser/resolve-hero-image";
import { rescaleIngredientLine } from "./rescale-ingredient-line";

export interface RecipeExportOptions {
	includeCookHistoryAndSections: boolean;
	includeImages: boolean;
	applyCurrentMultiplier: boolean;
}

export const DEFAULT_RECIPE_EXPORT_OPTIONS: RecipeExportOptions = {
	includeCookHistoryAndSections: false,
	includeImages: false,
	applyCurrentMultiplier: false,
};

export type RecipeExportImage = { kind: "vault"; file: TFile } | { kind: "url"; url: string } | null;

export interface RecipeExportData {
	title: string;
	servings: number | null;
	multiplier: number;
	meta: RecipeMeta;
	ingredientGroups: IngredientGroup[];
	parsedIngredients: RecipeIngredient[];
	instructionGroups: InstructionGroup[];
	nutrition: Record<string, string>;
	image: RecipeExportImage;
	introContent: string;
	trailingSections: TrailingSection[];
	sourcePath: string;
}

export async function buildRecipeExportData(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	options: RecipeExportOptions,
): Promise<RecipeExportData> {
	const aliases = getRecipeMetaAliases(settings);
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter: Record<string, unknown> = cache?.frontmatter ?? {};

	const rawData = await app.vault.cachedRead(file);
	const rawBody = stripFrontmatter(rawData);

	const resolvedImageValue = resolveHeroImageValue(frontmatter, rawBody, settings);

	const body = stripRedundantBodyContent(rawBody, {
		cleanNoteBody: settings.cleanNoteBody,
		title: file.basename,
		imageValue: resolvedImageValue ?? undefined,
	});

	const { before: introContent, groups: ingredientGroups, after: afterIngredients, isRecipeMd } =
		splitBodyAroundIngredients(body, settings.ingredientsHeading);
	const { groups: instructionGroups, after: afterInstructions } =
		splitBodyAroundInstructions(afterIngredients, settings.instructionsHeading, isRecipeMd);

	const trailingSections = options.includeCookHistoryAndSections
		? splitTrailingSections(afterInstructions, settings.cookHistoryHeading)
		: [];

	const baseServings = fmNum(frontmatter, aliases.servings);
	const noteMultiplier = readRecipeMultiplier(cache);
	const multiplier = options.applyCurrentMultiplier ? noteMultiplier : 1;
	// Matches meta-banner.ts's on-screen "Serves" cell (scaled = baseServings * multiplier).
	const servings = baseServings !== null ? baseServings * multiplier : null;

	const units = unitsFromSettings(settings);
	const parsedIngredients: RecipeIngredient[] = [];
	const scaledIngredientGroups: IngredientGroup[] = ingredientGroups.map((group) => ({
		heading: group.heading,
		lines: group.lines.map((line) => rescaleIngredientLine(line, multiplier, units)),
	}));
	for (const group of ingredientGroups) {
		for (const line of group.lines) {
			const parsed = parseIngredientLine(line, units);
			if (!parsed || !parsed.name) continue;
			if (hasIgnoreTag(parsed.tags)) continue;
			parsedIngredients.push({
				...parsed,
				quantity: parsed.quantity !== null ? parsed.quantity * multiplier : null,
				sourcePath: file.path,
				sourceLabel: file.basename,
			});
		}
	}

	const nutrition: Record<string, string> = {};
	for (const field of NUTRITION_FIELDS) {
		// Matches meta-banner.ts: the per-serving/total conversion basis uses base
		// servings, not the scaled count -- the scaled count is a display-only field.
		const display = resolveNutritionDisplay(frontmatter, field, settings, baseServings, multiplier);
		if (display !== "—") nutrition[field.label] = display;
	}

	let image: RecipeExportImage = null;
	if (resolvedImageValue) {
		if (ABSOLUTE_URL_RE.test(resolvedImageValue)) {
			image = { kind: "url", url: resolvedImageValue };
		} else {
			const vaultFile = resolveImageFile(app, resolvedImageValue);
			if (vaultFile) image = { kind: "vault", file: vaultFile };
		}
	}

	return {
		title: file.basename,
		servings,
		multiplier,
		meta: readRecipeMeta(cache, settings),
		ingredientGroups: scaledIngredientGroups,
		parsedIngredients,
		instructionGroups,
		nutrition,
		image,
		introContent,
		trailingSections,
		sourcePath: file.path,
	};
}
