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
	for (const i of initial) items.set(i.id, { quantity: "", done: false, categoryId: null, deleted: false, archived: false, ...i });
	const calls = { create: [] as unknown[], setDone: [] as unknown[], del: [] as number[] };
	const client = {
		listCategories: async () => categories,
		listItems: async () => ({ items: [...items.values()], truncated: false }),
		createItem: async (_l: number, name: string, categoryId: number | null) => {
			calls.create.push({ name, categoryId });
			const item: PantryItem = { id: nextId++, name, quantity: "", done: false, categoryId, deleted: false, archived: false };
			items.set(item.id, item);
			return item;
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
		expect(Object.keys(again.links).sort()).toEqual(["eggs", "milk"]);
	});

	it("pushes a local check and pulls a remote check (acceptance 3)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk" }, { id: 2, name: "eggs" }]);
		const links: Links = { milk: { id: 1, base: false }, eggs: { id: 2, base: false } };
		note.state.text = note.state.text.replace("- [ ] milk", "- [x] milk");
		pantry.items.get(2)!.done = true;
		const r = await runSync(deps(pantry, note, links));
		expect(pantry.items.get(1)!.done).toBe(true);
		expect(note.state.text).toContain("- [x] eggs");
		expect(r.links.milk.base).toBe(true);
		expect(r.links.eggs.base).toBe(true);
	});

	it("an uncheck in Obsidian unchecks in Pantry (acceptance 5)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n");
		const pantry = fakePantry([{ id: 1, name: "milk", done: true }]);
		await runSync(deps(pantry, note, { milk: { id: 1, base: true } }));
		expect(pantry.items.get(1)!.done).toBe(false);
	});

	it("a line deleted in Obsidian soft deletes the item and it does not come back (acceptance 6, 11)", async () => {
		const note = fakeNote("## Other\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk" }, { id: 2, name: "eggs" }]);
		const links: Links = { milk: { id: 1, base: false }, eggs: { id: 2, base: false } };
		const r = await runSync(deps(pantry, note, links));
		expect(pantry.calls.del).toEqual([1]);
		expect(r.links.milk).toBeUndefined();
		await runSync(deps(pantry, note, r.links));
		expect(note.state.text).not.toContain("milk");
		expect(pantry.calls.del).toEqual([1]);
	});

	it("an item deleted in Pantry removes its line (acceptance 11)", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk", deleted: true }, { id: 2, name: "eggs" }]);
		const r = await runSync(deps(pantry, note, { milk: { id: 1, base: false }, eggs: { id: 2, base: false } }));
		expect(note.state.text).not.toContain("milk");
		expect(r.links.milk).toBeUndefined();
		expect(pantry.calls.del).toEqual([]);
	});

	it("places Pantry-added items by category, creating headings as needed (acceptance 9)", async () => {
		const note = fakeNote("# Grocery List\n\n## Dairy\n- [ ] milk\n\n## Produce\n- [ ] apples\n");
		const pantry = fakePantry([
			{ id: 1, name: "milk" }, { id: 2, name: "apples" },
			{ id: 3, name: "cheese", categoryId: 1 },
			{ id: 4, name: "soap" },
		]);
		await runSync(deps(pantry, note, { milk: { id: 1, base: false }, apples: { id: 2, base: false } }));
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
		await runSync(deps(pantry, note, { milk: { id: 1, base: false } }));
		expect(note.state.text).toContain("- [x] milk");
		expect(note.state.text).toContain("- [ ] bread");
		expect(note.state.text).toContain("- [ ] eggs");
	});

	it("a partial API failure does not advance that item's link and leaves others intact", async () => {
		const note = fakeNote("## Other\n- [x] milk\n- [ ] eggs\n");
		const pantry = fakePantry([{ id: 1, name: "milk" }, { id: 2, name: "eggs" }]);
		const original = pantry.client.setDone;
		pantry.client.setDone = async (l, id, d) => { if (id === 1) throw new PantryError("http", "boom"); return original(l, id, d); };
		const r = await runSync(deps(pantry, note, { milk: { id: 1, base: false }, eggs: { id: 2, base: false } }));
		expect(r.failed).toBe(1);
		expect(r.links.milk.base).toBe(false);
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
		await expect(runSync(deps(pantry, note, { milk: { id: 1, base: false } }))).rejects.toMatchObject({ kind: "note" });
		expect(pantry.calls.del).toEqual([]);
	});

	it("ignores archived Pantry items", async () => {
		const note = fakeNote("## Other\n- [ ] milk\n");
		const pantry = fakePantry([{ id: 1, name: "old", archived: true }]);
		await runSync(deps(pantry, note));
		expect(note.state.text).not.toContain("old");
	});
});
