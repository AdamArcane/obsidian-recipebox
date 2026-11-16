/**
 * Decides what a sync run should do. Pure: no I/O, no clock. Links are keyed
 * by Pantry item id, so a rename on either side keeps the item. Each link
 * remembers the ingredient key of its line, the done state both sides agreed
 * on (the "base" of the three-way compare) and the line text both sides
 * agreed on, in each side's own wording.
 */
import { LocalItem } from "./groceryLines";

export interface RemoteEntry {
	id: number;
	/** Ingredient key derived from the Pantry name and quantity. May be null when unparseable. */
	key: string | null;
	/** Pantry quantity joined to name. Used when the item is created or rewritten locally. */
	text: string;
	done: boolean;
	deleted: boolean;
	categoryName: string | null;
}

export interface LinkState {
	/** Ingredient key of the tied line. Follows the line when it is renamed. */
	key: string;
	base: boolean;
	/** Line text both sides last agreed on, as written in the note. Unknown for links saved before text sync. */
	text?: string;
	/** The same agreement in Pantry's wording. Differs from `text` when the split drops a filler word. */
	remoteText?: string;
	/** Description we last wrote to Pantry (recipe names). Unset until the first write. */
	desc?: string;
}

/** Keyed by String(Pantry item id), because JSON object keys are strings. */
export type Links = Record<string, LinkState>;

