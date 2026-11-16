import { describe, expect, it } from "vitest";
import { LocalItem } from "../../../src/integrations/pantry/groceryLines";
import { Links, RemoteEntry, planSync } from "../../../src/integrations/pantry/syncPlanner";

const local = (key: string, checked = false, category: string | null = null, text = key): LocalItem => ({ key, text, checked, category, lineIndex: 0 });
const remote = (id: number, key: string | null, done = false, extra: Partial<RemoteEntry> = {}): RemoteEntry =>
	({ id, key, text: key ?? "?", done, deleted: false, categoryName: null, ...extra });
/** A link whose texts are known, as created by a normal sync. */
const known = (key: string, text = key, remoteText = text, base = false) => ({ key, base, text, remoteText });
const plan = (l: LocalItem[], r: RemoteEntry[], links: Links = {}, complete = true) => planSync({ local: l, remote: r, links, remoteComplete: complete });

describe("done state truth table (linked item)", () => {
	// [local, remote, base] -> expected action type
	const cases: Array<[boolean, boolean, boolean, string | null]> = [
		[false, false, false, null],
		[true, true, true, null],
		[true, true, false, "updateBase"],
		[false, false, true, "updateBase"],
		[true, false, false, "pushDone"],
		[false, true, true, "pushDone"],
		[false, true, false, "pullDone"],
		[true, false, true, "pullDone"],
	];
	it.each(cases)("local=%s remote=%s base=%s", (l, r, b, expected) => {
		const actions = plan([local("milk", l)], [remote(1, "milk", r)], { 1: known("milk", "milk", "milk", b) });
		expect(actions.map((a) => a.type)).toEqual(expected ? [expected] : []);
	});
	it("pushDone carries the local state, pullDone the remote state", () => {
		expect(plan([local("m", true)], [remote(1, "m", false)], { 1: known("m", "m", "m", false) })[0]).toMatchObject({ type: "pushDone", done: true });
		expect(plan([local("m", false)], [remote(1, "m", true)], { 1: known("m", "m", "m", false) })[0]).toMatchObject({ type: "pullDone", done: true });
	});
});

describe("identity and creation", () => {
	it("unlinked line with no remote match creates remote, with category", () => {
		expect(plan([local("milk", true, "Dairy")], [])).toEqual([{ type: "createRemote", key: "milk", text: "milk", checked: true, category: "Dairy" }]);
	});
	it("linked line whose remote is gone or deleted is removed locally", () => {
		const links = { 1: known("milk", "milk", "milk", false) };
		expect(plan([local("milk")], [], links)[0]).toMatchObject({ type: "removeLocal", key: "milk" });
		expect(plan([local("milk")], [remote(1, "milk", false, { deleted: true })], links)[0]).toMatchObject({ type: "removeLocal" });
	});
	it("a truncated remote read never plans a local removal", () => {
		expect(plan([local("milk")], [], { 1: known("milk", "milk", "milk", false) }, false)).toEqual([]);
	});
	it("remote item with no line yields createLocal with its category", () => {
		expect(plan([], [remote(5, "eggs", true, { categoryName: "Dairy" })])).toEqual([
			{ type: "createLocal", id: 5, key: "eggs", text: "eggs", done: true, category: "Dairy" },
		]);
	});
	it("deleted and unkeyable remote items are never created locally", () => {
		expect(plan([], [remote(1, "a", false, { deleted: true }), remote(2, null)])).toEqual([]);
	});
});

describe("local deletion via links", () => {
	it("link with no line deletes the remote item and never recreates it locally", () => {
		const actions = plan([local("other")], [remote(1, "milk"), remote(2, "other")], { 1: known("milk", "milk", "milk", false), 2: known("other", "other", "other", false) });
		expect(actions).toEqual([{ type: "deleteRemote", id: 1 }]);
	});
	it("an already deleted remote needs no second delete, only its stale link is dropped", () => {
		expect(plan([local("x")], [remote(1, "milk", false, { deleted: true }), remote(3, "x")], { 1: known("milk", "milk", "milk", false), 3: known("x", "x", "x", false) })).toEqual([{ type: "dropLink", id: 1 }]);
	});
});

