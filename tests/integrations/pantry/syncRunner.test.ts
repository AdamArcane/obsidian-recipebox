import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

import { NoteAccess, RunnerDeps, runSync } from "../../../src/integrations/pantry/syncRunner";
import { PantryItem, PantryError } from "../../../src/integrations/pantry/pantryTypes";
import { Links } from "../../../src/integrations/pantry/syncPlanner";

const keyOf = (t: string): string | null => t.toLowerCase() || null;

/** In-memory Pantry that behaves like the real one for the calls the runner makes. */
function fakePantry(initial: Array<Partial<PantryItem> & { id: number; name: string }> = [], categories = [{ id: 1, name: "Dairy" }]) {
	let nextId = 100;
	const items = new Map<number, PantryItem>();
	for (const i of initial) items.set(i.id, { quantity: "", description: "", done: false, categoryId: null, deleted: false, archived: false, ...i });
	const calls = { update: [] as unknown[], create: [] as unknown[], setDone: [] as unknown[], del: [] as number[] };
	const client = {
		listCategories: async () => categories,
		listItems: async () => ({ items: [...items.values()], truncated: false }),
		createItem: async (_l: number, name: string, categoryId: number | null, quantity = "") => {
			calls.create.push(quantity ? { name, categoryId, quantity } : { name, categoryId });
			const item: PantryItem = { id: nextId++, name, quantity, description: "", done: false, categoryId, deleted: false, archived: false };
			items.set(item.id, item);
			return item;
		},
		updateItem: async (_l: number, id: number, fields: { name?: string; quantity?: string; description?: string }) => {
			calls.update.push({ id, ...fields });
			const i = items.get(id)!;
			Object.assign(i, fields);
			return i;
		},
		setDone: async (_l: number, id: number, done: boolean) => { calls.setDone.push({ id, done }); const i = items.get(id); if (i) i.done = done; },
		deleteItem: async (_l: number, id: number) => { calls.del.push(id); const i = items.get(id); if (i) i.deleted = true; },
	};
	return { client, items, calls };
}

function fakeNote(initial: string) {
	const state = { text: initial, processCalls: 0 };
	const note: NoteAccess = {
		exists: () => true,
		read: async () => state.text,
		process: async (fn) => { state.processCalls++; state.text = fn(state.text); },
	};
	return { state, note };
}

const deps = (p: ReturnType<typeof fakePantry>, n: ReturnType<typeof fakeNote>, links: Links = {}): RunnerDeps =>
	({ client: p.client, listId: 1, keyOf, note: n.note, links });

