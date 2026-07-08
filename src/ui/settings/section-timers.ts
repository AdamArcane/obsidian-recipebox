/**
 * Settings section for in-recipe timers — enable/disable, auto-start, compact
 * display, and range default.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";

export function renderSectionTimers(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	new Setting(container).setName("Timers").setHeading();

	new Setting(container)
		.setName("Enable timers")
		.setDesc("Show interactive countdown timers for time-based steps in the recipe view.")
		.addToggle((t) =>
			t.setValue(settings.timersEnabled).onChange(async (v) => {
				settings.timersEnabled = v;
				await save();
				rerender();
			})
		);

	if (!settings.timersEnabled) return;

	new Setting(container)
		.setName("Auto-start timer on click")
		.addToggle((t) =>
			t.setValue(settings.timerAutoStart).onChange(async (v) => {
				settings.timerAutoStart = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Default to compact display")
		.addToggle((t) =>
			t.setValue(settings.timerCompactDisplay).onChange(async (v) => {
				settings.timerCompactDisplay = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Time range default")
		.setDesc("When a step gives a range like '10–15 min', use the min or max.")
		.addDropdown((dd) =>
			dd
				.addOptions({ max: "Max", min: "Min" })
				.setValue(settings.timerRangeDefault)
				.onChange(async (v) => {
					settings.timerRangeDefault = v as "min" | "max";
					await save();
				})
		);
}