describe("repair by name (lost links)", () => {
	it("adopts a same-key remote instead of creating a duplicate", () => {
		expect(plan([local("milk", false)], [remote(7, "milk", false)])).toEqual([
			{ type: "adopt", key: "milk", id: 7, done: false, pushRemote: false, pullLocal: false, text: "milk", remoteText: "milk" },
		]);
	});
	it("unknown base: checked wins in both directions", () => {
		expect(plan([local("m", true)], [remote(7, "m", false)])[0]).toMatchObject({ type: "adopt", done: true, pushRemote: true, pullLocal: false });
		expect(plan([local("m", false)], [remote(7, "m", true)])[0]).toMatchObject({ type: "adopt", done: true, pushRemote: false, pullLocal: true });
	});
	it("duplicates: keeps the lowest id and soft deletes the rest", () => {
		const actions = plan([local("milk")], [remote(9, "milk"), remote(4, "milk"), remote(6, "milk")]);
		expect(actions[0]).toMatchObject({ type: "adopt", id: 4 });
		expect(actions.slice(1)).toEqual([{ type: "deleteRemote", id: 6 }, { type: "deleteRemote", id: 9 }]);
	});
	it("an extra Pantry duplicate of a linked line is left alone, not copied into the note", () => {
		expect(plan([local("milk")], [remote(1, "milk"), remote(2, "milk")], { 1: known("milk", "milk", "milk", false) })).toEqual([]);
	});
	it("two new remote items with one key create only one line", () => {
		expect(plan([], [remote(1, "eggs"), remote(2, "eggs")]).map((a) => a.type)).toEqual(["createLocal"]);
	});
});


describe("text edits (linked item)", () => {
	it("no change on either side plans nothing", () => {
		expect(plan([local("flour", false, null, "2 cups flour")], [remote(1, "flour", false, { text: "2 cups flour" })], { 1: known("flour", "2 cups flour") })).toEqual([]);
	});
	it("a local quantity edit is pushed", () => {
		const actions = plan([local("flour", false, null, "3 cups flour")], [remote(1, "flour", false, { text: "2 cups flour" })], { 1: known("flour", "2 cups flour") });
		expect(actions).toEqual([{ type: "pushText", id: 1, key: "flour", text: "3 cups flour" }]);
	});
	it("a Pantry edit rewrites the line and carries the checkbox", () => {
		const actions = plan([local("flour", false, null, "2 cups flour")], [remote(1, "flour", true, { text: "4 cups flour" })], { 1: known("flour", "2 cups flour") });
		// pullText replaces pullDone: one action rewrites text and checkbox together.
		expect(actions).toEqual([{ type: "pullText", id: 1, key: "flour", newKey: "flour", text: "4 cups flour", checked: true }]);
	});
	it("a Pantry rename changes the key of the line", () => {
		const actions = plan([local("milk")], [remote(1, "oat milk", false, { text: "oat milk" })], { 1: known("milk") });
		expect(actions).toEqual([{ type: "pullText", id: 1, key: "milk", newKey: "oat milk", text: "oat milk", checked: false }]);
	});
	it("both sides edited: Pantry wins", () => {
		const actions = plan([local("flour", false, null, "3 cups flour")], [remote(1, "flour", false, { text: "4 cups flour" })], { 1: known("flour", "2 cups flour") });
		expect(actions.map((a) => a.type)).toEqual(["pullText"]);
	});
	it("both sides edited to the same text only records it", () => {
		const actions = plan([local("flour", false, null, "3 cups flour")], [remote(1, "flour", false, { text: "3 cups flour" })], { 1: known("flour", "2 cups flour") });
		expect(actions).toEqual([{ type: "updateTexts", id: 1, text: "3 cups flour", remoteText: "3 cups flour" }]);
	});
	it("a local push of a different-wording remote (dropped filler) is not a Pantry edit", () => {
		const actions = plan([local("flour", false, null, "2 cups of flour")], [remote(1, "flour", false, { text: "2 cups flour" })], { 1: known("flour", "2 cups of flour", "2 cups flour") });
		expect(actions).toEqual([]);
	});
	it("a pulled key that another line already owns is not applied", () => {
		const actions = plan([local("milk"), local("oat milk")], [remote(1, "oat milk", false, { text: "oat milk" }), remote(2, "oat milk")], { 1: known("milk"), 2: known("oat milk") });
		expect(actions.some((a) => a.type === "pullText")).toBe(false);
	});
	it("a pull and a local check at once: the check is pushed and the line keeps it", () => {
		const actions = plan([local("flour", true, null, "2 cups flour")], [remote(1, "flour", false, { text: "4 cups flour" })], { 1: known("flour", "2 cups flour") });
		expect(actions).toEqual([
			{ type: "pushDone", id: 1, done: true },
			{ type: "pullText", id: 1, key: "flour", newKey: "flour", text: "4 cups flour", checked: true },
		]);
	});
	it("a link saved before text sync records both texts and edits nothing", () => {
		const actions = plan([local("flour", false, null, "2 cups flour")], [remote(1, "flour", false, { text: "1 cup flour" })], { 1: { key: "flour", base: false } });
		expect(actions).toEqual([{ type: "updateTexts", id: 1, text: "2 cups flour", remoteText: "1 cup flour" }]);
	});
});

