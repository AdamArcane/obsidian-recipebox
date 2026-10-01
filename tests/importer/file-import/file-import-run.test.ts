import { describe, it, expect } from "vitest";
import { runImport, type ImportDeps } from "../../../src/importer/file-import/file-import-run";
import type { ConflictPolicy, ImportUnit } from "../../../src/importer/file-import/file-import-types";
import { mealieToExtracted } from "../../../src/importer/file-import/adapters/mealie-to-extracted";

const unit = (name: string): ImportUnit => ({ label: `${name}.json`, data: { name }, image: null, format: "mealie" });

function setup(existing: string[] = []) {
	const written: string[] = [];
	const deps: ImportDeps = {
		convert: async (u) => (u.data as { name: string }).name === "bad" ? null : mealieToExtracted({ name: (u.data as { name: string }).name }),
		exists: (p) => existing.includes(p),
		write: async (_u, r, path) => {
			if (r.title === "boom") throw new Error("disk full");
			written.push(path);
			return [];
		},
	};
	return { deps, written };
}

const opts = (policy: ConflictPolicy, isCancelled = () => false) => ({ folder: "Recipes", policy, isCancelled, onProgress: () => {} });

describe("runImport", () => {
	it("skips existing notes and in-batch duplicates under the skip policy", async () => {
		const { deps, written } = setup(["Recipes/Soup.md"]);
		const { results } = await runImport([unit("Soup"), unit("Chili"), unit("Chili")], deps, opts("skip"));
		expect(results.map(r => r.status)).toEqual(["skipped", "imported", "skipped"]);
		expect(written).toEqual(["Recipes/Chili.md"]);
	});
	it("numbers collisions under keep-both, treating in-batch names case-insensitively", async () => {
		const { deps, written } = setup(["Recipes/Soup.md"]);
		await runImport([unit("Soup"), unit("Chili"), unit("chili"), unit("Chili")], deps, opts("keep-both"));
		expect(written).toEqual(["Recipes/Soup (2).md", "Recipes/Chili.md", "Recipes/chili (2).md", "Recipes/Chili (3).md"]);
	});
	it("does not abort the batch on a bad or throwing unit", async () => {
		const { deps } = setup();
		const { results } = await runImport([unit("bad"), unit("boom"), unit("Ok")], deps, opts("skip"));
		expect(results.map(r => r.status)).toEqual(["failed", "failed", "imported"]);
		expect(results[1].reason).toBe("disk full");
	});
	it("stops after the current recipe when cancelled", async () => {
		const { deps, written } = setup();
		let calls = 0;
		const { results, cancelled } = await runImport([unit("A"), unit("B"), unit("C")], deps, opts("skip", () => calls++ >= 1));
		expect(cancelled).toBe(true);
		expect(results).toHaveLength(1);
		expect(written).toEqual(["Recipes/A.md"]);
	});
});
