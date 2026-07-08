/**
 * Settings section for cook history and tracking options. Two levels of
 * tracking are offered: simple stat toggles (last made date, cooked count),
 * and full cook history which supersedes them with a detailed log. Property/
 * heading names live in the consolidated "Property names" section.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";

export function renderSectionCookingTracking(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	new Setting(container).setName("Cooking & tracking").setHeading();

	new Setting(container)
		.setName("Track cook history")
		.setDesc("Record each cook as a dated entry with optional notes and photo.\nEnables the cook history tab on mobile and the history modal on desktop. Updates last made and cooked count properties automatically.\nThis setting will write cook history meta to the configured frontmatter property, as well as notes and a photo to the recipe note under the heading below.")
		.addToggle((t) =>
			t.setValue(settings.cookHistoryEnabled).onChange(async (v) => {
				settings.cookHistoryEnabled = v;
				await save();
				rerender();
			})
		);

	if (settings.cookHistoryEnabled) {
		new Setting(container)
			.setName("Cook history heading name")
			.setDesc("The heading under which note-body entries are appended. Created automatically if it doesn't exist.")
			.addText((t) =>
				t.setValue(settings.cookHistoryHeading).onChange(async (v) => {
					settings.cookHistoryHeading = v;
					await save();
				})
			);
	}

}
