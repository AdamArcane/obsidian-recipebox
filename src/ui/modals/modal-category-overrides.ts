/**
 * Modal for managing ingredient-name substring rules that force specific grocery
 * categories, overriding the automatic dictionary-based categorisation.
 */
import { App, Modal } from "obsidian";
import { CategoryOverride } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";

export class CategoryOverridesModal extends Modal {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly save: () => Promise<void>,
		private readonly getKnownCategories: () => string[],
	) { super(app); }

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal");
		contentEl.createEl("h2", { cls: "rb-modal-title", text: "Category overrides" });
		contentEl.createDiv({ cls: "rb-modal-desc", text: "Map ingredient name substrings to specific categories." });
		contentEl.createEl("hr");

		const list = contentEl.createDiv("recipe-box-override-list");
		this.renderList(list);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderList(list: HTMLElement): void {
		list.empty();
		const knownCategories = this.getKnownCategories();

		this.settings.categoryOverrides.forEach((override: CategoryOverride, i: number) => {
			const row = list.createDiv("recipe-box-list-row");
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
