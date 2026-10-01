/**
 * "Viewing and cooking" top-level group: recipe view, the merged cooking,
 * timers and nutrition page, and health and safety.
 */
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
		heading: "Viewing and cooking",
		items: [
			sectionPage(
				"Recipe view",
				"Recipe view toggles and the header-badge editor.",
				["badges", "tags", "desktop layout", "default image"],
				(el, rerender) => renderSectionRecipeView(el, plugin.settings, save, rerender, app, () => plugin.discoveryCache.get()),
			),
			{
				type: "page",
				name: "Cooking, timers and nutrition",
				desc: "Cook history, in-recipe timers, and nutrition display.",
				items: [
					{
						type: "group",
						heading: "Cook history",
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
								aliases: ["cook history"],
								visible: () => plugin.settings.cookHistoryEnabled,
								control: { type: "text", key: "cookHistoryHeading" },
							},
						],
					},
					{
						type: "group",
						heading: "Timers",
						items: [
							{
								name: "Enable timers",
								desc: "Show interactive countdown timers for time-based steps in recipe view.",
								aliases: ["timers"],
								control: { type: "toggle", key: "timersEnabled" },
							},
							{
								name: "Auto-start timer on click",
								aliases: ["timers"],
								visible: () => plugin.settings.timersEnabled,
								control: { type: "toggle", key: "timerAutoStart" },
							},
							{
								name: "Default to compact display",
								aliases: ["timers"],
								visible: () => plugin.settings.timersEnabled,
								control: { type: "toggle", key: "timerCompactDisplay" },
							},
							{
								name: "Time range default",
								desc: "When a step gives a range like 10-15 min, use the min or max value.",
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
								name: "Display mode",
								desc: "Show nutrition values per serving or for the whole recipe.",
								aliases: ["nutrition"],
								control: { type: "dropdown", key: "nutritionDisplay", options: NUTRITION_DISPLAY_OPTIONS },
							},
							{
								name: "Value source",
								desc: "How nutrition values are stored in frontmatter.",
								aliases: ["nutrition"],
								control: { type: "dropdown", key: "nutritionSource", options: NUTRITION_SOURCE_OPTIONS },
							},
						],
					},
				],
			},
			sectionPage(
				"Health & safety",
				"Allergens and safety-warning configuration.",
				["allergens", "meat temperature", "high gi", "high-gi", "glycemic", "gi dictionary"],
				(el, rerender) => renderSectionHealthSafety(el, plugin.settings, save, rerender, app),
			),
		],
	};
}
