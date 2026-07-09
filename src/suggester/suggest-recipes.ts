/**
 * Top-level entry point for the meal suggester: filters the recipe pool using
 * section 63's engine, scores each candidate with section 64's weighted rules,
 * and returns the top N results in descending score order.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import type { SuggesterMode } from "./strategy-types";
import { DiscoveryResult } from "../discovery/discovery-cache";
import { FieldType } from "../discovery/filter-types";
import { matchesFilters } from "../discovery/filter-evaluate";
import { isRecipeFile } from "../lifecycle/recipe-file-detection";
import { scoreCandidate, computePoolRanges, CandidateMeta, extractTagsFromCache } from "./score-recipes";

export interface SuggestionResult {
	file: TFile;
	score: number;
}

/**
 * Runs the full filter-then-score pipeline for a mode.
 *
 * @param app        Obsidian app instance (for vault + metadata cache access).
 * @param settings   Plugin settings (for recipe scope and property names).
 * @param strategy   The active mode, containing filters and scoring rules.
 * @param discovery  Current discovery cache result; null falls back to "string" type for all fields.
 * @param maxResults How many top-scoring recipes to return; chosen per-run in the suggester modal.
 */
export function suggestRecipes(
	app: App,
	settings: RecipeBoxSettings,
	strategy: SuggesterMode,
	discovery: DiscoveryResult | null,
	maxResults: number,
): SuggestionResult[] {
	// Build a field-type lookup from discovery so normalization is accurate.
	const fieldTypes: Record<string, FieldType> = {};
	if (discovery) {
		for (const f of discovery.fields) {
			if (f.type !== "tag") fieldTypes[f.key] = f.type;
		}
	}

	// Collect all recipe files and their metadata in one pass.
	const candidates: Array<{ file: TFile; meta: CandidateMeta }> = [];
	for (const file of app.vault.getMarkdownFiles()) {
		if (!isRecipeFile(app, file, settings)) continue;

		const cache = app.metadataCache.getFileCache(file);
		const frontmatter = ((cache?.frontmatter ?? {}) as Record<string, unknown>);
		const tags = extractTagsFromCache(cache);
		const meta: CandidateMeta = { frontmatter, tags };

		if (!matchesFilters(frontmatter, tags, strategy.filters)) continue;
		candidates.push({ file, meta });
	}

	// Compute pool-level field ranges for normalization.
	const poolRanges = computePoolRanges(candidates.map(c => c.meta), strategy.rules, fieldTypes);

	// Score each candidate and add a random tiebreaker to shuffle equal scores.
	const scored = candidates.map(c => ({
		file: c.file,
		score: scoreCandidate(c.meta, strategy.rules, fieldTypes, poolRanges),
		tiebreak: Math.random(),
	}));

	// Sort descending; random tiebreaker resolves equal scores.
	scored.sort((a, b) => b.score - a.score || b.tiebreak - a.tiebreak);

	return scored
		.slice(0, maxResults)
		.map(r => ({ file: r.file, score: r.score }));
}

/**
 * Returns the active mode for the suggester: the marked default if one
 * exists, the last used if no default is set, or the first mode as fallback.
 */
export function resolveActiveMode(
	settings: RecipeBoxSettings,
): SuggesterMode | null {
	const modes = settings.suggesterModes;
	if (!modes.length) return null;

	const defaultMode = modes.find(s => s.isDefault);
	if (defaultMode) return defaultMode;

	const lastUsed = settings.state.lastUsedModeId
		? modes.find(s => s.id === settings.state.lastUsedModeId)
		: undefined;
	return lastUsed ?? modes[0];
}