describe("runSync", () => {
	it("creates 10 items with no duplicates on a second run (acceptance 2)", async () => {
		const note = fakeNote("## Other\n" + Array.from({ length: 10 }, (_, i) => `- [ ] item${i}`).join("\n") + "\n");
		const pantry = fakePantry();
		const first = await runSync(deps(pantry, note));
		expect(first.created).toBe(10);
		expect(pantry.items.size).toBe(10);
		const second = await runSync(deps(pantry, note, first.links));
		expect(pantry.items.size).toBe(10);
		expect(pantry.calls.setDone).toHaveLength(0);
		expect(second.created + second.updated + second.removed).toBe(0);
		expect(note.state.processCalls).toBe(0);
	});

	it("wiped link data creates no duplicates (acceptance 7)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n- [x] eggs\n");
		const pantry = fakePantry();
		await runSync(deps(pantry, note));
		const before = pantry.items.size;
		const again = await runSync(deps(pantry, note, {}));
		expect(pantry.items.size).toBe(before);
		expect(Object.values(again.links).map((l) => l.key).sort()).toEqual(["eggs", "milk"]);
	});

	it("pushes a local check and pulls a remote check (acceptance 3)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk" }, { id: 2, name: "eggs" }]);
		const links: Links = { 1: { key: "milk", base: false }, 2: { key: "eggs", base: false } };
		note.state.text = note.state.text.replace("- [ ] milk", "- [x] milk");
		pantry.items.get(2)!.done = true;
		const r = await runSync(deps(pantry, note, links));
		expect(pantry.items.get(1)!.done).toBe(true);
		expect(note.state.text).toContain("- [x] eggs");
		expect(r.links[1].base).toBe(true);
		expect(r.links[2].base).toBe(true);
	});

	it("an uncheck in Obsidian unchecks in Pantry (acceptance 5)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n");
		const pantry = fakePantry([{ id: 1, name: "milk", done: true }]);
		await runSync(deps(pantry, note, { 1: { key: "milk", base: true } }));
		expect(pantry.items.get(1)!.done).toBe(false);
	});

	it("a line deleted in Obsidian soft deletes the item and it does not come back (acceptance 6, 11)", async () => {
		const note = fakeNote("## Other\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk" }, { id: 2, name: "eggs" }]);
		const links: Links = { 1: { key: "milk", base: false }, 2: { key: "eggs", base: false } };
		const r = await runSync(deps(pantry, note, links));
		expect(pantry.calls.del).toEqual([1]);
		expect(r.links[1]).toBeUndefined();
		await runSync(deps(pantry, note, r.links));
		expect(note.state.text).not.toContain("milk");
		expect(pantry.calls.del).toEqual([1]);
	});

	it("an item deleted in Pantry removes its line (acceptance 11)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk", deleted: true }, { id: 2, name: "eggs" }]);
		const r = await runSync(deps(pantry, note, { 1: { key: "milk", base: false }, 2: { key: "eggs", base: false } }));
		expect(note.state.text).not.toContain("milk");
		expect(r.links[1]).toBeUndefined();
		expect(pantry.calls.del).toEqual([]);
	});

	it("places Pantry-added items by category, creating headings as needed (acceptance 9)", async () => {
		const note = fakeNote("# Grocery List\n\n## Dairy\n- [ ] milk\n\n## Produce\n- [ ] apples\n");
		const pantry = fakePantry([
			{ id: 1, name: "milk" }, { id: 2, name: "apples" },
			{ id: 3, name: "cheese", categoryId: 1 },
			{ id: 4, name: "soap" },
		]);
		await runSync(deps(pantry, note, { 1: { key: "milk", base: false }, 2: { key: "apples", base: false } }));
		const lines = note.state.text.split("\n");
		expect(lines.indexOf("- [ ] cheese")).toBe(lines.indexOf("- [ ] milk") + 1);
		expect(note.state.text.trimEnd().endsWith("## Other\n- [ ] soap")).toBe(true);
		expect(note.state.processCalls).toBe(1);
	});

	it("sends the category id only when a heading matches a Pantry category (acceptance 10)", async () => {
		const note = fakeNote("## Dairy\n- [ ] milk\n\n## Mystery\n- [ ] thing\n");
		const pantry = fakePantry();
		await runSync(deps(pantry, note));
		expect(pantry.calls.create).toEqual([{ name: "milk", categoryId: 1 }, { name: "thing", categoryId: null }]);
	});

	it("keeps an edit made mid-sync because edits apply to the current text", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n");
		const pantry = fakePantry([{ id: 1, name: "milk", done: true }, { id: 2, name: "eggs" }]);
		const realProcess = note.note.process;
		// The user types between our read and our write.
		note.note.process = async (fn) => { note.state.text += "- [ ] bread\n"; await realProcess(fn); };
		await runSync(deps(pantry, note, { 1: { key: "milk", base: false } }));
		expect(note.state.text).toContain("- [x] milk");
		expect(note.state.text).toContain("- [ ] bread");
		expect(note.state.text).toContain("- [ ] eggs");
	});

	it("a partial API failure does not advance that item's link and leaves others intact", async () => {
		const note = fakeNote("## Other\n- [x] milk\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk" }, { id: 2, name: "eggs" }]);
		const original = pantry.client.setDone;
		pantry.client.setDone = async (l, id, d) => { if (id === 1) throw new PantryError("http", "boom"); return original(l, id, d); };
		const r = await runSync(deps(pantry, note, { 1: { key: "milk", base: false }, 2: { key: "eggs", base: false } }));
		expect(r.failed).toBe(1);
		expect(r.links[1].base).toBe(false);
		expect(note.state.text).toContain("- [x] milk");
	});

	it("an auth failure stops the run and leaves the note untouched (acceptance 8)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n");
		const pantry = fakePantry([{ id: 2, name: "eggs" }]);
		pantry.client.listCategories = async () => { throw new PantryError("auth", "no"); };
		await expect(runSync(deps(pantry, note))).rejects.toMatchObject({ kind: "auth" });
		expect(note.state.text).toBe("## Other\n- [ ] milk\n");
		expect(note.state.processCalls).toBe(0);
	});

	it("refuses to wipe Pantry when the note is empty but links exist", async () => {
		const note = fakeNote("");
		const pantry = fakePantry([{ id: 1, name: "milk" }]);
		await expect(runSync(deps(pantry, note, { 1: { key: "milk", base: false } }))).rejects.toMatchObject({ kind: "note" });
		expect(pantry.calls.del).toEqual([]);
	});

	it("ignores archived Pantry items", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n");
		const pantry = fakePantry([{ id: 1, name: "old", archived: true }]);
		await runSync(deps(pantry, note));
		expect(note.state.text).not.toContain("old");
	});
});

describe("quantity split on create", () => {
	it("sends quantity and name separately", async () => {
		const pantry = fakePantry();
		const { note } = fakeNote("- [ ] 2 cups flour\n");
		await runSync({
			client: pantry.client, listId: 1, keyOf, note, links: {},
			splitText: (line) => ({ quantity: "2 cups", name: line.replace("2 cups ", "") }),
		});
		expect(pantry.calls.create).toEqual([{ name: "flour", categoryId: null, quantity: "2 cups" }]);
	});
});

