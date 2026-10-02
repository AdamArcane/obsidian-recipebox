import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { loadRecipeForEdit } from "../../src/recipe-edit/load-recipe-for-edit";
import { applySectionEdits, SectionEdit } from "../../src/recipe-edit/apply-section-edits";
import { applyFrontmatterEdits } from "../../src/recipe-edit/apply-frontmatter-edits";
import { ImportedGroup } from "../../src/importer/recipe-extract-types";

const s = DEFAULT_SETTINGS;
const H = { ingredients: s.ingredientsHeading, steps: s.instructionsHeading, notes: s.notesHeading };

const NOTE = `---
servings: 4-6
prep: 1h 30m
---
Intro text.

## ${s.ingredientsHeading}

- 1 cup of flour
- 2 eggs #ignoreIngredient
- [[Butter]] (soft)

### Sauce

- 1 tsp salt

## ${s.instructionsHeading}

1. Mix.
2. Bake.

## ${s.notesHeading}

Keep **cold**.
- anything
`;

function edit(kind: SectionEdit["kind"], raw: string, groups?: ImportedGroup[], extra: Partial<SectionEdit> = {}): SectionEdit {
	const r = loadRecipeForEdit(raw, {}, s);
	const sec = kind === "ingredients" ? r.ingredients : r.steps;
	return {
		kind,
		heading: H[kind],
		snapshot: kind === "notes" ? r.notes.snapshot : sec.snapshot,
		groups,
		style: sec.style,
		...extra,
	};
}

describe("eligibility", () => {
	const load = (body: string) => loadRecipeForEdit(body, {}, s).ingredients.status;
	const wrap = (inner: string) => `## ${s.ingredientsHeading}\n\n${inner}\n`;
	it("accepts lists, blanks and sub-headings", () => {
		expect(load(wrap("- a\n\n### G\n- b\n* c"))).toBe("eligible");
	});
	for (const [name, inner] of [
		["paragraph", "some prose"],
		["nested bullet", "- a\n  - b"],
		["continuation line", "1. a\n   more"],
		["blockquote", "> quote"],
		["image embed", "![[pic.png]]"],
		["html comment", "<!-- x -->"],
		["table", "| a | b |"],
		["code block", "```\ncode\n```"],
		["thematic break", "- a\n***\n- b"],
	]) {
		it(`rejects ${name}`, () => expect(load(wrap(inner))).toBe("ineligible"));
	}
	it("ends at a same-level heading", () => {
		expect(load(`## ${s.ingredientsHeading}\n- a\n## Other\nprose here\n`)).toBe("eligible");
	});
	it("treats RecipeMD as ineligible", () => {
		const r = loadRecipeForEdit("# T\n\n---\n\n- a\n- b\n\n---\n\n1. Do\n", {}, s);
		expect(r.isRecipeMd).toBe(true);
		expect(r.ingredients.status).toBe("ineligible");
		expect(r.steps.status).toBe("ineligible");
	});
	it("treats an absent heading as eligible-empty", () => {
		expect(loadRecipeForEdit("just text\n", {}, s).ingredients.status).toBe("missing");
	});
});

describe("round trip and edits", () => {
	it("re-rendering loaded groups changes only that section", () => {
		const r = loadRecipeForEdit(NOTE, {}, s);
		const out = applySectionEdits(NOTE, [edit("ingredients", NOTE, r.ingredients.groups)], H);
		expect(out.kind).toBe("ok");
		if (out.kind !== "ok") return;
		expect(out.content).toBe(NOTE);
	});

	it("editing one ingredient leaves neighbours byte-identical", () => {
		const r = loadRecipeForEdit(NOTE, {}, s);
		const groups = r.ingredients.groups.map((g) => ({ ...g, items: [...g.items] }));
		groups[0].items[2] = "[[Butter]] (melted)";
		const out = applySectionEdits(NOTE, [edit("ingredients", NOTE, groups)], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content).toBe(NOTE.replace("(soft)", "(melted)"));
		expect(out.content).toContain("- 1 cup of flour");
		expect(out.content).toContain("- 2 eggs #ignoreIngredient");
	});

	it("reorders, moves across groups, adds and deletes groups", () => {
		const groups: ImportedGroup[] = [
			{ name: null, items: ["2 eggs #ignoreIngredient"] },
			{ name: "Sauce", items: ["1 tsp salt", "1 cup of flour"], headingLevel: 3 },
			{ name: "Topping", items: ["nuts"] },
		];
		const out = applySectionEdits(NOTE, [edit("ingredients", NOTE, groups)], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content).toContain(`## ${s.ingredientsHeading}\n\n- 2 eggs #ignoreIngredient\n\n### Sauce\n\n- 1 tsp salt\n- 1 cup of flour\n\n### Topping\n\n- nuts\n\n## ${s.instructionsHeading}`);
	});

	it("renumbers ordered steps per group", () => {
		const groups: ImportedGroup[] = [{ name: null, items: ["Bake.", "Mix.", "Serve."] }];
		const out = applySectionEdits(NOTE, [edit("steps", NOTE, groups)], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content).toContain("1. Bake.\n2. Mix.\n3. Serve.\n");
	});

	it("writes notes verbatim", () => {
		const r = loadRecipeForEdit(NOTE, {}, s);
		expect(r.notes.text).toBe("Keep **cold**.\n- anything");
		const out = applySectionEdits(NOTE, [{
			kind: "notes", heading: H.notes, snapshot: r.notes.snapshot, style: r.steps.style, notesText: "New note\n* kept",
		}], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content.endsWith("## Notes\n\nNew note\n* kept\n")).toBe(true);
	});

	it("returns a conflict when the section changed on disk", () => {
		const e = edit("ingredients", NOTE, [{ name: null, items: ["x"] }]);
		const changed = NOTE.replace("2 eggs", "3 eggs");
		expect(applySectionEdits(changed, [e], H).kind).toBe("conflict");
	});

	it("keeps CRLF files CRLF", () => {
		const crlf = NOTE.replace(/\n/g, "\r\n");
		const r = loadRecipeForEdit(crlf, {}, s);
		const groups = r.ingredients.groups.map((g) => ({ ...g, items: [...g.items] }));
		groups[0].items.push("pepper");
		const e = { ...edit("ingredients", NOTE, groups), snapshot: r.ingredients.snapshot };
		const out = applySectionEdits(crlf, [e], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content.replace(/\r\n/g, "")).not.toContain("\n");
		expect(out.content).toContain("- pepper\r\n");
	});
});

