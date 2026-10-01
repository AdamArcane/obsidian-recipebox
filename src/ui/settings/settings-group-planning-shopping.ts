/**
 * "Planning and shopping" top-level group: the merged notes and meal plan
 * page, meal suggester, and shopping assistant.
 */
import { SettingsBuildContext, SettingsDefinition } from "./settings-build-context";
import { MEAL_NOTATION_OPTIONS } from "./settings-options";
import { renderNotePathRow } from "./settings-note-path-row";
import { sectionPage } from "./section-row-host";
import { renderSectionShopping } from "./section-shopping";
import { renderSectionSuggester } from "./section-suggester";

export function buildPlanningShoppingGroup(ctx: SettingsBuildContext): SettingsDefinition {
	const { app, plugin } = ctx;
	const save = (): Promise<void> => plugin.saveSettings();

	return {
		type: "group",
		heading: "Planning and shopping",
		items: [
			{
				type: "page",
				name: "Notes and meal plan",
				desc: "Meal plan and grocery note paths, recipe note headings, and meal notation.",
				items: [
					{
						type: "group",
						heading: "Note locations",
						items: [
							{
								name: "Meal plan note path",
								desc: "Path to the note used as your meal plan. Created automatically if it doesn't exist. Supports {token} date patterns, e.g. \"Meal Plans/{YYYY}/Week {ww}.md\".",
								aliases: ["meal plan path", "meal plan note", "meal plans", "meal plan"],
								render: (setting) => renderNotePathRow(app, plugin, "mealPlanPath", setting),
							},
							{
								name: "Grocery list note path",
								desc: "Path to the note used as your grocery list. Created automatically if it doesn't exist. Supports {token} date patterns, e.g. \"Groceries/{YYYY}/Week {ww}.md\".",
								aliases: ["grocery path", "shopping list note", "groceries"],
								render: (setting) => renderNotePathRow(app, plugin, "groceryListPath", setting),
							},
						],
					},
					{
						type: "group",
						heading: "Recipe note headings",
						items: [
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
						type: "group",
						heading: "Meal plan",
						items: [
							{
								name: "Meal type notation",
								desc: "How meal types are written in your meal plan note.",
								aliases: ["meal plan"],
								control: { type: "dropdown", key: "mealTypeNotation", options: MEAL_NOTATION_OPTIONS },
							},
							{
								name: "Meal type field/tag name",
								desc: "Tag or field name used in meal entries.",
								aliases: ["meal plan"],
								visible: () => plugin.settings.mealTypeNotation !== "text",
								control: {
									type: "text",
									key: "mealTypeFieldName",
									// The old UI silently saved "meal" on empty; reject it instead.
									validate: (value: string) => value.trim().length > 0 ? undefined : "Field/tag name cannot be empty.",
								},
							},
							{
								name: "Auto-add ingredients on sync",
								desc: "Automatically add ingredients to grocery list for manually added meal plan entries.",
								aliases: ["meal plan"],
								control: { type: "toggle", key: "autoAddOnSync" },
							},
							{
								name: "Required tag filter",
								desc: "Only auto-add ingredients from recipes with this tag. Leave empty for all recipes.",
								aliases: ["meal plan"],
								visible: () => plugin.settings.autoAddOnSync,
								control: { type: "text", key: "autoAddTagFilter" },
							},
						],
					},
				],
			},
			sectionPage(
				"Meal suggester",
				"Mode list and editor for meal suggestion rules.",
				["suggester", "modes", "filters", "scoring"],
				(el, rerender) => renderSectionSuggester(el, plugin.settings, save, rerender, app, () => plugin.discoveryCache.get()),
			),
			sectionPage(
				"Shopping assistant",
				"Grouping, category source, category order/overrides, and collapse behavior.",
				["category order", "category overrides", "grouping", "shopping"],
				(el, rerender) => renderSectionShopping(el, plugin.settings, save, rerender, app, () => plugin.manager.getKnownCategories()),
			),
		],
	};
}
