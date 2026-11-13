/**
 * Dropdown option maps shared by the settings page builders.
 */
import { t as translateUi } from "../../i18n";
export const MEAL_NOTATION_OPTIONS: Record<string, string> = {
	tag: translateUi("Obsidian tag  (#meal/dinner)"),
	dataview: translateUi("Dataview field  ([meal:: Dinner])"),
	text: translateUi("Plain text  ((dinner))"),
};

export const TIMER_RANGE_OPTIONS: Record<string, string> = {
	min: "Min",
	max: "Max",
};

export const NUTRITION_DISPLAY_OPTIONS: Record<string, string> = {
	"per-serving": translateUi("Per serving"),
	total: "Total",
};

export const NUTRITION_SOURCE_OPTIONS: Record<string, string> = {
	"per-serving": translateUi("Per serving"),
	"recipe-total": translateUi("Recipe total"),
};

export const EXPORT_FORMAT_OPTIONS: Record<string, string> = {
	"plain-markdown": translateUi("Markdown (plain)"),
	"importable-markdown": translateUi("Markdown (importable)"),
	json: "JSON",
	"json-ld": "JSON-LD",
};

export const IMAGE_STORAGE_OPTIONS: Record<string, string> = {
	"obsidian-default": translateUi("Obsidian Default"),
	"recipe-folder": translateUi("Recipe Folder"),
	custom: translateUi("Custom location"),
};
