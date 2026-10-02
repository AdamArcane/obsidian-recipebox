/**
 * Pure list-reordering and "which row is being edited" bookkeeping for the
 * entry list editor. Kept DOM-free so the index math is unit testable: the
 * editor tracks the row loaded into the input fields by index, so every
 * move/remove/insert has to shift that index or the fields end up committing
 * onto the wrong row.
 */

/** Moves the item at `from` so it ends up at index `to` (its final position). */
export function reorder<T>(items: T[], from: number, to: number): T[] {
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}

export function editIndexAfterMove(editIndex: number | null, from: number, to: number): number | null {
	if (editIndex === null) return null;
	if (editIndex === from) return to;
	// Rows between the two positions shift by one in the direction opposite the move.
	if (from < to && editIndex > from && editIndex <= to) return editIndex - 1;
	if (from > to && editIndex >= to && editIndex < from) return editIndex + 1;
	return editIndex;
}

/** Null means the row being edited was the removed one. */
export function editIndexAfterRemove(editIndex: number | null, removed: number): number | null {
	if (editIndex === null || editIndex === removed) return null;
	return editIndex > removed ? editIndex - 1 : editIndex;
}

export function editIndexAfterInsert(editIndex: number | null, at: number): number | null {
	if (editIndex === null) return null;
	return editIndex >= at ? editIndex + 1 : editIndex;
}

/**
 * Converts a drop position ("insert before row k", 0..length) into the final
 * index a moved row ends up at, since removing it first shifts later rows up.
 */
export function finalIndexForDrop(from: number, insertBefore: number): number {
	return insertBefore > from ? insertBefore - 1 : insertBefore;
}
