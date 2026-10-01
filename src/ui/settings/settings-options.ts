/**
 * Dropdown option maps shared by the settings page builders.
 */
export const MEAL_NOTATION_OPTIONS: Record<string, string> = {
	tag: "Obsidian tag  (#meal/dinner)",
	dataview: "Dataview field  ([meal:: Dinner])",
	text: "Plain text  ((dinner))",
};

export const TIMER_RANGE_OPTIONS: Record<string, string> = {
	min: "Min",
	max: "Max",
};

export const NUTRITION_DISPLAY_OPTIONS: Record<string, string> = {
	"per-serving": "Per serving",
	total: "Total",
};

export const NUTRITION_SOURCE_OPTIONS: Record<string, string> = {
	"per-serving": "Per serving",
	"recipe-total": "Recipe total",
};

export const EXPORT_FORMAT_OPTIONS: Record<string, string> = {
	"plain-markdown": "Markdown (plain)",
	"importable-markdown": "Markdown (importable)",
	json: "JSON",
	"json-ld": "JSON-LD",
};
