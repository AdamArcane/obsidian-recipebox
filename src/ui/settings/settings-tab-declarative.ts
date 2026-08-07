/**
 * Declarative settings definitions for Obsidian 1.13+.
 * Uses controls where possible and targeted render callbacks for complex UI.
 */
import { App, Setting, SettingDefinitionItem } from "obsidian";
import RecipeBoxPlugin from "../../main";
import { renderSectionLibrary } from "./section-library";
import { renderSectionRecipeView } from "./section-recipe-view";
import { renderSectionShopping } from "./section-shopping";
import { renderSectionSuggester } from "./section-suggester";
import { renderSectionHealthSafety } from "./section-health-safety";
import { renderSectionPropertyNames } from "./section-property-names";

const MEAL_NOTATION_OPTIONS: Record<string, string> = {
	tag: "Obsidian tag  (#meal/dinner)",
	dataview: "Dataview field  ([meal:: Dinner])",
	text: "Plain text  ((dinner))",
};

const TIMER_RANGE_OPTIONS: Record<string, string> = {
	min: "Min",
	max: "Max",
};

const NUTRITION_DISPLAY_OPTIONS: Record<string, string> = {
	"per-serving": "Per serving",
	total: "Total",
};

const NUTRITION_SOURCE_OPTIONS: Record<string, string> = {
	"per-serving": "Per serving",
	"recipe-total": "Recipe total",
};

const EXPORT_FORMAT_OPTIONS: Record<string, string> = {
	"plain-markdown": "Markdown (plain)",
	"importable-markdown": "Markdown (importable)",
	json: "JSON",
	"json-ld": "JSON-LD",
};

interface DeclarativeSettingsContext {
	app: App;
	plugin: RecipeBoxPlugin;
	containerEl: HTMLElement;
}

function renderLegacySectionInDeclarative(
	ctx: DeclarativeSettingsContext,
	setting: Setting,
	renderSection: (containerEl: HTMLElement, save: () => Promise<void>, rerender: () => void) => void,
): void {
	setting.settingEl.addClass("rb-settings-declarative-legacy-row");
	setting.nameEl.empty();
	setting.descEl.empty();
	setting.infoEl.empty();
	setting.controlEl.empty();

	const save = async (): Promise<void> => {
		await ctx.plugin.saveSettings();
	};

	const mount = (): void => {
		setting.controlEl.empty();
		const mountEl = setting.controlEl.createDiv({ cls: "rb-settings-declarative-legacy-mount" });
		renderSection(mountEl, save, rerender);
	};

	const rerender = (): void => {
		const scrollTop = ctx.containerEl.scrollTop;
		mount();
		ctx.containerEl.scrollTop = scrollTop;
	};

	mount();
}

