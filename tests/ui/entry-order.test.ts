import { describe, it, expect } from "vitest";
import {
	reorder, editIndexAfterMove, editIndexAfterRemove, editIndexAfterInsert, finalIndexForDrop,
} from "../../src/ui/modals/entry-order";

describe("reorder", () => {
	it("moves forward and backward to the final index", () => {
		expect(reorder(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
		expect(reorder(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
	});
});

describe("editIndexAfterMove", () => {
	it("follows the row being edited when it is the one moved", () => {
		expect(editIndexAfterMove(1, 1, 3)).toBe(3);
		expect(editIndexAfterMove(3, 3, 0)).toBe(0);
	});
	it("shifts the edited row when another row moves across it", () => {
		// a b c d, edit c (2); move a to the end -> b c d a, c is now 1
		expect(editIndexAfterMove(2, 0, 3)).toBe(1);
		// a b c d, edit b (1); move d to the front -> d a b c, b is now 2
		expect(editIndexAfterMove(1, 3, 0)).toBe(2);
	});
	it("leaves rows outside the moved range alone", () => {
		expect(editIndexAfterMove(3, 0, 1)).toBe(3);
		expect(editIndexAfterMove(0, 2, 3)).toBe(0);
		expect(editIndexAfterMove(null, 0, 1)).toBeNull();
	});
	it("stays consistent with reorder()", () => {
		const items = ["a", "b", "c", "d", "e"];
		for (let edit = 0; edit < items.length; edit++) {
			for (let from = 0; from < items.length; from++) {
				for (let to = 0; to < items.length; to++) {
					const next = reorder(items, from, to);
					expect(next[editIndexAfterMove(edit, from, to) as number]).toBe(items[edit]);
				}
			}
		}
	});
});

describe("remove / insert bookkeeping", () => {
	it("decrements when a row above the edited one is removed", () => {
		expect(editIndexAfterRemove(3, 1)).toBe(2);
		expect(editIndexAfterRemove(1, 3)).toBe(1);
		expect(editIndexAfterRemove(2, 2)).toBeNull();
	});
	it("increments when a row is inserted at or above the edited one", () => {
		expect(editIndexAfterInsert(2, 2)).toBe(3);
		expect(editIndexAfterInsert(2, 3)).toBe(2);
		expect(editIndexAfterInsert(null, 0)).toBeNull();
	});
});

describe("finalIndexForDrop", () => {
	it("accounts for the removed row when dropping below it", () => {
		expect(finalIndexForDrop(1, 4)).toBe(3);
		expect(finalIndexForDrop(3, 1)).toBe(1);
		expect(finalIndexForDrop(2, 3)).toBe(2);
	});
});