describe("inserting missing sections", () => {
	const missing = (kind: SectionEdit["kind"], extra: Partial<SectionEdit> = {}): SectionEdit => ({
		kind, heading: H[kind], snapshot: null, style: { bullet: "-", ordered: kind === "steps" }, ...extra,
	});

	it("ingredients go before the instructions heading", () => {
		const raw = `Intro\n\n## ${s.instructionsHeading}\n\n1. Go.\n`;
		const out = applySectionEdits(raw, [missing("ingredients", { groups: [{ name: null, items: ["a"] }] })], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content).toBe(`Intro\n\n## ${s.ingredientsHeading}\n\n- a\n\n## ${s.instructionsHeading}\n\n1. Go.\n`);
	});

	it("ingredients go at the end when there is no instructions section", () => {
		const out = applySectionEdits("Intro\n", [missing("ingredients", { groups: [{ name: null, items: ["a"] }] })], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content).toBe(`Intro\n\n## ${s.ingredientsHeading}\n\n- a\n`.replace(/\n$/, "\n"));
	});

	it("steps go right after the ingredients section", () => {
		const raw = `## ${s.ingredientsHeading}\n\n- a\n\n## Extra\n\ntext\n`;
		const out = applySectionEdits(raw, [missing("steps", { groups: [{ name: null, items: ["Do"] }] })], H);
		if (out.kind !== "ok") throw new Error("conflict");
		expect(out.content).toBe(`## ${s.ingredientsHeading}\n\n- a\n\n## ${s.instructionsHeading}\n\n1. Do\n\n## Extra\n\ntext\n`);
	});

	it("steps and notes both missing keep document order", () => {
		const raw = `## ${s.ingredientsHeading}\n\n- a\n`;
		const out = applySectionEdits(raw, [
			missing("notes", { notesText: "hi" }),
			missing("steps", { groups: [{ name: null, items: ["Do"] }] }),
		], H);
		if (out.kind !== "ok") throw new Error("conflict");
		const c = out.content;
		expect(c.indexOf(s.instructionsHeading)).toBeLessThan(c.indexOf(s.notesHeading));
		expect(c).toContain("1. Do");
	});

	it("conflicts if a section appeared since load", () => {
		const out = applySectionEdits(NOTE, [missing("steps", { groups: [] })], H);
		expect(out.kind).toBe("conflict");
	});
});

describe("frontmatter", () => {
	it("leaves untouched raw values alone", () => {
		const fm: Record<string, unknown> = { servings: "4-6", prep: "1h 30m" };
		applyFrontmatterEdits(fm, s, { cookTime: "20" });
		expect(fm.servings).toBe("4-6");
		expect(fm.prep).toBe("1h 30m");
		expect(fm[s.cookTimeProperty]).toBe(20);
	});

	it("writes the configured key and removes the alias key", () => {
		const fm: Record<string, unknown> = { prep: 15 };
		applyFrontmatterEdits(fm, s, { prepTime: "20" });
		expect(fm[s.prepTimeProperty]).toBe(20);
		expect(fm.prep).toBeUndefined();
	});

	it("keeps non-numeric values as strings and clears on empty", () => {
		const fm: Record<string, unknown> = { prepTime: 5 };
		applyFrontmatterEdits(fm, s, { servings: "4-6", prepTime: "" });
		expect(fm[s.servingsProperty]).toBe("4-6");
		expect(fm[s.prepTimeProperty]).toBeUndefined();
	});

	it("load returns raw values", () => {
		const r = loadRecipeForEdit("body\n", { servings: "4-6", prep: "1h 30m" }, s);
		expect(r.servings).toBe("4-6");
		expect(r.prepTime).toBe("1h 30m");
	});
});
