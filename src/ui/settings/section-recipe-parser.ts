/**
 * Settings for parsing localized ingredient units and filler words.
 * Mappings are edited as rows but remain stored in the parser's text format.
 */
import { Setting } from "obsidian";
import { UNIT_SYNONYMS } from "../../parser/ingredient-units";
import { RecipeBoxSettings } from "../../settings/settings-types";

interface UnitMapping {
	aliases: string;
	canonical: string;
}

function readMappings(value: string): UnitMapping[] {
	return value
		.split("\n")
		.map((line) => {
			// First arrow only, matching compileUnitSynonyms.
			const arrow = line.indexOf("->");
			if (arrow === -1) return { aliases: line.trim(), canonical: "" };
			return { aliases: line.slice(0, arrow).trim(), canonical: line.slice(arrow + 2).trim() };
		})
		.filter((mapping) => mapping.aliases.length > 0);
}

function writeMappings(settings: RecipeBoxSettings, mappings: UnitMapping[]): void {
	settings.ingredientUnitSynonyms = mappings
		.filter((mapping) => mapping.aliases.trim())
		.map((mapping) => `${mapping.aliases.trim()} -> ${mapping.canonical.trim()}`)
		.join("\n");
}

const BUILT_IN_CANONICALS = new Set(Object.values(UNIT_SYNONYMS).filter(Boolean));

// A canonical that is neither built in nor shared with another row (e.g.
// "tasse -> cups" instead of "cup") will never merge with anything. Not an
// error, since an own-language canonical like "EL" is legitimate.
function isUnmergedCanonical(mappings: UnitMapping[], index: number): boolean {
	const canonical = mappings[index].canonical.trim().toLowerCase();
	if (!canonical || BUILT_IN_CANONICALS.has(canonical)) return false;
	return !mappings.some((other, i) => i !== index && other.canonical.trim().toLowerCase() === canonical);
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
			const hint = row.createDiv({
				cls: "rb-unit-mapping-hint setting-item-description",
				text: "This unit is not a built-in unit and no other mapping uses it, so it will not merge with other ingredients.",
			});
			hint.toggle(isUnmergedCanonical(mappings, index));

			aliases.addEventListener("change", () => {
				mapping.aliases = aliases.value;
				writeMappings(settings, mappings);
				void save();
			});
			canonical.addEventListener("change", () => {
				mapping.canonical = canonical.value;
				writeMappings(settings, mappings);
				void save().then(() => render());
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
		.setName("Ingredient filler words")
		.setDesc("Comma-separated words removed between a unit and ingredient name, such as 'of, de, di'. Leave empty to strip nothing.")
		.addText((text) => text
			.setValue(settings.ingredientFillerWord)
			.setPlaceholder("Of, de")
			.onChange((value) => {
				settings.ingredientFillerWord = value.trim();
				void save();
			}),
		);
	fillerSetting.settingEl.addClass("rb-parser-filler-setting");
}