export type Action =
	| { type: "createRemote"; key: string; text: string; checked: boolean; category: string | null }
	| { type: "pushDone"; id: number; done: boolean }
	| { type: "pullDone"; key: string; id: number; done: boolean }
	| { type: "updateBase"; id: number; base: boolean }
	/** Records agreed texts without touching either side. */
	| { type: "updateTexts"; id: number; text: string; remoteText: string }
	/** Sends the line's name and quantity to Pantry. `key` is the line's current key (new after a rename). */
	| { type: "pushText"; id: number; key: string; text: string }
	/** Rewrites the line from Pantry. Carries the final checkbox state because it replaces the whole line. */
	| { type: "pullText"; id: number; key: string; newKey: string; text: string; checked: boolean }
	/** Re-links a line to an existing Pantry item (repair). Writes below make both sides equal to `done`. */
	| { type: "adopt"; key: string; id: number; done: boolean; pushRemote: boolean; pullLocal: boolean; text: string; remoteText: string }
	| { type: "createLocal"; id: number; key: string; text: string; done: boolean; category: string | null }
	| { type: "removeLocal"; key: string; id: number }
	| { type: "deleteRemote"; id: number }
	/** Forgets a link whose line and Pantry item are both gone. */
	| { type: "dropLink"; id: number };

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
	const idByKey = new Map<string, number>();
	for (const [id, link] of Object.entries(links)) idByKey.set(link.key, Number(id));
	const linkedIds = new Set(Object.keys(links).map(Number));
	const claimed = new Set<number>();
	const matched = new Set<number>();
	let unlinked: LocalItem[] = [];

	for (const item of local) {
		const id = idByKey.get(item.key);
		if (id === undefined) {
			unlinked.push(item);
			continue;
		}
		matched.add(id);
		const r = remoteById.get(id);
		if (r && !r.deleted) {
			claimed.add(id);
			planLinked(actions, item, r, id, links[String(id)], localKeys);
		} else if (remoteComplete) {
			// Deleted in Pantry on purpose: the line goes too.
			actions.push({ type: "removeLocal", key: item.key, id });
		}
	}

	// Links with no line. Most are lines the user deleted, but one deleted line
	// plus one brand new line is far more likely a rename: a rename changes the
	// ingredient key, and the key is all a plain markdown line has for identity.
	const orphanIds = [...linkedIds].filter((id) => !matched.has(id));
	const liveOrphans = orphanIds.filter((id) => {
		const r = remoteById.get(id);
		return r !== undefined && !r.deleted;
	});
	if (liveOrphans.length === 1 && unlinked.length === 1) {
		const [item] = unlinked;
		const id = liveOrphans[0];
		const r = remoteById.get(id) as RemoteEntry;
		const link = links[String(id)];
		const adoptable = remote.some((x) => !x.deleted && x.id !== id && x.key === item.key && !linkedIds.has(x.id));
		if (!adoptable && remoteUnchanged(link, r) && sameSection(item, r)) {
			claimed.add(id);
			matched.add(id);
			actions.push({ type: "pushText", id, key: item.key, text: item.text });
			const done = planDone(item.checked, r.done, link.base, id, item.key);
			if (done) actions.push(done);
			unlinked = [];
		}
	}

	// Unlinked: first try to repair by name (lost link data, second device,
	// regenerated list), and only create when nothing matches.
	for (const item of unlinked) {
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
		actions.push({
			type: "adopt", key: item.key, id: keep.id, done,
			pushRemote: keep.done !== done, pullLocal: item.checked !== done,
			text: item.text, remoteText: keep.text,
		});
		// Duplicates left behind by two devices pushing the same line: keep the lowest id.
		for (const dup of matches.slice(1)) {
			claimed.add(dup.id);
			actions.push({ type: "deleteRemote", id: dup.id });
		}
	}

	for (const id of orphanIds) {
		if (matched.has(id)) continue;
		const r = remoteById.get(id);
		if (r && !r.deleted) {
			claimed.add(id);
			actions.push({ type: "deleteRemote", id });
		} else if (remoteComplete) {
			actions.push({ type: "dropLink", id });
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

/** Done state and text for one linked, live pair. */
function planLinked(actions: Action[], item: LocalItem, r: RemoteEntry, id: number, link: LinkState, localKeys: Set<string>): void {
	const done = planDone(item.checked, r.done, link.base, id, item.key);
	const text = planText(item, r, id, link, localKeys);
	if (text?.type === "pullText") {
		// pullText rewrites the whole line, checkbox included, so it stands in for
		// pullDone. A pushDone still goes out, and the line keeps the local state it pushes.
		text.checked = done?.type === "pullDone" ? r.done : item.checked;
		if (done && done.type !== "pullDone") actions.push(done);
		actions.push(text);
		return;
	}
	if (done) actions.push(done);
	if (text) actions.push(text);
}

/**
 * Three-way compare on text. Only one side changing is simple. If both changed
 * and disagree, Pantry wins: the user edited it on purpose in the store or app,
 * and the note is protected by file recovery. Unknown base (a link from before
 * text sync) is recorded without editing anything, so an upgrade never rewrites a line.
 */
function planText(item: LocalItem, r: RemoteEntry, id: number, link: LinkState, localKeys: Set<string>): Action | null {
	if (link.text === undefined || link.remoteText === undefined) {
		return { type: "updateTexts", id, text: item.text, remoteText: r.text };
	}
	const localChanged = item.text !== link.text;
	const remoteChanged = r.text !== link.remoteText;
	if (!localChanged && !remoteChanged) return null;
	if (!remoteChanged) return { type: "pushText", id, key: item.key, text: item.text };
	if (r.text === item.text) return { type: "updateTexts", id, text: item.text, remoteText: r.text };
	// Without a key of its own, or with one another line already has, the pulled
	// text would make the line vanish from or collide in the scanner. Leave it
	// and try again once the note changes.
	if (!r.key || (r.key !== item.key && localKeys.has(r.key))) return null;
	return { type: "pullText", id, key: item.key, newKey: r.key, text: r.text, checked: item.checked };
}

/** A rename must not hide a Pantry edit, so it only counts when Pantry's text is as we left it. */
function remoteUnchanged(link: LinkState, r: RemoteEntry): boolean {
	return link.remoteText === undefined || r.text === link.remoteText;
}

/**
 * Same section: a Pantry category that names a heading must match the line's
 * heading. An item with no category fits any heading, since lines under an
 * unmatched heading are created without one.
 */
function sameSection(item: LocalItem, r: RemoteEntry): boolean {
	if (r.categoryName === null) return true;
	return item.category !== null && item.category.trim().toLowerCase() === r.categoryName.trim().toLowerCase();
}

/**
 * Three-way compare on done state. With booleans, "both sides changed" always
 * means they now agree, so a true conflict cannot occur once a base exists.
 */
function planDone(local: boolean, remote: boolean, base: boolean, id: number, key = ""): Action | null {
	if (local === remote) return base !== local ? { type: "updateBase", id, base: local } : null;
	if (remote === base) return { type: "pushDone", id, done: local };
	return { type: "pullDone", key, id, done: remote };
}
