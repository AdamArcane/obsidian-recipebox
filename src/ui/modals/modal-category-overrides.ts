/**
 * Modal for managing ingredient-name substring rules that force specific grocery
 * categories, overriding the automatic dictionary-based categorisation.
 */
import { App } from "obsidian";
import { CategoryOverride } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { BaseModal } from "./modal-shell";

export class CategoryOverridesModal extends BaseModal {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly save: () => Promise<void>,
		private readonly getKnownCategories: () => string[],
	) { super(app); }

	getTitle(): string { return "Category overrides"; }
	getSubtitle(): string { return "Map ingredient name substrings to specific categories."; }

	renderBody(bodyEl: HTMLElement): void {
		const list = bodyEl.createDiv("rb-override-list");
		this.renderList(list);
	}

	renderFooter(_footerEl: HTMLElement): void { /* live-edit, no action buttons */ }

	private renderList(list: HTMLElement): void {
		list.empty();
		const knownCategories = this.getKnownCategories();

		this.settings.categoryOverrides.forEach((override: CategoryOverride, i: number) => {
			const row = list.createDiv("rb-list-row");
			const matchInput = row.createEl("input", { type: "text", value: override.match, placeholder: "Ingredient substring" });
			const catInput = row.createEl("input", { type: "text", value: override.category, placeholder: "Category" });

			const datalist = catInput.createEl("datalist");
			datalist.id = `rb-cat-datalist-${i}`;
			knownCategories.forEach((cat) => datalist.createEl("option", { value: cat }));
			catInput.setAttribute("list", datalist.id);

			const del = row.createEl("button", { text: "✕" });

			matchInput.addEventListener("change", () => {
				this.settings.categoryOverrides[i].match = matchInput.value.trim().toLowerCase();
				void this.save();
			});
			catInput.addEventListener("change", () => {
				this.settings.categoryOverrides[i].category = catInput.value.trim();
				void this.save();
			});
			del.addEventListener("click", () => {
				this.settings.categoryOverrides.splice(i, 1);
				void this.save().then(() => this.renderList(list));
			});
		});

		const addBtn = list.createEl("button", { text: "+ add override" });
		addBtn.addEventListener("click", () => {
			this.settings.categoryOverrides.push({ match: "", category: "" });
			void this.save().then(() => this.renderList(list));
		});
	}
}
