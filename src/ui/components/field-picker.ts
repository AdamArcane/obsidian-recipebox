/**
 * Shared field-picker button used in the mode editor and badge edit modal.
 * Opens an Obsidian Menu so each field entry can carry a type icon.
 */
import { Menu, setIcon } from "obsidian";
import { FilterableType } from "../../discovery/filter-types";
import { DiscoveryResult } from "../../discovery/discovery-cache";
import { RecipeBoxSettings } from "../../settings/settings-types";

/** Maps a field type to the Lucide icon used by Obsidian's property panel. */
export function typeIcon(type: FilterableType, hasArrayValues = false): string {
	if (hasArrayValues) return "list";
	switch (type) {
		case "date":    return "calendar";
		case "number":  return "binary";
		case "boolean": return "check-square";
		case "tag":     return "tag";
		default:        return "type";
	}
}

/** Returns the combined sorted field list for a picker (built-ins first, then discovered). */
export function buildPickerFieldList(
	settings: RecipeBoxSettings,
	discovery: DiscoveryResult | null,
): Array<{ key: string; type: FilterableType; hasArrayValues: boolean }> {
	const builtins: Array<{ key: string; type: FilterableType; hasArrayValues: boolean }> = [
		{ key: settings.lastMadeProperty, type: "date",    hasArrayValues: false },
		{ key: settings.cookedCountProperty, type: "number",  hasArrayValues: false },
		{ key: settings.favoriteProperty,    type: "boolean", hasArrayValues: false },
	];
	const builtinKeys = new Set(builtins.map(b => b.key));
	const all = [...builtins];

	if (discovery) {
		for (const f of discovery.fields) {
			if (!builtinKeys.has(f.key)) {
				all.push({ key: f.key, type: f.type, hasArrayValues: f.hasArrayValues });
			}
		}
	}

	return all.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: "base" }));
}

/**
 * Builds a button that opens an Obsidian Menu listing all discovered fields
 * with their type icons. Returns the button element.
 *
 * @param parent      Container to append the button to.
 * @param currentValue The currently selected field key.
 * @param fields      Field list from buildPickerFieldList.
 * @param onChange    Called with the new field key when the user picks one.
 */
export function buildFieldPickerBtn(
	parent: HTMLElement,
	currentValue: string,
	fields: Array<{ key: string; type: FilterableType; hasArrayValues?: boolean }>,
	onChange: (val: string) => void,
): HTMLButtonElement {
	const btn = parent.createEl("button", { cls: "rb-field-picker-btn" });
	const iconSpan = btn.createSpan({ cls: "rb-field-picker-icon" });
	const nameSpan = btn.createSpan({ cls: "rb-field-picker-name" });
	setIcon(btn.createSpan({ cls: "rb-field-picker-chevron" }), "chevron-down");

	const updateDisplay = (val: string): void => {
		const match = fields.find(f => f.key === val);
		if (match) {
			setIcon(iconSpan, typeIcon(match.type, match.hasArrayValues));
			nameSpan.textContent = match.key;
		} else {
			iconSpan.empty();
			nameSpan.textContent = val || "-- field --";
		}
	};

	updateDisplay(currentValue);

	btn.addEventListener("click", (e) => {
		const menu = new Menu();
		menu.addItem(item => item.setTitle("-- field --").onClick(() => {
			onChange("");
			updateDisplay("");
		}));
		for (const f of fields) {
			menu.addItem(item => item.setTitle(f.key).setIcon(typeIcon(f.type, f.hasArrayValues)).onClick(() => {
				onChange(f.key);
				updateDisplay(f.key);
			}));
		}
		menu.showAtMouseEvent(e);
	});

	return btn;
}
