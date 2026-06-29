/**
 * Rewrites field-name references inside mode filters and rules when a
 * configurable property-name setting changes. Both writes (the setting itself
 * and the mode rewrite) should happen together in the same save call.
 */
import type { SuggesterMode } from "./strategy-types";

/**
 * Returns a new modes array with every filter/rule that referenced `oldName`
 * updated to `newName`. No-ops when old and new are the same or either is empty.
 */
export function migrateModeFieldReferences(
	modes: SuggesterMode[],
	oldName: string,
	newName: string,
): SuggesterMode[] {
	if (!oldName || !newName || oldName === newName) return modes;
	return modes.map((mode) => ({
		...mode,
		filters: mode.filters.map((f) => f.field === oldName ? { ...f, field: newName } : f),
		rules:   mode.rules.map((r)   => r.field === oldName ? { ...r, field: newName } : r),
	}));
}
