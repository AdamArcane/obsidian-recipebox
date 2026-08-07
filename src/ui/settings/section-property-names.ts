/**
 * Consolidated "Property names" settings section — every setting that maps a
 * plugin concept to a frontmatter key, gathered in one place.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { migrateModeFieldReferences } from "../../suggester/migrate-mode-fields";

export function renderSectionPropertyNames(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	renderBody(container, settings, save, rerender);
}

function renderBody(
	body: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	new Setting(body).setDesc(
		"Most users can leave these as defaults. Change them only if your recipe notes use different frontmatter key names than the plugin expects. Changing these may require updating existing settings and/or frontmatter in your recipe notes to match the new names, or else some features may not work correctly."
	);

	new Setting(body)
		.setName("Recipe type")
		.setDesc("Which frontmatter property holds the note-type value (default: type).")
		.addText((t) =>
			t.setPlaceholder("Type").setValue(settings.recipeTypePropertyName).onChange(async (v) => {
				settings.recipeTypePropertyName = v.trim() || "type";
				await save();
			})
		);

	new Setting(body)
		.setName("Recipe rating")
		.setDesc("The property name used to store star ratings (1–5).")
		.addText((t) => {
			t.setValue(settings.ratingProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.ratingProperty, v);
				settings.ratingProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(body)
		.setName("Recipe image")
		.setDesc("Property name used for the recipe hero image.")
		.addText((t) => {
			t.setValue(settings.imageProperty).onChange(async (v) => {
				settings.imageProperty = v.trim() || "image";
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	if (settings.cookHistoryEnabled) {
		new Setting(body)
			.setName("Stores the date recipe was last made")
			.addText((t) => {
				t.setValue(settings.lastMadeProperty).onChange(async (v) => {
					settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.lastMadeProperty, v);
					settings.lastMadeProperty = v;
					await save();
				});
				t.inputEl.addEventListener("blur", () => rerender());
			});
	}

	if (settings.cookHistoryEnabled) {
		new Setting(body)
			.setName("Cook history")
			.setDesc("The frontmatter property that stores the cook history meta data.")
			.addText((t) =>
				t.setValue(settings.cookHistoryFrontmatterProperty).onChange(async (v) => {
					settings.cookHistoryFrontmatterProperty = v.trim() || "cookHistory";
					await save();
				})
			);

		new Setting(body)
			.setName("Times cooked")
			.setDesc("The property used for the derived cook count value.")
			.addText((t) => {
				t.setValue(settings.cookedCountProperty).onChange(async (v) => {
					settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.cookedCountProperty, v);
					settings.cookedCountProperty = v;
					await save();
				});
				t.inputEl.addEventListener("blur", () => rerender());
			});
	}

	new Setting(body)
		.setName("Favorite")
		.setDesc("Property name used by the recipe favorite toggle.")
		.addText((t) => {
			t.setValue(settings.favoriteProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.favoriteProperty, v);
				settings.favoriteProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(body)
		.setName("Allergens")
		.setDesc("Property name holding a recipe's allergen list (CSV string or YAML list).")
		.addText((t) => {
			t.setValue(settings.allergensProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.allergensProperty, v);
				settings.allergensProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(body)
		.setName("Diet")
		.setDesc("Property name holding diet tags/labels.")
		.addText((t) => {
			t.setValue(settings.dietProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.dietProperty, v);
				settings.dietProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(body)
		.setName("Servings")
		.setDesc("Primary property name for serving count.")
		.addText((t) => {
			t.setValue(settings.servingsProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.servingsProperty, v);
				settings.servingsProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(body)
		.setName("Prep time")
		.setDesc("Primary property name for prep time in minutes.")
		.addText((t) => {
			t.setValue(settings.prepTimeProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.prepTimeProperty, v);
				settings.prepTimeProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(body)
		.setName("Cook time")
		.setDesc("Primary property name for cook time in minutes.")
		.addText((t) => {
			t.setValue(settings.cookTimeProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.cookTimeProperty, v);
				settings.cookTimeProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(body)
		.setName("Total time")
		.setDesc("Primary property name for total time in minutes.")
		.addText((t) => {
			t.setValue(settings.totalTimeProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.totalTimeProperty, v);
				settings.totalTimeProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	const nutritionFields: Array<[string, keyof RecipeBoxSettings]> = [
		["Calories", "caloriesProperty"],
		["Protein", "proteinProperty"],
		["Fat", "fatProperty"],
		["Carbs", "carbsProperty"],
	];
	for (const [label, key] of nutritionFields) {
		new Setting(body)
			.setName(label)
			.addText((t) =>
				t.setValue(settings[key] as string).onChange(async (v) => {
					(settings as unknown as Record<string, string>)[key] = v;
					await save();
				})
			);
	}

	new Setting(body)
		.setName("Share data")
		.setDesc("The frontmatter property that stores share state (slug, delete token, created/expires timestamps) as a nested object.")
		.addText((t) =>
			t.setValue(settings.shareDataProperty).onChange(async (v) => {
				settings.shareDataProperty = v.trim() || "recipe-share";
				await save();
			})
		);
}