describe("name and quantity edits", () => {
	const split = (line: string) => {
		const m = /^(\d+ \w+) (.+)$/.exec(line);
		return m ? { quantity: m[1], name: m[2] } : { quantity: "", name: line };
	};
	const known = (key: string, text: string, remoteText = text) => ({ key, base: false, text, remoteText });

	it("a Pantry edit rewrites the line and a second run is quiet", async () => {
		const note = fakeNote("## Other\n- [ ] 2 cups flour\n");
		const pantry = fakePantry([{ id: 1, name: "flour", quantity: "4 cups" }]);
		const links: Links = { 1: known("2 cups flour", "2 cups flour") };
		const r = await runSync({ ...deps(pantry, note, links), splitText: split });
		expect(note.state.text).toContain("- [ ] 4 cups flour");
		expect(r.links[1]).toMatchObject({ text: "4 cups flour", remoteText: "4 cups flour" });
		const again = await runSync({ ...deps(pantry, note, r.links), splitText: split });
		expect(again.updated + again.created + again.removed).toBe(0);
		expect(note.state.processCalls).toBe(1);
	});

	it("a local quantity edit is sent to Pantry with quantity and name apart", async () => {
		const note = fakeNote("## Other\n- [ ] 3 cups flour\n");
		const pantry = fakePantry([{ id: 1, name: "flour", quantity: "2 cups" }]);
		const r = await runSync({ ...deps(pantry, note, { 1: known("flour", "2 cups flour") }), keyOf: (t) => (t.includes("flour") ? "flour" : t), splitText: split });
		expect(pantry.calls.update).toEqual([{ id: 1, name: "flour", quantity: "3 cups" }]);
		expect(r.links[1]).toMatchObject({ text: "3 cups flour", remoteText: "3 cups flour" });
	});

	it("an Obsidian rename keeps the Pantry item and its link", async () => {
		const note = fakeNote("## Other\n- [ ] oat milk\n");
		const pantry = fakePantry([{ id: 1, name: "milk" }]);
		const r = await runSync({ ...deps(pantry, note, { 1: known("milk", "milk") }), splitText: split });
		expect(pantry.calls.update).toEqual([{ id: 1, name: "oat milk", quantity: "" }]);
		expect(pantry.calls.del).toEqual([]);
		expect(pantry.calls.create).toEqual([]);
		expect(r.links[1].key).toBe("oat milk");
	});
});

describe("recipe names in the description", () => {
	const describe_ = (key: string) => (key === "flour" ? "Banana Bread, Pancakes" : "");
	const withDesc = (p: ReturnType<typeof fakePantry>, n: ReturnType<typeof fakeNote>, links: Links = {}): RunnerDeps =>
		({ ...deps(p, n, links), describe: describe_ });

	it("writes recipe names to a new item and is quiet on the next run", async () => {
		const note = fakeNote("## Other\n- [ ] flour\n- [ ] salt\n");
		const pantry = fakePantry();
		const first = await runSync(withDesc(pantry, note));
		expect(pantry.calls.update).toEqual([{ id: 100, description: "Banana Bread, Pancakes" }]);
		expect(first.links[100].desc).toBe("Banana Bread, Pancakes");
		await runSync(withDesc(pantry, note, first.links));
		expect(pantry.calls.update).toHaveLength(1);
	});

	it("rewrites only when the recipes change, and clears when none remain", async () => {
		const note = fakeNote("## Other\n- [ ] flour\n");
		const pantry = fakePantry([{ id: 1, name: "flour", description: "Old Recipe" }]);
		const links: Links = { 1: { key: "flour", base: false, text: "flour", remoteText: "flour", desc: "Old Recipe" } };
		const r = await runSync(withDesc(pantry, note, links));
		expect(pantry.calls.update).toEqual([{ id: 1, description: "Banana Bread, Pancakes" }]);
		const cleared = await runSync({ ...withDesc(pantry, note, r.links), describe: () => "" });
		expect(pantry.calls.update[1]).toEqual({ id: 1, description: "" });
		expect(cleared.links[1].desc).toBe("");
	});

	it("never overwrites a description the user wrote before we wrote one", async () => {
		const note = fakeNote("## Other\n- [ ] flour\n");
		const pantry = fakePantry([{ id: 1, name: "flour", description: "the good brand" }]);
		const r = await runSync(withDesc(pantry, note, { 1: { key: "flour", base: false, text: "flour", remoteText: "flour" } }));
		expect(pantry.calls.update).toEqual([]);
		expect(r.links[1].desc).toBeUndefined();
	});
});
