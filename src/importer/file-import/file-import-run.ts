/**
 * Sequential batch writer for file import. Vault and conversion access come in
 * through ImportDeps so this stays free of Obsidian and is unit-testable.
 *
 * Sequential on purpose: it avoids vault write races and makes filename
 * collisions inside one batch (two "Chili" recipes) deterministic.
 */
import { titleToFilename } from "../note-filename";
import type { ExtractedRecipe } from "../recipe-extract-types";
import type { ConflictPolicy, ImportUnit, ImportUnitResult } from "./file-import-types";

export interface ImportDeps {
	/** Format-specific conversion; null means the unit held no usable recipe. */
	convert(unit: ImportUnit): Promise<ExtractedRecipe | null>;
	exists(path: string): boolean;
	/**
	 * Resolves the image (bundled file or remote URL) and writes the note.
	 * Returns warnings, e.g. an image that could not be saved.
	 */
	write(unit: ImportUnit, recipe: ExtractedRecipe, path: string, folder: string): Promise<string[]>;
}

export interface ImportOptions {
	folder: string;
	policy: ConflictPolicy;
	isCancelled: () => boolean;
	onProgress: (done: number, total: number) => void;
}

export interface ImportRunResult {
	results: ImportUnitResult[];
	/** True when Stop ended the run before every unit was processed. */
	cancelled: boolean;
}

function buildPath(folder: string, title: string, n: number): string {
	const base = titleToFilename(title);
	const name = n > 1 ? `${base} (${n})` : base;
	return folder ? `${folder}/${name}.md` : `${name}.md`;
}

export async function runImport(units: ImportUnit[], deps: ImportDeps, options: ImportOptions): Promise<ImportRunResult> {
	const folder = options.folder.trim().replace(/\/+$/, "");
	const results: ImportUnitResult[] = [];
	// Lowercased: Obsidian vaults on case-insensitive filesystems treat
	// "Chili.md" and "chili.md" as the same file.
	const claimed = new Set<string>();
	const taken = (path: string) => claimed.has(path.toLowerCase()) || deps.exists(path);

	let cancelled = false;
	for (let i = 0; i < units.length; i++) {
		if (options.isCancelled()) { cancelled = true; break; }
		options.onProgress(i, units.length);
		const unit = units[i];
		try {
			const recipe = await deps.convert(unit);
			if (!recipe) {
				results.push({ label: unit.label, status: "failed", reason: "No recipe found (a title is required).", warnings: [] });
				continue;
			}

			let n = 1;
			let path = buildPath(folder, recipe.title, n);
			if (options.policy === "skip") {
				if (taken(path)) {
					results.push({ label: unit.label, status: "skipped", title: recipe.title, path, reason: "A note with this name already exists.", warnings: [] });
					continue;
				}
			} else {
				while (taken(path)) path = buildPath(folder, recipe.title, ++n);
			}

			// Claim before writing so a failure mid-write still reserves the name
			// for the rest of the batch rather than letting a later unit race it.
			claimed.add(path.toLowerCase());
			const warnings = await deps.write(unit, recipe, path, folder);
			results.push({ label: unit.label, status: "imported", title: recipe.title, path, warnings });
		} catch (err) {
			// One bad unit never aborts the batch.
			results.push({ label: unit.label, status: "failed", reason: err instanceof Error ? err.message : String(err), warnings: [] });
		}
	}
	options.onProgress(results.length, units.length);
	return { results, cancelled };
}
