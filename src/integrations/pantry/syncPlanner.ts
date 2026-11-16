/**
 * Decides what a sync run should do. Pure: no I/O, no clock. Identity is the
 * ingredient key. `links` remembers key -> Pantry item id and the done state
 * both sides agreed on last time (the "base" of the three-way compare).
 */
import { LocalItem } from "./groceryLines";

export interface RemoteEntry {
	id: number;
	/** Ingredient key derived from the Pantry name and quantity. May be null when unparseable. */
	key: string | null;
	/** Line text to use when this item is created locally. */
	text: string;
	done: boolean;
	deleted: boolean;
	categoryName: string | null;
}

export interface LinkState {
	id: number;
	base: boolean;
}

export type Links = Record<string, LinkState>;

export type Action =
	| { type: "createRemote"; key: string; text: string; checked: boolean; category: string | null }
	| { type: "pushDone"; key: string; id: number; done: boolean }
	| { type: "pullDone"; key: string; id: number; done: boolean }
	| { type: "updateBase"; key: string; id: number; base: boolean }
	/** Re-links a line to an existing Pantry item (repair). Writes below make both sides equal to `done`. */
	| { type: "adopt"; key: string; id: number; done: boolean; pushRemote: boolean; pullLocal: boolean }
	| { type: "createLocal"; id: number; key: string; text: string; done: boolean; category: string | null }
	| { type: "removeLocal"; key: string; id: number }
	| { type: "deleteRemote"; id: number; key: string | null };

export interface PlanInput {
	local: LocalItem[];
	remote: RemoteEntry[];
	links: Links;
	/** False when the remote read was cut off. Then absence proves nothing, so no deletions are planned. */
	remoteComplete: boolean;
}

export function planSync({ local, remote, links, remoteComplete }: PlanInput): Action[] {
	const actions: Action[] = [];
	const remoteById = new Map(remote.map((r) => [r.id, r]));
	const localKeys = new Set(local.map((l) => l.key));
	const linkedIds = new Set(Object.values(links).map((l) => l.id));
	const claimed = new Set<number>();

	for (const item of local) {
		const link = links[item.key];

		if (link) {
			const r = remoteById.get(link.id);
			if (r && !r.deleted) {
				claimed.add(r.id);
				planDone(actions, item.key, r.id, item.checked, r.done, link.base);
			} else if (remoteComplete) {
				// Deleted in Pantry on purpose: the line goes too.
				actions.push({ type: "removeLocal", key: item.key, id: link.id });
			}
			continue;
		}

		// Unlinked: first try to repair by name (lost link data, second device,
		// regenerated list), and only create when nothing matches.
		const matches = remote
			.filter((r) => !r.deleted && r.key === item.key && !linkedIds.has(r.id) && !claimed.has(r.id))
			.sort((a, b) => a.id - b.id);
		if (matches.length === 0) {
			actions.push({ type: "createRemote", key: item.key, text: item.text, checked: item.checked, category: item.category });
			continue;
		}
		const keep = matches[0];
		claimed.add(keep.id);
		// Base is unknown after a repair. Checked wins: checking an item off in
		// the store is the real world action and the more costly one to lose.
		const done = item.checked || keep.done;
		actions.push({ type: "adopt", key: item.key, id: keep.id, done, pushRemote: keep.done !== done, pullLocal: item.checked !== done });
		// Duplicates left behind by two devices pushing the same line: keep the lowest id.
		for (const dup of matches.slice(1)) {
			claimed.add(dup.id);
			actions.push({ type: "deleteRemote", id: dup.id, key: dup.key });
		}
	}

	// Links whose key no longer has a line: the user deleted the line locally.
	for (const [key, link] of Object.entries(links)) {
		if (localKeys.has(key)) continue;
		const r = remoteById.get(link.id);
		if (r && !r.deleted) {
			claimed.add(r.id);
			actions.push({ type: "deleteRemote", id: link.id, key });
		}
	}

	// Everything left in Pantry is new there. Ids we already link are never
	// brought back: they went through the delete path above, which prevents a delete/recreate loop.
	const createdKeys = new Set<string>();
	for (const r of remote) {
		if (r.deleted || claimed.has(r.id) || linkedIds.has(r.id)) continue;
		// A second Pantry item with a key the note already has (or is about to get)
		// would add a line the scanner ignores as a duplicate, so the item would be
		// "new" again on every run and the note would grow. Leave it alone instead.
		// An item whose text yields no key could never be found again by key either.
		if (!r.key || localKeys.has(r.key) || createdKeys.has(r.key)) continue;
		createdKeys.add(r.key);
		actions.push({ type: "createLocal", id: r.id, key: r.key, text: r.text, done: r.done, category: r.categoryName });
	}
	return actions;
}

/**
 * Three-way compare on done state. With booleans, "both sides changed" always
 * means they now agree, so a true conflict cannot occur once a base exists.
 */
function planDone(actions: Action[], key: string, id: number, local: boolean, remote: boolean, base: boolean): void {
	if (local === remote) {
		if (base !== local) actions.push({ type: "updateBase", key, id, base: local });
		return;
	}
	if (remote === base) actions.push({ type: "pushDone", key, id, done: local });
	else actions.push({ type: "pullDone", key, id, done: remote });
}
