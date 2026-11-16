/**
 * Keeps fr.ts in step with the code. Catalog keys are the English strings
 * themselves, so editing English copy in a t() call silently drops that string
 * back to English for French users. This test turns that into a failure.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { french } from "../../src/i18n/fr";

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap(name => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return path.endsWith(".ts") && !path.endsWith(join("i18n", "fr.ts")) ? [path] : [];
	});
}

const sources = sourceFiles("src").map(path => readFileSync(path, "utf8"));
// Source holds escape sequences as written; catalog keys hold the characters they denote.
const unescape = (text: string) => text.replace(/\\n/g, "\n").replace(/\\(["'`\\])/g, "$1");

/** Literal keys passed to t()/translateUi(), including tagged templates (${x} becomes {n}). */
function usedKeys(): Set<string> {
	const keys = new Set<string>();
	const call = /\b(?:translateUi|t)\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
	const tagged = /\b(?:translateUi|t)`((?:[^`\\]|\\.)*)`/g;
	for (const source of sources) {
		for (const m of source.matchAll(call)) keys.add(unescape(m[1] ?? m[2]));
		for (const m of source.matchAll(tagged)) {
			let index = 0;
			keys.add(m[1].replace(/\$\{[^}]*\}/g, () => "{" + index++ + "}"));
		}
	}
	return keys;
}

describe("French catalog coverage", () => {
	it("has an entry for every literal message passed to t()", () => {
		const missing = [...usedKeys()].filter(key => !(key in french));
		expect(missing).toEqual([]);
	});

	it("has no entries that no source file references", () => {
		// Built-in labels are looked up by variable (localized-labels.ts), so accept any
		// key that appears as a quoted string literal anywhere outside the catalog.
		const literals = (key: string) => [`"${key}"`, `'${key}'`, `"${key.replace(/"/g, '\\"')}"`];
		const used = usedKeys();
		const stale = Object.keys(french).filter(key =>
			!used.has(key) && !sources.some(source => literals(key).some(l => source.includes(l))));
		expect(stale).toEqual([]);
	});
});
