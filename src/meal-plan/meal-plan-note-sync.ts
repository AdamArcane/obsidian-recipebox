/**
 * Syncs the meal plan note's wikilink entries with the plugin's settings state,
 * adding new entries, removing stale ones, and optionally auto-adding grocery
 * contributions for newly discovered recipe entries.
 */
import { App } from "obsidian";
import { ContributionMap, MealPlanEntry } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { parseIngredientLine } from "../parser/ingredient-parse";
import { ingredientKey, hasIgnoreTag } from "../parser/ingredient-clean";
import { generateEntryId } from "../utils/date";
import { localDateISO } from "../utils/date";
import { readNoteOrEmpty } from "../utils/vault-notes";
import { parseMealPlanNote } from "./meal-plan-note/parse";
import { addToGroceryNote, removeFromGroceryNote } from "../grocery/grocery-note/write";
import { recordContributions } from "../grocery/contribution-history";

export interface GroceryManagerSink {
	getSettings(): RecipeBoxSettings;
	save(): Promise<void>;
}

function resolveWikilink(app: App, wikilink: string): string | null {
	return app.metadataCache.getFirstLinkpathDest(wikilink, "")?.path ?? null;
}

function normalizeTypeValues(raw: unknown): string[] {
	const arr = Array.isArray(raw) ? raw : [raw];
	return arr.flatMap((v) => {
		if (typeof v !== "string") return [];
		return [v.replace(/^\[\[(.+?)(?:\|.*)?\]\]$/, "$1").trim().toLowerCase()];
	});
}

function hasRecipeType(app: App, filePath: string, settings: RecipeBoxSettings): boolean {
	const file = app.vault.getFileByPath(filePath);
	if (!file) return false;
	const fm = (app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
	const raw = fm[settings.recipeTypePropertyName];
	if (settings.recipeType) {
		return normalizeTypeValues(raw).includes(settings.recipeType.trim().toLowerCase());
	}
	return settings.recipeFolders.some((f) => filePath.startsWith(f + "/"));
}

export function checkTagFilter(app: App, filePath: string, tagFilter: string): boolean {
	if (!tagFilter.trim()) return true;
	const file = app.vault.getFileByPath(filePath);
	if (!file) return false;
	const fm2 = (app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
	const raw = fm2.tags;
	const tags: string[] = Array.isArray(raw) ? (raw as string[]) : typeof raw === "string" ? [raw] : [];
	const normalized = tagFilter.replace(/^#/, "").toLowerCase();
	return tags.some((t) => t.replace(/^#/, "").toLowerCase() === normalized);
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function parseRecipeContributions(app: App, filePath: string, settings: RecipeBoxSettings): Promise<ContributionMap> {
	const file = app.vault.getFileByPath(filePath);
	if (!file) return {};

	const text = await app.vault.read(file);
	const headingRe = new RegExp(`^#{1,6}\\s+${escapeRegex(settings.ingredientsHeading)}\\s*$`, "i");
	const nextHeadingRe = /^#{1,6}\s/;

	let inIngredients = false;
	const contributions: ContributionMap = {};

	for (const line of text.split("\n")) {
		if (headingRe.test(line)) { inIngredients = true; continue; }
		if (inIngredients && nextHeadingRe.test(line)) break;
		if (!inIngredients) continue;

		const parsed = parseIngredientLine(line);
		if (!parsed?.name || hasIgnoreTag(parsed.tags)) continue;

		const key = ingredientKey(parsed.name, parsed.unit);
		if (!contributions[key]) {
			contributions[key] = { name: parsed.name, unit: parsed.unit, quantity: parsed.quantity };
		} else if (parsed.quantity !== null && contributions[key].quantity !== null) {
			contributions[key] = { ...contributions[key], quantity: contributions[key].quantity + parsed.quantity };
		}
	}

	return contributions;
}

async function tryAutoAdd(app: App, entry: MealPlanEntry, settings: RecipeBoxSettings): Promise<void> {
	try {
		if (!checkTagFilter(app, entry.recipePath, settings.autoAddTagFilter)) {
			entry.autoAddProcessed = true;
			return;
		}
		const contributions = await parseRecipeContributions(app, entry.recipePath, settings);
		entry.contributions = contributions;
		entry.autoAddProcessed = true;
		if (Object.keys(contributions).length > 0) {
			recordContributions(contributions, { kind: "recipe", path: entry.recipePath, day: entry.day, mealType: entry.meal }, settings);
			await addToGroceryNote(app, contributions, settings);
		}
	} catch (err) {
		console.error(`Recipe Box: auto-add failed for ${entry.recipePath}`, err);
		entry.autoAddProcessed = true;
	}
}

export async function syncMealPlanNote(app: App, sink: GroceryManagerSink): Promise<boolean> {
	const s = sink.getSettings();
	const text = await readNoteOrEmpty(app, s.mealPlanPath);
	if (!text) return false;

	const sections = parseMealPlanNote(text, s.mealTypeFieldName);
	const noteEntries = new Map<string, { day: string | undefined; mealType: string | undefined }>();
	const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

	for (const section of sections) {
		for (const line of section.lines) {
			if (line.kind === "entry") {
				const path = resolveWikilink(app, line.wikilink);
				if (path) noteEntries.set(path, { day: line.day, mealType: line.mealType });
			} else {
				for (const m of line.raw.matchAll(WIKILINK_RE)) {
					const path = resolveWikilink(app, m[1].split("|")[0].trim());
					if (path && hasRecipeType(app, path, s)) {
						noteEntries.set(path, { day: section.header, mealType: undefined });
					}
				}
			}
		}
	}

	const existingByPath = new Map(s.state.mealPlan.map((e) => [e.recipePath, e]));
	let changed = false;

	// Removals
	const toRemove = s.state.mealPlan.filter((e) => !noteEntries.has(e.recipePath));
	for (const entry of toRemove) {
		if (Object.keys(entry.contributions).length > 0) {
			await removeFromGroceryNote(app, entry.contributions, s);
		}
	}
	if (toRemove.length > 0) {
		s.state.mealPlan = s.state.mealPlan.filter((e) => noteEntries.has(e.recipePath));
		changed = true;
	}

	// Additions / updates
	for (const [path, { day, mealType }] of noteEntries) {
		const existing = existingByPath.get(path);
		if (!existing) {
			const entry: MealPlanEntry = {
				id: generateEntryId(),
				recipePath: path,
				day,
				meal: mealType,
				addedDate: localDateISO(),
				contributions: {},
				autoAddProcessed: false,
			};
			if (s.autoAddOnSync) await tryAutoAdd(app, entry, s);
			s.state.mealPlan.push(entry);
			changed = true;
		} else if (!existing.autoAddProcessed && Object.keys(existing.contributions).length === 0 && s.autoAddOnSync) {
			await tryAutoAdd(app, existing, s);
			changed = true;
		}
	}

	if (changed) await sink.save();
	return changed;
}
