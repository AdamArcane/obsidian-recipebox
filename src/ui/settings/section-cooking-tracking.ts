/**
 * Settings section for cook history and tracking options — storage mode,
 * heading name, frontmatter property, last-made, and cooked count.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings, CookHistoryStorage } from "../../settings/settings-types";

const STORAGE_OPTIONS: Record<CookHistoryStorage, string> = {
	note: "Note body only",
	frontmatter: "Frontmatter array only",
	both: "Both",
};

export function renderSectionCookingTracking(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	new Setting(container).setName("Cooking & tracking").setHeading();

	new Setting(container)
		.setName("Show 'mark as cooked' button")
		.addToggle((t) =>
			t.setValue(settings.showMarkCookedButton).onChange(async (v) => {
				settings.showMarkCookedButton = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Cross off while cooking")
		.setDesc("Clicking an ingredient or instruction step marks it as done for the current session.")
		.addToggle((t) =>
			t.setValue(settings.crossOffWhileCooking).onChange(async (v) => {
				settings.crossOffWhileCooking = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Track last made date")
		.setDesc("Stamp a last-made date into frontmatter when a recipe is marked cooked.")
		.addToggle((t) =>
			t.setValue(settings.trackLastMade).onChange(async (v) => {
				settings.trackLastMade = v;
				await save();
			})
		);

	if (settings.trackLastMade) {
		new Setting(container)
			.setName("Last made property name")
			.addText((t) =>
				t.setValue(settings.lastMadeProperty).onChange(async (v) => {
					settings.lastMadeProperty = v;
					await save();
				})
			);
	}

	new Setting(container)
		.setName("Track cooked count")
		.setDesc("Increment a counter in frontmatter each time the last-made date changes to a new day.")
		.addToggle((t) =>
			t.setValue(settings.trackCookedCount).onChange(async (v) => {
				settings.trackCookedCount = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Enable cook history")
		.setDesc("Append a dated entry to a cook-history section each time a recipe is marked cooked.")
		.addToggle((t) =>
			t.setValue(settings.cookHistoryEnabled).onChange(async (v) => {
				settings.cookHistoryEnabled = v;
				await save();
				rerender();
			})
		);

	if (settings.cookHistoryEnabled) {
		new Setting(container)
			.setName("Storage")
			.setDesc("Where cook history entries are stored. Note body appends to a heading section; frontmatter stores a flat date array queryable by dataview and bases.")
			.addDropdown((dd) =>
				dd.addOptions(STORAGE_OPTIONS).setValue(settings.cookHistoryStorage).onChange(async (v) => {
					settings.cookHistoryStorage = v as CookHistoryStorage;
					await save();
					rerender();
				})
			);

		if (settings.cookHistoryStorage !== "frontmatter") {
			new Setting(container)
				.setName("Cook history heading name")
				.setDesc("The heading under which note-body entries are appended.")
				.addText((t) =>
					t.setValue(settings.cookHistoryHeading).onChange(async (v) => {
						settings.cookHistoryHeading = v;
						await save();
					})
				);
		}

		if (settings.cookHistoryStorage !== "note") {
			new Setting(container)
				.setName("Frontmatter property")
				.setDesc('The frontmatter property that stores the date array, e.g. "cookhistory".')
				.addText((t) =>
					t.setValue(settings.cookHistoryFrontmatterProperty).onChange(async (v) => {
						settings.cookHistoryFrontmatterProperty = v.trim() || "cookHistory";
						await save();
					})
				);
		}
	}
}
