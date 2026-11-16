import { describe, expect, it } from "vitest";
import { mergeSettings } from "../../../src/lifecycle/settings-persistence";

const links = (items: unknown) => mergeSettings({ state: { pantryLinks: { listId: 7, items } } }).state.pantryLinks;

describe("saved Pantry links", () => {
	it("converts the old key-first format to id-first without text", () => {
		expect(links({ "2 cups flour": { id: 12, base: true } })).toEqual({ listId: 7, items: { 12: { key: "2 cups flour", base: true } } });
	});
	it("keeps the new format, including agreed texts", () => {
		const items = { 12: { key: "flour", base: false, text: "2 cups flour", remoteText: "2 cups flour", desc: "Pancakes" } };
		expect(links(items)).toEqual({ listId: 7, items });
	});
	it("drops malformed entries instead of failing", () => {
		expect(links({ junk: "x", abc: { key: "k", base: true }, 5: { key: 3, base: true } })).toEqual({ listId: 7, items: {} });
	});
});
