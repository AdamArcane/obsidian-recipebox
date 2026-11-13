/**
 * "Planning and shopping" top-level group: the merged notes and meal plan
 * page, meal suggester, and shopping assistant.
 */
import { t as translateUi } from "../../i18n";
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
		heading: translateUi("Planning and shopping"),
		items: [
			{
				type: "page",
				name: translateUi("Notes and meal plan"),
				desc: translateUi("Meal plan and grocery note paths, recipe note headings, and meal notation."),
				items: [
					{
						type: "group",
						heading: translateUi("Note locations"),
						items: [
							{
								name: translateUi("Meal plan note path"),
								desc: translateUi("Path to the note used as your meal plan. Created automatically if it doesn't exist. Supports {token} date patterns, e.g. \"Meal Plans/{YYYY}/Week {ww}.md\"."),
								aliases: [translateUi("meal plan path"), translateUi("meal plan note"), translateUi("meal plans"), translateUi("meal plan")],
								render: (setting) => renderNotePathRow(app, plugin, "mealPlanPath", setting),
							},
							{
								name: translateUi("Grocery list note path"),
								desc: translateUi("Path to the note used as your grocery list. Created automatically if it doesn't exist. Supports {token} date patterns, e.g. \"Groceries/{YYYY}/Week {ww}.md\"."),
								aliases: [translateUi("grocery path"), translateUi("shopping list note"), "groceries"],
								render: (setting) => renderNotePathRow(app, plugin, "groceryListPath", setting),
							},
						],
					},
					{
						type: "group",
						heading: translateUi("Recipe note headings"),
						items: [
							{
								name: translateUi("Ingredients heading"),
								desc: translateUi("Heading that marks the ingredients section in a recipe note."),
								control: { type: "text", key: "ingredientsHeading" },
							},
							{
								name: translateUi("Instructions heading"),
								desc: translateUi("Heading that marks the instructions section in a recipe note."),
								control: { type: "text", key: "instructionsHeading" },
							},
							{
								name: translateUi("Notes heading"),
								desc: translateUi("Heading that marks the optional notes section in a recipe note."),
								control: { type: "text", key: "notesHeading" },
							},
						],
					},
					{
						type: "group",
						heading: translateUi("Meal plan"),
						items: [
							{
								name: translateUi("Meal type notation"),
								desc: translateUi("How meal types are written in your meal plan note."),
								aliases: [translateUi("meal plan")],
								control: { type: "dropdown", key: "mealTypeNotation", options: MEAL_NOTATION_OPTIONS },
							},
							{
								name: translateUi("Meal type field/tag name"),
								desc: translateUi("Tag or field name used in meal entries."),
								aliases: [translateUi("meal plan")],
								visible: () => plugin.settings.mealTypeNotation !== "text",
								control: {
									type: "text",
									key: "mealTypeFieldName",
									// The old UI silently saved "meal" on empty; reject it instead.
									validate: (value: string) => value.trim().length > 0 ? undefined : translateUi("Field/tag name cannot be empty."),
								},
							},
							{
								name: translateUi("Auto-add ingredients on sync"),
								desc: translateUi("Automatically add ingredients to grocery list for manually added meal plan entries."),
								aliases: [translateUi("meal plan")],
								control: { type: "toggle", key: "autoAddOnSync" },
							},
							{
								name: translateUi("Required tag filter"),
								desc: translateUi("Only auto-add ingredients from recipes with this tag. Leave empty for all recipes."),
								aliases: [translateUi("meal plan")],
								visible: () => plugin.settings.autoAddOnSync,
								control: { type: "text", key: "autoAddTagFilter" },
							},
						],
					},
				],
			},
			sectionPage(
				translateUi("Meal suggester"),
				translateUi("Mode list and editor for meal suggestion rules."),
				["suggester", "modes", "filters", "scoring"],
				(el, rerender) => renderSectionSuggester(el, plugin.settings, save, rerender, app, () => plugin.discoveryCache.get()),
			),
			sectionPage(
				translateUi("Shopping assistant"),
				translateUi("Grouping, category source, category order/overrides, and collapse behavior."),
				[translateUi("category order"), translateUi("category overrides"), "grouping", "shopping"],
				(el, rerender) => renderSectionShopping(el, plugin.settings, save, rerender, app, () => plugin.manager.getKnownCategories()),
			),
		],
	};
}
