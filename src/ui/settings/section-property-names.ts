/**
 * Consolidated "Property names" settings section — every setting that maps a
 * plugin concept to a frontmatter key, gathered in one place and collapsed by
 * default since most users never need to touch them.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { migrateModeFieldReferences } from "../../suggester/migrate-mode-fields";
import { createCollapsibleSection } from "../components/collapsible-section";

export function renderSectionPropertyNames(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	createCollapsibleSection(container, "Property names", (body) => renderBody(body, settings, save, rerender));
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
	}

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
}
