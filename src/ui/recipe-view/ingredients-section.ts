/**
 * Renders the ingredients section of the recipe view, including sub-group
 * headings, quantity display, grocery-status icons, and food safety warnings.
 */
import { App, setIcon, TFile } from "obsidian";
import { IngredientGroup } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { GroceryItem } from "../../types";
import { parseIngredientLine } from "../../parser/ingredient-parse";
import { hasIgnoreTag, ingredientKey } from "../../parser/ingredient-clean";
import { detectMeatTemp } from "../../parser/meat-detect";
import { isHighGi } from "../../parser/glycemic-match";
import { compileGiDictionary } from "../../parser/glycemic-dictionary";
import { formatQuantity } from "../../parser/quantity-format";
import { toTitleCase } from "../../utils/text-case";

export function renderIngredientsSection(
	container: HTMLElement,
	app: App,
	file: TFile,
	groups: IngredientGroup[],
	settings: RecipeBoxSettings,
	groceryItems: GroceryItem[],
	multiplier: number,
	onRemoveFromGrocery: (key: string) => void,
	onOpenGroceryModal: () => void,
): void {
	const groceryKeySet = new Set(groceryItems.map(i => i.key));
	const giPatterns = settings.showHighGIWarnings ? compileGiDictionary(settings.giDictionary).patterns : [];

	const section = container.createDiv({ cls: "rb-ingredients-section" });
	const header = section.createDiv({ cls: "rb-section-header" });
	const sectionIcon = header.createSpan({ cls: "rb-section-icon" });
	setIcon(sectionIcon, "carrot");
	header.createSpan({ cls: "rb-section-title", text: settings.ingredientsHeading });
	const addBtn = header.createEl("button", {
		cls: "rb-grocery-add-btn",
		attr: { "aria-label": "Add to grocery list" },
	});
	setIcon(addBtn, "shopping-cart");
	addBtn.addEventListener("click", onOpenGroceryModal);

	for (const group of groups) {
		if (!group.heading && group.lines.length === 0) continue;

		let lineContainer = section;
		if (group.heading) {
			const groupEl = section.createDiv({ cls: "rb-ingredient-group" });
			const groupHeader = groupEl.createDiv({ cls: "rb-group-header" });
			groupHeader.createSpan({ text: group.heading });
			groupHeader.addEventListener("click", () => groupEl.toggleClass("rb-collapsed", !groupEl.hasClass("rb-collapsed")));
			lineContainer = groupEl.createDiv({ cls: "rb-group-lines" });
		}

		for (const raw of group.lines) {
			const parsed = parseIngredientLine(raw);
			if (!parsed || !parsed.name || hasIgnoreTag(parsed.tags)) continue;

			const scaled = parsed.quantity !== null ? parsed.quantity * multiplier : null;
			const key = ingredientKey(parsed.name, parsed.unit);
			const inGrocery = groceryKeySet.has(key);

			const row = lineContainer.createDiv({ cls: "rb-ingredient-row" });
			if (settings.crossOffWhileCooking) {
				row.addEventListener("click", (e) => {
					if ((e.target as HTMLElement).closest("button")) return;
					row.toggleClass("rb-crossed-off", !row.hasClass("rb-crossed-off"));
				});
			}

			const qtyWrap = row.createSpan({ cls: scaled !== null ? "rb-ingredient-qty" : "rb-ingredient-qty rb-qty-empty" });
			const qtyStr = scaled !== null ? formatQuantity(scaled) : "";
			if (qtyStr) {
				qtyWrap.createSpan({ cls: "rb-qty-number", text: qtyStr });
				if (parsed.unit) qtyWrap.createSpan({ cls: "rb-qty-unit", text: parsed.unit });
			} else {
				qtyWrap.createSpan({ cls: "rb-qty-dash", text: "—" });
			}

			const nameCol = row.createDiv({ cls: "rb-ingredient-name-col" });
			nameCol.createSpan({ cls: "rb-ingredient-name", text: toTitleCase(parsed.name) });
			if (parsed.note) {
				nameCol.createDiv({ cls: "rb-ingredient-note", text: parsed.note });
			}

			const meatTemp = settings.showMeatTempWarnings ? detectMeatTemp(parsed.name) : null;
			if (meatTemp) {
				row.createSpan({ cls: "rb-meat-temp-badge", text: `${meatTemp.fahrenheit}°F`, attr: { title: meatTemp.name } });
			}

			if (settings.showHighGIWarnings && isHighGi(parsed.name, giPatterns)) {
				row.createSpan({ cls: "rb-high-gi-badge", text: "High GI" });
			}

			if (inGrocery) {
				const removeBtn = row.createEl("button", {
					cls: "rb-grocery-remove-btn",
					attr: { "aria-label": "Remove from grocery list" },
				});
				const iconDefault = removeBtn.createSpan({ cls: "rb-grocery-icon-default" });
				setIcon(iconDefault, "list-check");
				const iconHover = removeBtn.createSpan({ cls: "rb-grocery-icon-hover" });
				setIcon(iconHover, "list-x");
				removeBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					onRemoveFromGrocery(key);
				});
			}
		}
	}
}
