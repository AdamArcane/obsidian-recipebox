/**
 * "Viewing and cooking" top-level group: recipe view, the merged cooking,
 * timers and nutrition page, and health and safety.
 */
import { t as translateUi } from "../../i18n";
import { SettingsBuildContext, SettingsDefinition } from "./settings-build-context";
import { NUTRITION_DISPLAY_OPTIONS, NUTRITION_SOURCE_OPTIONS, TIMER_RANGE_OPTIONS } from "./settings-options";
import { sectionPage } from "./section-row-host";
import { renderSectionRecipeView } from "./section-recipe-view";
import { renderSectionHealthSafety } from "./section-health-safety";

export function buildViewingCookingGroup(ctx: SettingsBuildContext): SettingsDefinition {
	const { app, plugin } = ctx;
	const save = (): Promise<void> => plugin.saveSettings();

	return {
		type: "group",
		heading: translateUi("Viewing and cooking"),
		items: [
			sectionPage(
				translateUi("Recipe view"),
				translateUi("Recipe view toggles and the header-badge editor."),
				["badges", "tags", translateUi("desktop layout"), translateUi("default image")],
				(el, rerender) => renderSectionRecipeView(el, plugin.settings, save, rerender, app, () => plugin.discoveryCache.get()),
			),
			{
				type: "page",
				name: translateUi("Cooking, timers and nutrition"),
				desc: translateUi("Cook history, in-recipe timers, and nutrition display."),
				items: [
					{
						type: "group",
						heading: translateUi("Cook history"),
						items: [
							{
								name: translateUi("Track cook history"),
								desc: translateUi("Record each cook with date, optional notes, and photo; also updates last-made and cooked-count properties."),
								aliases: [translateUi("cook history"), "tracking"],
								control: { type: "toggle", key: "cookHistoryEnabled" },
							},
							{
								name: translateUi("Cook history heading name"),
								desc: translateUi("Heading under which note-body history entries are appended."),
								aliases: [translateUi("cook history")],
								visible: () => plugin.settings.cookHistoryEnabled,
								control: { type: "text", key: "cookHistoryHeading" },
							},
						],
					},
					{
						type: "group",
						heading: translateUi("Timers"),
						items: [
							{
								name: translateUi("Enable timers"),
								desc: translateUi("Show interactive countdown timers for time-based steps in recipe view."),
								aliases: ["timers"],
								control: { type: "toggle", key: "timersEnabled" },
							},
							{
								name: translateUi("Auto-start timer on click"),
								aliases: ["timers"],
								visible: () => plugin.settings.timersEnabled,
								control: { type: "toggle", key: "timerAutoStart" },
							},
							{
								name: translateUi("Default to compact display"),
								aliases: ["timers"],
								visible: () => plugin.settings.timersEnabled,
								control: { type: "toggle", key: "timerCompactDisplay" },
							},
							{
								name: translateUi("Time range default"),
								desc: translateUi("When a step gives a range like 10-15 min, use the min or max value."),
								aliases: ["timers"],
								visible: () => plugin.settings.timersEnabled,
								control: { type: "dropdown", key: "timerRangeDefault", options: TIMER_RANGE_OPTIONS },
							},
						],
					},
					{
						type: "group",
						heading: "Nutrition",
						items: [
							{
								name: translateUi("Display mode"),
								desc: translateUi("Show nutrition values per serving or for the whole recipe."),
								aliases: ["nutrition"],
								control: { type: "dropdown", key: "nutritionDisplay", options: NUTRITION_DISPLAY_OPTIONS },
							},
							{
								name: translateUi("Value source"),
								desc: translateUi("How nutrition values are stored in frontmatter."),
								aliases: ["nutrition"],
								control: { type: "dropdown", key: "nutritionSource", options: NUTRITION_SOURCE_OPTIONS },
							},
						],
					},
				],
			},
			sectionPage(
				translateUi("Health & safety"),
				translateUi("Allergens and safety-warning configuration."),
				["allergens", translateUi("meat temperature"), translateUi("high gi"), "high-gi", "glycemic", translateUi("gi dictionary")],
				(el, rerender) => renderSectionHealthSafety(el, plugin.settings, save, rerender, app),
			),
		],
	};
}
