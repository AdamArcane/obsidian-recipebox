/**
 * Groups file entries into recipe units: one parsed JSON plus, for zip
 * contents, its bundled image. A top-level array or an @graph holding several
 * recipes expands into several units.
 */
import { imageExtensionFromFilename } from "./image-filename";
import { isJsonObject, findSchemaRecipe, type JsonObject } from "./file-import-detect";
import type { FileEntry, ImageAsset, ImportProblem, ImportUnit } from "./file-import-types";

export interface GroupResult {
	units: ImportUnit[];
	problems: ImportProblem[];
}

function dirname(path: string): string {
	const i = path.lastIndexOf("/");
	return i === -1 ? "" : path.slice(0, i);
}

function basename(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1);
}

/** Lower is better: prefer the full-size image over thumbnails. */
function imageRank(path: string): number {
	const name = basename(path).toLowerCase();
	if (name.startsWith("full") || name.startsWith("original")) return 0;
	if (name.startsWith("thumb")) return 2;
	return 1;
}

/**
 * Splits one parsed JSON value into per-recipe values. For an @graph with
 * several recipes each unit keeps the whole graph's non-recipe nodes (people,
 * organizations) so author references still resolve.
 */
export function expandRecipes(data: unknown): unknown[] {
	if (Array.isArray(data)) return data;
	if (isJsonObject(data) && Array.isArray(data["@graph"])) {
		const graph = data["@graph"] as unknown[];
		const recipes = graph.filter(n => isJsonObject(n) && findSchemaRecipe(n) !== null);
		if (recipes.length > 1) {
			const others = graph.filter(n => !recipes.includes(n));
			const rest: JsonObject = { ...data };
			return recipes.map(r => ({ ...rest, "@graph": [r, ...others] }));
		}
	}
	return [data];
}

export function groupIntoUnits(entries: FileEntry[]): GroupResult {
	const jsons = entries.filter(e => e.path.toLowerCase().endsWith(".json"));
	// Mealie also stores timeline photos under images/timeline/<id>/ with the
	// same names as the real recipe image; they are not the recipe's picture.
	const images = entries.filter(e => e.fromZip && imageExtensionFromFilename(e.path) !== null && !e.path.includes("/timeline/"));

	// An image can only be attributed to a recipe when that recipe is the sole
	// JSON in its folder; otherwise (a folder of many loose exports) any
	// pairing would be a guess.
	const jsonsPerDir = new Map<string, number>();
	for (const j of jsons) jsonsPerDir.set(dirname(j.path), (jsonsPerDir.get(dirname(j.path)) ?? 0) + 1);

	const units: ImportUnit[] = [];
	const problems: ImportProblem[] = [];

	for (const entry of jsons) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(new TextDecoder().decode(entry.bytes));
		} catch {
			problems.push({ label: entry.path, reason: "Not valid JSON." });
			continue;
		}

		const values = expandRecipes(parsed);
		const dir = dirname(entry.path);
		let image: ImageAsset | null = null;
		if (entry.fromZip && values.length === 1 && jsonsPerDir.get(dir) === 1) {
			// Images may sit beside the JSON or in a subfolder such as images/.
			const candidates = images
				.filter(i => dirname(i.path) === dir || dirname(i.path).startsWith(`${dir}/`))
				.sort((a, b) => imageRank(a.path) - imageRank(b.path));
			if (candidates[0]) image = { path: candidates[0].path, bytes: candidates[0].bytes };
		}

		values.forEach((data, i) => {
			units.push({
				label: values.length > 1 ? `${entry.path}#${i + 1}` : entry.path,
				data,
				image,
				format: null,
			});
		});
	}
	return { units, problems };
}
