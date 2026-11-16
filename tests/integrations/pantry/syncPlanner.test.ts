import { describe, expect, it } from "vitest";
import { LocalItem } from "../../../src/integrations/pantry/groceryLines";
import { Links, RemoteEntry, planSync } from "../../../src/integrations/pantry/syncPlanner";

const local = (key: string, checked = false, category: string | null = null): LocalItem => ({ key, text: key, checked, category, lineIndex: 0 });
const remote = (id: number, key: string | null, done = false, extra: Partial<RemoteEntry> = {}): RemoteEntry =>
	({ id, key, text: key ?? "?", done, deleted: false, categoryName: null, ...extra });
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
		const actions = plan([local("milk", l)], [remote(1, "milk", r)], { milk: { id: 1, base: b } });
		expect(actions.map((a) => a.type)).toEqual(expected ? [expected] : []);
	});
	it("pushDone carries the local state, pullDone the remote state", () => {
		expect(plan([local("m", true)], [remote(1, "m", false)], { m: { id: 1, base: false } })[0]).toMatchObject({ type: "pushDone", done: true });
		expect(plan([local("m", false)], [remote(1, "m", true)], { m: { id: 1, base: false } })[0]).toMatchObject({ type: "pullDone", done: true });
	});
});

describe("identity and creation", () => {
	it("unlinked line with no remote match creates remote, with category", () => {
		expect(plan([local("milk", true, "Dairy")], [])).toEqual([{ type: "createRemote", key: "milk", text: "milk", checked: true, category: "Dairy" }]);
	});
	it("linked line whose remote is gone or deleted is removed locally", () => {
		const links = { milk: { id: 1, base: false } };
		expect(plan([local("milk")], [], links)[0]).toMatchObject({ type: "removeLocal", key: "milk" });
		expect(plan([local("milk")], [remote(1, "milk", false, { deleted: true })], links)[0]).toMatchObject({ type: "removeLocal" });
	});
	it("a truncated remote read never plans a local removal", () => {
		expect(plan([local("milk")], [], { milk: { id: 1, base: false } }, false)).toEqual([]);
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
		const actions = plan([local("other")], [remote(1, "milk"), remote(2, "other")], { milk: { id: 1, base: false }, other: { id: 2, base: false } });
		expect(actions).toEqual([{ type: "deleteRemote", id: 1, key: "milk" }]);
	});
	it("an already deleted remote needs no second delete", () => {
		expect(plan([local("x")], [remote(1, "milk", false, { deleted: true }), remote(3, "x")], { milk: { id: 1, base: false }, x: { id: 3, base: false } })).toEqual([]);
	});
});

describe("repair by name (lost links)", () => {
	it("adopts a same-key remote instead of creating a duplicate", () => {
		expect(plan([local("milk", false)], [remote(7, "milk", false)])).toEqual([
			{ type: "adopt", key: "milk", id: 7, done: false, pushRemote: false, pullLocal: false },
		]);
	});
	it("unknown base: checked wins in both directions", () => {
		expect(plan([local("m", true)], [remote(7, "m", false)])[0]).toMatchObject({ type: "adopt", done: true, pushRemote: true, pullLocal: false });
		expect(plan([local("m", false)], [remote(7, "m", true)])[0]).toMatchObject({ type: "adopt", done: true, pushRemote: false, pullLocal: true });
	});
	it("duplicates: keeps the lowest id and soft deletes the rest", () => {
		const actions = plan([local("milk")], [remote(9, "milk"), remote(4, "milk"), remote(6, "milk")]);
		expect(actions[0]).toMatchObject({ type: "adopt", id: 4 });
		expect(actions.slice(1)).toEqual([{ type: "deleteRemote", id: 6, key: "milk" }, { type: "deleteRemote", id: 9, key: "milk" }]);
	});
	it("an extra Pantry duplicate of a linked line is left alone, not copied into the note", () => {
		expect(plan([local("milk")], [remote(1, "milk"), remote(2, "milk")], { milk: { id: 1, base: false } })).toEqual([]);
	});
	it("two new remote items with one key create only one line", () => {
		expect(plan([], [remote(1, "eggs"), remote(2, "eggs")]).map((a) => a.type)).toEqual(["createLocal"]);
	});
});
