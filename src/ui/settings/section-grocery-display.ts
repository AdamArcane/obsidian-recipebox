import { Setting } from "obsidian";
import { GroupingMode, CategorySource, CategoryOverride } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";

const GROUPING_OPTIONS: Record<GroupingMode, string> = {
	category: "By category",
	recipe: "By recipe",
	source: "By source",
	none: "No grouping",
};

const CATEGORY_SOURCE_OPTIONS: Record<CategorySource, string> = {
	dictionary: "Built-in dictionary",
	tag: "Recipe tags",
	"tag-then-dictionary": "Tags, then dictionary",
};

export function renderSectionGroceryDisplay(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	new Setting(container).setName("Grocery list display").setHeading();

	new Setting(container)
		.setName("Grouping mode")
		.addDropdown((dd) =>
			dd
				.addOptions(GROUPING_OPTIONS)
				.setValue(settings.groupingMode)
				.onChange(async (v) => {
					settings.groupingMode = v as GroupingMode;
					await save();
				})
		);

	new Setting(container)
		.setName("Category source")
		.addDropdown((dd) =>
			dd
				.addOptions(CATEGORY_SOURCE_OPTIONS)
				.setValue(settings.categorySource)
				.onChange(async (v) => {
					settings.categorySource = v as CategorySource;
					await save();
				})
		);

	new Setting(container)
		.setName("Auto-sort categories alphabetically")
		.addToggle((t) =>
			t.setValue(settings.autoSortCategories).onChange(async (v) => {
				settings.autoSortCategories = v;
				await save();
				rerender();
			})
		);

	if (!settings.autoSortCategories) {
		renderCategoryOrder(container, settings, save);
	}

	new Setting(container)
		.setName("Auto-collapse completed sections")
		.addToggle((t) =>
			t.setValue(settings.autoCollapseCompletedSections).onChange(async (v) => {
				settings.autoCollapseCompletedSections = v;
				await save();
			})
		);

	renderCategoryOverrides(container, settings, save);
}

function renderCategoryOrder(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): void {
	const setting = new Setting(container)
		.setName("Category order")
		.setDesc("Drag or use buttons to reorder.");

	const list = setting.settingEl.createDiv("recipe-box-order-list");

	function render(): void {
		list.empty();
		settings.manualCategoryOrder.forEach((cat, i) => {
			const row = list.createDiv("recipe-box-list-row");
			row.createSpan({ text: cat });
			const up = row.createEl("button", { text: "↑" });
			const down = row.createEl("button", { text: "↓" });
			up.disabled = i === 0;
			down.disabled = i === settings.manualCategoryOrder.length - 1;
			up.addEventListener("click", () => {
				[settings.manualCategoryOrder[i - 1], settings.manualCategoryOrder[i]] = [
					settings.manualCategoryOrder[i],
					settings.manualCategoryOrder[i - 1],
				];
				void save().then(() => render());
			});
			down.addEventListener("click", () => {
				[settings.manualCategoryOrder[i], settings.manualCategoryOrder[i + 1]] = [
					settings.manualCategoryOrder[i + 1],
					settings.manualCategoryOrder[i],
				];
				void save().then(() => render());
			});
		});
	}
	render();
}

function renderCategoryOverrides(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): void {
	const setting = new Setting(container)
		.setName("Category overrides")
		.setDesc("Map ingredient name substrings to specific categories.");

	const list = setting.settingEl.createDiv("recipe-box-override-list");

	function render(): void {
		list.empty();
		settings.categoryOverrides.forEach((override: CategoryOverride, i: number) => {
			const row = list.createDiv("recipe-box-list-row");
			const matchInput = row.createEl("input", { type: "text", value: override.match, placeholder: "Ingredient substring" });
			const catInput = row.createEl("input", { type: "text", value: override.category, placeholder: "Category" });
			const del = row.createEl("button", { text: "✕" });

			matchInput.addEventListener("change", () => {
				settings.categoryOverrides[i].match = matchInput.value.trim().toLowerCase();
				void save();
			});
			catInput.addEventListener("change", () => {
				settings.categoryOverrides[i].category = catInput.value.trim();
				void save();
			});
			del.addEventListener("click", () => {
				settings.categoryOverrides.splice(i, 1);
				void save().then(() => render());
			});
		});

		const addBtn = list.createEl("button", { text: "+ add override" });
		addBtn.addEventListener("click", () => {
			settings.categoryOverrides.push({ match: "", category: "" });
			void save().then(() => render());
		});
	}
	render();
}