describe("rename in Obsidian (one deleted line plus one new line)", () => {
	it("is pushed as a rename instead of delete plus create", () => {
		const actions = plan([local("oat milk", false, "Dairy")], [remote(1, "milk", false, { categoryName: "Dairy" })], { 1: known("milk") });
		expect(actions).toEqual([{ type: "pushText", id: 1, key: "oat milk", text: "oat milk" }]);
	});
	it("a rename carries a check along", () => {
		const actions = plan([local("oat milk", true)], [remote(1, "milk")], { 1: known("milk") });
		expect(actions.map((a) => a.type)).toEqual(["pushText", "pushDone"]);
	});
	it("two deleted lines and one new line is not a rename", () => {
		const actions = plan([local("bread")], [remote(1, "milk"), remote(2, "eggs")], { 1: known("milk"), 2: known("eggs") });
		expect(actions.filter((a) => a.type === "deleteRemote")).toHaveLength(2);
		expect(actions.some((a) => a.type === "createRemote")).toBe(true);
	});
	it("one deleted line and two new lines is not a rename", () => {
		const actions = plan([local("a"), local("b")], [remote(1, "milk")], { 1: known("milk") });
		expect(actions.map((a) => a.type)).toEqual(["createRemote", "createRemote", "deleteRemote"]);
	});
	it("a different section is not a rename", () => {
		const actions = plan([local("soap", false, "Household")], [remote(1, "milk", false, { categoryName: "Dairy" })], { 1: known("milk") });
		expect(actions.map((a) => a.type)).toEqual(["createRemote", "deleteRemote"]);
	});
	it("an item Pantry also edited is not a rename", () => {
		const actions = plan([local("oat milk")], [remote(1, "milk", false, { text: "milk 2%" })], { 1: known("milk") });
		expect(actions.map((a) => a.type)).toEqual(["createRemote", "deleteRemote"]);
	});
	it("a new line that matches an unlinked Pantry item is repaired, not a rename", () => {
		const actions = plan([local("eggs")], [remote(1, "milk"), remote(2, "eggs")], { 1: known("milk") });
		expect(actions.map((a) => a.type)).toEqual(["adopt", "deleteRemote"]);
	});
});

describe("stale links", () => {
	it("a link whose line and Pantry item are both gone is dropped", () => {
		expect(plan([local("x")], [remote(3, "x")], { 1: known("milk"), 3: known("x") })).toEqual([{ type: "dropLink", id: 1 }]);
	});
	it("is not dropped when the remote read was cut off", () => {
		expect(plan([local("x")], [remote(3, "x")], { 1: known("milk"), 3: known("x") }, false)).toEqual([]);
	});
});
