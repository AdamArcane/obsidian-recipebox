import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ContributionMap } from "../../types";
import { stripFrontmatter } from "../../parser/recipe-frontmatter-strip";
import { splitBodyAroundIngredients } from "../../parser/recipe-ingredient-groups";
import { parseIngredientLine } from "../../parser/ingredient-parse";
import { ingredientKey } from "../../parser/ingredient-clean";
import { formatQuantity } from "../../parser/quantity-format";
import { toTitleCase } from "../../utils/text-case";

export interface LoadedIngredient {
	key: string;
	name: string;
	unit: string;
	quantity: number | null;
}

export async function loadRecipeIngredients(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
): Promise<LoadedIngredient[]> {
	const text = await app.vault.read(file);
	const body = stripFrontmatter(text);
	const { groups } = splitBodyAroundIngredients(body, settings.ingredientsHeading);

	const seen = new Set<string>();
	const results: LoadedIngredient[] = [];
	for (const group of groups) {
		for (const raw of group.lines) {
			const parsed = parseIngredientLine(raw);
			if (!parsed || !parsed.name) continue;
			const key = ingredientKey(parsed.name, parsed.unit);
			if (seen.has(key)) continue;
			seen.add(key);
			results.push({ key, name: parsed.name, unit: parsed.unit, quantity: parsed.quantity });
		}
	}
	return results;
}

export function buildContributions(
	ingredients: LoadedIngredient[],
	selectedKeys: Set<string>,
): ContributionMap {
	const map: ContributionMap = {};
	for (const ing of ingredients) {
		if (selectedKeys.has(ing.key)) {
			map[ing.key] = { name: ing.name, unit: ing.unit, quantity: ing.quantity };
		}
	}
	return map;
}

// Shared checklist UI used by both grocery and meal-plan modals.
export function renderIngredientChecklist(
	container: HTMLElement,
	items: LoadedIngredient[],
	checkedKeys: Set<string>,
	onToggle: (key: string, checked: boolean) => void,
): void {
	if (items.length === 0) {
		container.createEl("p", { cls: "rb-modal-empty", text: "No ingredients found in this recipe." });
		return;
	}

	const controls = container.createDiv({ cls: "rb-checklist-controls" });

	const selectAll = controls.createEl("button", { cls: "rb-modal-link-btn" });
	setIcon(selectAll.createSpan({ cls: "rb-modal-link-btn-icon" }), "check-check");
	selectAll.createSpan({ text: "Select all" });

	const deselectAll = controls.createEl("button", { cls: "rb-modal-link-btn" });
	setIcon(deselectAll.createSpan({ cls: "rb-modal-link-btn-icon" }), "square");
	deselectAll.createSpan({ text: "Deselect all" });

	const list = container.createDiv({ cls: "rb-ingredient-checklist" });
	const checkboxes: HTMLInputElement[] = [];

	for (const item of items) {
		const cbId = `rb-ing-${item.key.replace(/[^a-z0-9]/gi, "_")}`;
		const row = list.createDiv({ cls: "rb-checklist-row" });
		const cb = row.createEl("input", { attr: { type: "checkbox", id: cbId } });
		cb.checked = checkedKeys.has(item.key);
		cb.addEventListener("change", () => onToggle(item.key, cb.checked));
		checkboxes.push(cb);

		const label = row.createEl("label", { attr: { for: cbId } });
		label.createSpan({ cls: "rb-checklist-name", text: toTitleCase(item.name) });

		const qtyStr = item.quantity !== null ? formatQuantity(item.quantity) : "";
		const qty = qtyStr && item.unit ? `${qtyStr} ${item.unit}` : qtyStr;
		if (qty) label.createSpan({ cls: "rb-checklist-qty", text: qty });
	}

	selectAll.addEventListener("click", () =>
		checkboxes.forEach(cb => { if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("change")); } }),
	);
	deselectAll.addEventListener("click", () =>
		checkboxes.forEach(cb => { if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event("change")); } }),
	);
}
