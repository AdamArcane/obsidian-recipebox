/**
 * Settings section for allergen and food safety configuration — allergen
 * property name, personal allergen list, and meat temperature warnings.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";

export function renderSectionAllergensSafety(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void
): void {
	new Setting(container).setName("Allergens & food safety").setHeading();

	new Setting(container)
		.setName("Allergens frontmatter property")
		.setDesc("Property name holding a recipe's allergen list (CSV string or YAML list).")
		.addText((t) =>
			t.setValue(settings.allergensProperty).onChange(async (v) => {
				settings.allergensProperty = v;
				await save();
			})
		);

	const allergenSetting = new Setting(container)
		.setName("My allergens")
		.setDesc("Warn when a recipe contains any of these allergens.");

	renderTagEditor(allergenSetting.settingEl, settings.myAllergens, async (updated) => {
		settings.myAllergens = updated;
		await save();
	});

	new Setting(container)
		.setName("Show meat temperature warnings")
		.setDesc("Warn when an ingredient may need to reach a safe internal temperature.")
		.addToggle((t) =>
			t.setValue(settings.showMeatTempWarnings).onChange(async (v) => {
				settings.showMeatTempWarnings = v;
				await save();
			})
		);

	new Setting(container).setName("Nutrition property mapping").setHeading();

	const nutritionFields: Array<[string, keyof RecipeBoxSettings]> = [
		["Rating property", "ratingProperty"],
		["Calories property", "caloriesProperty"],
		["Protein property", "proteinProperty"],
		["Fat property", "fatProperty"],
		["Carbs property", "carbsProperty"],
	];
	for (const [label, key] of nutritionFields) {
		new Setting(container)
			.setName(label)
			.addText((t) =>
				t.setValue(settings[key] as string).onChange(async (v) => {
					(settings as unknown as Record<string, string>)[key] = v;
					await save();
				})
			);
	}
}

function renderTagEditor(
	container: HTMLElement,
	tags: string[],
	onChange: (updated: string[]) => Promise<void>
): void {
	const wrapper = container.createDiv("recipe-box-tag-editor");

	function render(): void {
		wrapper.empty();
		const tagRow = wrapper.createDiv("recipe-box-tag-row");
		tags.forEach((tag, i) => {
			const chip = tagRow.createSpan({ cls: "recipe-box-tag-chip", text: tag });
			const del = chip.createEl("button", { text: "✕" });
			del.addEventListener("click", () => {
				tags.splice(i, 1);
				void onChange([...tags]).then(() => render());
			});
		});

		const input = wrapper.createEl("input", { type: "text", placeholder: "Add allergen…" });
		input.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" || !input.value.trim()) return;
			const val = input.value.trim();
			if (!tags.includes(val)) {
				tags.push(val);
				void onChange([...tags]).then(() => render());
			} else {
				render();
			}
		});
	}
	render();
}
