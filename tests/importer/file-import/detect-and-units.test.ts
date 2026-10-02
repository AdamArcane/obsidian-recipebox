import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { readFileSync } from "node:fs";
import { detectFormat } from "../../../src/importer/file-import/file-import-detect";
import { groupIntoUnits } from "../../../src/importer/file-import/file-import-units";
import { expandZip } from "../../../src/importer/file-import/file-import-read";
import type { FileEntry } from "../../../src/importer/file-import/file-import-types";

const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/file-import/${name}`, "utf8")) as unknown;
const json = (path: string, data: unknown, fromZip = false): FileEntry => ({ path, bytes: strToU8(JSON.stringify(data)), fromZip });
const img = (path: string): FileEntry => ({ path, bytes: new Uint8Array([1, 2, 3]), fromZip: true });

describe("detectFormat", () => {
	it("never classifies Mealie JSON as schema.org", () => {
		expect(detectFormat(fixture("mealie-recipe.json"))).toBe("mealie");
	});
	it("detects schema.org at top level, in an @type array, and in @graph", () => {
		expect(detectFormat(fixture("schema-org-recipe.json"))).toBe("schema-org");
		expect(detectFormat({ "@type": ["Thing", "Recipe"], name: "x" })).toBe("schema-org");
		expect(detectFormat({ "@graph": [{ "@type": "WebSite" }, { "@type": "Recipe", name: "x" }] })).toBe("schema-org");
	});
	it("rejects everything else", () => {
		expect(detectFormat({ hello: "world" })).toBeNull();
		expect(detectFormat("text")).toBeNull();
	});
});

describe("groupIntoUnits", () => {
	it("expands a top-level array into one unit per recipe", () => {
		const { units } = groupIntoUnits([json("all.json", [{ a: 1 }, { b: 2 }])]);
		expect(units.map(u => u.label)).toEqual(["all.json#1", "all.json#2"]);
	});
	it("expands a multi-recipe @graph, keeping non-recipe nodes", () => {
		const graph = { "@context": "x", "@graph": [{ "@type": "Person" }, { "@type": "Recipe", name: "A" }, { "@type": "Recipe", name: "B" }] };
		const { units } = groupIntoUnits([json("g.json", graph)]);
		expect(units).toHaveLength(2);
		expect((units[0].data as { "@graph": unknown[] })["@graph"]).toHaveLength(2);
	});
	it("attaches the preferred sibling image from a zip folder", () => {
		const { units } = groupIntoUnits([
			json("z.zip/Chili/recipe.json", { a: 1 }, true),
			img("z.zip/Chili/thumb.jpg"), img("z.zip/Chili/full.jpg"),
		]);
		expect(units[0].image?.path).toBe("z.zip/Chili/full.jpg");
	});
	it("ignores Mealie timeline images", () => {
		const { units } = groupIntoUnits([
			json("m.zip/recipes/a/a.json", { a: 1 }, true),
			img("m.zip/recipes/a/images/timeline/x/original.webp"),
		]);
		expect(units[0].image).toBeNull();
	});
	it("finds images in a subfolder, but not when several JSONs share the folder", () => {
		const one = groupIntoUnits([json("z.zip/r.json", { a: 1 }, true), img("z.zip/images/original.webp")]);
		expect(one.units[0].image).not.toBeNull();
		const many = groupIntoUnits([json("z.zip/a.json", { a: 1 }, true), json("z.zip/b.json", { b: 1 }, true), img("z.zip/x.jpg")]);
		expect(many.units.every(u => u.image === null)).toBe(true);
	});
	it("reports invalid JSON as a problem without dropping the rest", () => {
		const bad: FileEntry = { path: "bad.json", bytes: strToU8("{nope"), fromZip: false };
		const { units, problems } = groupIntoUnits([bad, json("ok.json", { a: 1 })]);
		expect(units).toHaveLength(1);
		expect(problems[0].label).toBe("bad.json");
	});
});

describe("expandZip", () => {
	it("expands entries under the zip name and skips junk", () => {
		const zip = zipSync({ "r/recipe.json": strToU8("{}"), "__MACOSX/x": strToU8("."), ".DS_Store": strToU8(".") });
		const { entries, problem } = expandZip("a.zip", zip);
		expect(problem).toBeNull();
		expect(entries.map(e => e.path)).toEqual(["a.zip/r/recipe.json"]);
	});
	it("rejects a Mealie full backup with a specific message", () => {
		const { entries, problem } = expandZip("b.zip", zipSync({ "database.json": strToU8("{}") }));
		expect(entries).toHaveLength(0);
		expect(problem).toContain("full backup");
	});
	it("reports a corrupt zip", () => {
		expect(expandZip("c.zip", new Uint8Array([1, 2, 3])).problem).not.toBeNull();
	});
});