export function buildDeclarativeSettingDefinitions(
	ctx: DeclarativeSettingsContext,
): SettingDefinitionItem[] {
	return [
		{
			type: "page",
			name: "Recipe library",
			desc: "Recipe folders, recipe type matching, dashboard toggle, and folder-click gallery behavior.",
			items: [
				{
					name: "Recipe library settings",
					aliases: ["recipe folders", "recipe type", "folder click gallery", "dashboard"],
					render: (setting) => {
						renderLegacySectionInDeclarative(ctx, setting, (containerEl, save, rerender) => {
							renderSectionLibrary(containerEl, ctx.plugin.settings, save, rerender, ctx.app);
						});
					},
				},
			],
		},
		{
			type: "page",
			name: "Notes",
			desc: "Paths and heading names for meal plan, grocery list, and recipe sections.",
			items: [
				{
					name: "Meal plan note path",
					desc: "Path to the note used as your meal plan. Supports {token} date patterns.",
					aliases: ["meal plan path", "meal plan note", "meal plans"],
					control: { type: "text", key: "mealPlanPath" },
				},
				{
					name: "Grocery list note path",
					desc: "Path to the note used as your grocery list. Supports {token} date patterns.",
					aliases: ["grocery path", "shopping list note", "groceries"],
					control: { type: "text", key: "groceryListPath" },
				},
				{
					name: "Ingredients heading",
					desc: "Heading that marks the ingredients section in a recipe note.",
					control: { type: "text", key: "ingredientsHeading" },
				},
				{
					name: "Instructions heading",
					desc: "Heading that marks the instructions section in a recipe note.",
					control: { type: "text", key: "instructionsHeading" },
				},
				{
					name: "Notes heading",
					desc: "Heading that marks the optional notes section in a recipe note.",
					control: { type: "text", key: "notesHeading" },
				},
			],
		},
		{
			type: "page",
			name: "Recipe view",
			desc: "Recipe view toggles and the header-badge editor.",
			items: [
				{
					name: "Recipe view settings",
					aliases: ["badges", "tags", "desktop layout", "default image"],
					render: (setting) => {
						renderLegacySectionInDeclarative(ctx, setting, (containerEl, save, rerender) => {
							renderSectionRecipeView(containerEl, ctx.plugin.settings, save, rerender, ctx.app, () => ctx.plugin.discoveryCache.get());
						});
					},
				},
			],
		},
		{
			type: "page",
			name: "Cooking & tracking",
			desc: "Cook history tracking and heading behavior.",
			items: [
				{
					name: "Track cook history",
					desc: "Record each cook with date, optional notes, and photo; also updates last-made and cooked-count properties.",
					aliases: ["cook history", "tracking"],
					control: { type: "toggle", key: "cookHistoryEnabled" },
				},
				{
					name: "Cook history heading name",
					desc: "Heading under which note-body history entries are appended.",
					visible: () => ctx.plugin.settings.cookHistoryEnabled,
					control: { type: "text", key: "cookHistoryHeading" },
				},
			],
		},
		{
			type: "page",
			name: "Meal plan",
			desc: "Meal notation format and grocery auto-add behavior.",
			items: [
				{
					name: "Meal type notation",
					desc: "How meal types are written in your meal plan note.",
					control: { type: "dropdown", key: "mealTypeNotation", options: MEAL_NOTATION_OPTIONS },
				},
				{
					name: "Meal type field/tag name",
					desc: "Tag or field name used in meal entries.",
					visible: () => ctx.plugin.settings.mealTypeNotation !== "text",
					control: { type: "text", key: "mealTypeFieldName" },
				},
				{
					name: "Auto-add ingredients on sync",
					desc: "Automatically add ingredients to grocery list for manually added meal plan entries.",
					control: { type: "toggle", key: "autoAddOnSync" },
				},
				{
					name: "Required tag filter",
					desc: "Only auto-add ingredients from recipes with this tag. Leave empty for all recipes.",
					visible: () => ctx.plugin.settings.autoAddOnSync,
					control: { type: "text", key: "autoAddTagFilter" },
				},
			],
		},
		{
			type: "page",
			name: "Shopping assistant",
			desc: "Grouping, category source, category order/overrides, and collapse behavior.",
			items: [
				{
					name: "Shopping assistant settings",
					aliases: ["category order", "category overrides", "grouping", "shopping"],
					render: (setting) => {
						renderLegacySectionInDeclarative(ctx, setting, (containerEl, save, rerender) => {
							renderSectionShopping(containerEl, ctx.plugin.settings, save, rerender, ctx.app, () => ctx.plugin.manager.getKnownCategories());
						});
					},
				},
			],
		},
		{
			type: "page",
			name: "Meal suggester",
			desc: "Mode list and editor for meal suggestion rules.",
			items: [
				{
					name: "Meal suggester modes",
					aliases: ["suggester", "modes", "filters", "scoring"],
					render: (setting) => {
						renderLegacySectionInDeclarative(ctx, setting, (containerEl, save, rerender) => {
							renderSectionSuggester(containerEl, ctx.plugin.settings, save, rerender, ctx.app, () => ctx.plugin.discoveryCache.get());
						});
					},
				},
			],
		},
		{
			type: "page",
			name: "Timers",
			desc: "In-recipe timer behavior.",
			items: [
				{
					name: "Enable timers",
					desc: "Show interactive countdown timers for time-based steps in recipe view.",
					control: { type: "toggle", key: "timersEnabled" },
				},
				{
					name: "Auto-start timer on click",
					visible: () => ctx.plugin.settings.timersEnabled,
					control: { type: "toggle", key: "timerAutoStart" },
				},
				{
					name: "Default to compact display",
					visible: () => ctx.plugin.settings.timersEnabled,
					control: { type: "toggle", key: "timerCompactDisplay" },
				},
				{
					name: "Time range default",
					desc: "When a step gives a range like 10-15 min, use the min or max value.",
					visible: () => ctx.plugin.settings.timersEnabled,
					control: { type: "dropdown", key: "timerRangeDefault", options: TIMER_RANGE_OPTIONS },
				},
			],
		},
		{
			type: "page",
			name: "Nutrition",
			desc: "Nutrition display and source behavior.",
			items: [
				{
					name: "Display mode",
					desc: "Show nutrition values per serving or for the whole recipe.",
					control: { type: "dropdown", key: "nutritionDisplay", options: NUTRITION_DISPLAY_OPTIONS },
				},
				{
					name: "Value source",
					desc: "How nutrition values are stored in frontmatter.",
					control: { type: "dropdown", key: "nutritionSource", options: NUTRITION_SOURCE_OPTIONS },
				},
			],
		},
		{
			type: "page",
			name: "Health & safety",
			desc: "Allergens and safety-warning configuration.",
			items: [
				{
					name: "Health & safety settings",
					aliases: ["allergens", "meat temperature", "high gi", "gi dictionary"],
					render: (setting) => {
						renderLegacySectionInDeclarative(ctx, setting, (containerEl, save, rerender) => {
							renderSectionHealthSafety(containerEl, ctx.plugin.settings, save, rerender, ctx.app);
						});
					},
				},
			],
		},
		{
			type: "page",
			name: "Importer",
			desc: "Recipe importer template and default folder.",
			items: [
				{
					name: "Recipe template note path",
					desc: "Path to a note used as an import template. Leave empty for built-in default.",
					control: { type: "text", key: "importerTemplatePath" },
				},
				{
					name: "Default import folder",
					desc: "Where imported recipes are saved. Leave empty to use the first recipe folder.",
					control: { type: "text", key: "importerDefaultFolder" },
				},
			],
		},
		{
			type: "page",
			name: "Property names",
			desc: "Frontmatter key names used by Recipe Box.",
			items: [
				{
					name: "Property name mappings",
					aliases: ["frontmatter", "property names", "field names"],
					render: (setting) => {
						renderLegacySectionInDeclarative(ctx, setting, (containerEl, save, rerender) => {
							renderSectionPropertyNames(containerEl, ctx.plugin.settings, save, rerender);
						});
					},
				},
			],
		},
		{
			type: "page",
			name: "Default export settings",
			desc: "Shared export folder and recipe-export defaults.",
			items: [
				{
					name: "Default export folder",
					desc: "Shared destination for exports saved into the vault.",
					control: { type: "text", key: "exportFolder" },
				},
				{
					name: "Default format",
					desc: "Default format used for recipe export.",
					control: { type: "dropdown", key: "recipeExportDefaultFormat", options: EXPORT_FORMAT_OPTIONS },
				},
				{
					name: "Include cook history and sections by default",
					control: { type: "toggle", key: "recipeExportIncludeCookHistoryDefault" },
				},
				{
					name: "Include images by default",
					desc: "Image bundling is not implemented yet, so local images are still omitted for now.",
					control: { type: "toggle", key: "recipeExportIncludeImagesDefault" },
				},
			],
		},
		{
			type: "page",
			name: "Recipe sharing",
			desc: "Server URL for hosted recipe sharing.",
			items: [
				{
					name: "Share server URL",
					desc: "Server used for shared recipe links. Change only if you self-host the sharing worker.",
					control: {
						type: "text",
						key: "shareServerUrl",
						validate: (value: string) => value.trim().length > 0 ? undefined : "Share server URL cannot be empty.",
					},
				},
			],
		},
	];
}
