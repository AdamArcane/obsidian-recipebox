/**
 * Settings for parsing localized ingredient units and filler words.
 * Mappings are edited as rows but remain stored in the parser's text format.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";

interface UnitMapping {
	aliases: string;
	canonical: string;
}

function readMappings(value: string): UnitMapping[] {
	return value
		.split("\n")
		.map((line) => {
			const [aliases, canonical = ""] = line.split("->", 2);
			return { aliases: aliases.trim(), canonical: canonical.trim() };
		})
		.filter((mapping) => mapping.aliases.length > 0);
}

function writeMappings(settings: RecipeBoxSettings, mappings: UnitMapping[]): void {
	settings.ingredientUnitSynonyms = mappings
		.filter((mapping) => mapping.aliases.trim())
		.map((mapping) => `${mapping.aliases.trim()} -> ${mapping.canonical.trim()}`)
		.join("\n");
}

export function renderSectionRecipeParser(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
): void {
	const mappings = readMappings(settings.ingredientUnitSynonyms);

	const mappingSetting = new Setting(container)
		.setName("Unit mappings")
		.setDesc("Unit mappings teach the parser that localized words such as 'tasse' or 'el' mean a canonical unit like cup or tbsp. This lets recipes scale correctly and lets grocery items merge instead of remaining separate.");
	mappingSetting.settingEl.addClass("rb-unit-mapping-setting");

	const list = mappingSetting.controlEl.createDiv("rb-unit-mapping-list");

	const render = (): void => {
		list.empty();
		mappings.forEach((mapping, index) => {
			const row = list.createDiv("rb-list-row");
			const aliases = row.createEl("input", {
				type: "text",
				value: mapping.aliases,
				placeholder: "Aliases, separated by commas",
			});
			const canonical = row.createEl("input", {
				type: "text",
				value: mapping.canonical,
				placeholder: "Canonical unit",
			});
			const remove = row.createEl("button", { text: "Remove" });

			aliases.addEventListener("change", () => {
				mapping.aliases = aliases.value;
				writeMappings(settings, mappings);
				void save();
			});
			canonical.addEventListener("change", () => {
				mapping.canonical = canonical.value;
				writeMappings(settings, mappings);
				void save();
			});
			remove.addEventListener("click", () => {
				mappings.splice(index, 1);
				writeMappings(settings, mappings);
				void save().then(() => render());
			});
		});

		const add = list.createEl("button", { text: "Add unit mapping" });
		add.addEventListener("click", () => {
			mappings.push({ aliases: "", canonical: "" });
			void save().then(() => render());
		});
	};

	render();

	const fillerSetting = new Setting(container)
		.setName("Ingredient filler word")
		.setDesc("Word removed between a unit and ingredient name, such as 'of' or 'de'.")
		.addText((text) => text
			.setValue(settings.ingredientFillerWord)
			.setPlaceholder("Of")
			.onChange((value) => {
				settings.ingredientFillerWord = value.trim() || "of";
				void save();
			}),
		);
	fillerSetting.settingEl.addClass("rb-parser-filler-setting");
}