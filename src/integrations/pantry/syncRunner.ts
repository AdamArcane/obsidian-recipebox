/**
 * One sync run: fetch, plan, push to Pantry, then write the grocery note once.
 * Never aborts for a single failed item, except an auth failure which stops
 * everything. Local edits are re-applied by key against the note's current
 * text inside the single vault.process call, so a keystroke made mid-sync is kept.
 */
import { PantryClient } from "./PantryClient";
import { KeyOf, insertItem, removeByKey, scanGroceryNote, setCheckedByKey } from "./groceryLines";
import { Action, Links, RemoteEntry, planSync } from "./syncPlanner";
import { PantryError } from "./pantryTypes";
import { SplitText } from "./splitQuantity";

export interface NoteAccess {
	exists(): boolean;
	read(): Promise<string>;
	/** Atomic read-modify-write. The callback must be pure and cheap. */
	process(fn: (text: string) => string): Promise<void>;
}

export interface RunnerDeps {
	client: Pick<PantryClient, "listCategories" | "listItems" | "createItem" | "setDone" | "deleteItem">;
	listId: number;
	keyOf: KeyOf;
	/** Splits a line into Pantry quantity and name. Omitted means the whole line is the name. */
	splitText?: (line: string) => SplitText;
	note: NoteAccess;
	links: Links;
}

export interface RunResult {
	links: Links;
	created: number;
	updated: number;
	removed: number;
	failed: number;
	truncated: boolean;
}

/** The generator's own fallback heading for uncategorized items. */
const UNCATEGORIZED = "Other";

interface LocalEdit {
	apply: (text: string) => string | null;
	onApplied: () => void;
}

export async function runSync(deps: RunnerDeps): Promise<RunResult> {
	const { client, listId, keyOf, note } = deps;
	const splitText = deps.splitText ?? ((line: string): SplitText => ({ quantity: "", name: line }));
	if (!note.exists()) throw new PantryError("note", "The grocery list note does not exist yet.");

	const links: Links = { ...deps.links };
	const text = await note.read();
	const local = scanGroceryNote(text, keyOf);
	// An empty note next to existing links looks like "user deleted every line".
	// More likely the note was swapped or emptied by accident, so stop rather than
	// soft-delete the whole Pantry list.
	if (local.length === 0 && Object.keys(links).length > 0) {
		throw new PantryError("note", "The grocery list is empty, so nothing was synced.");
	}

	const categories = await client.listCategories();
	const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
	const categoryIdByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));
	const fetched = await client.listItems(listId);

	const remote: RemoteEntry[] = fetched.items
		.filter((i) => !i.archived)
		.map((i) => {
			// Pantry's own quantity field is folded into the line text so the key
			// matches what a pushed line (quantity inside the name) would produce.
			const lineText = i.quantity ? `${i.quantity} ${i.name}` : i.name;
			return {
				id: i.id,
				key: keyOf(lineText),
				text: lineText,
				done: i.done,
				deleted: i.deleted,
				categoryName: i.categoryId !== null ? (categoryNameById.get(i.categoryId) ?? null) : null,
			};
		});

	const actions = planSync({ local, remote, links, remoteComplete: !fetched.truncated });
	const result: RunResult = { links, created: 0, updated: 0, removed: 0, failed: 0, truncated: fetched.truncated };
	const edits: LocalEdit[] = [];

	for (const action of actions) {
		try {
			await execute(action);
		} catch (err) {
			// Auth failure ends the run. Anything else is one item failing, which
			// is retried next run because its link/base was not advanced.
			if (err instanceof PantryError && err.kind === "auth") throw err;
			result.failed++;
		}
	}

	async function execute(action: Action): Promise<void> {
		switch (action.type) {
			case "createRemote": {
				const categoryId = action.category ? (categoryIdByName.get(action.category.trim().toLowerCase()) ?? null) : null;
				const { quantity, name } = splitText(action.text);
				const item = await client.createItem(listId, name, categoryId, quantity);
				// Link right away: if the toggle below fails, the next run sees
				// local checked vs remote unchecked vs base false and pushes it.
				links[action.key] = { id: item.id, base: false };
				if (action.checked) {
					await client.setDone(listId, item.id, true);
					links[action.key] = { id: item.id, base: true };
				}
				result.created++;
				return;
			}
			case "pushDone":
				await client.setDone(listId, action.id, action.done);
				links[action.key] = { id: action.id, base: action.done };
				result.updated++;
				return;
			case "updateBase":
				links[action.key] = { id: action.id, base: action.base };
				return;
			case "adopt":
				if (action.pushRemote) await client.setDone(listId, action.id, action.done);
				if (!action.pullLocal) {
					links[action.key] = { id: action.id, base: action.done };
					return;
				}
				edits.push({
					apply: (t) => setCheckedByKey(t, action.key, action.done, keyOf),
					onApplied: () => { links[action.key] = { id: action.id, base: action.done }; },
				});
				return;
			case "pullDone":
				edits.push({
					apply: (t) => setCheckedByKey(t, action.key, action.done, keyOf),
					onApplied: () => { links[action.key] = { id: action.id, base: action.done }; result.updated++; },
				});
				return;
			case "createLocal":
				edits.push({
					apply: (t) => insertItem(t, action.text, action.done, action.category ?? UNCATEGORIZED),
					onApplied: () => { links[action.key] = { id: action.id, base: action.done }; result.created++; },
				});
				return;
			case "removeLocal":
				edits.push({
					apply: (t) => removeByKey(t, action.key, keyOf),
					onApplied: () => { delete links[action.key]; result.removed++; },
				});
				return;
			case "deleteRemote":
				await client.deleteItem(listId, action.id);
				for (const [key, link] of Object.entries(links)) {
					if (link.id === action.id) delete links[key];
				}
				result.removed++;
				return;
		}
	}

	if (edits.length > 0) {
		const applied: LocalEdit[] = [];
		await note.process((current) => {
			// process() may be retried by the host, so start from a clean slate each call.
			applied.length = 0;
			let next = current;
			for (const edit of edits) {
				const out = edit.apply(next);
				// null means the line moved or vanished under us. Skip it, next run retries.
				if (out === null) continue;
				next = out;
				applied.push(edit);
			}
			return next;
		});
		for (const edit of applied) edit.onApplied();
	}
	return result;
}
