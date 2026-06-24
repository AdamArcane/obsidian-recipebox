import { App, Modal } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";

export class AllergensModal extends Modal {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly save: () => Promise<void>,
	) { super(app); }

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal");
		contentEl.createEl("h2", { cls: "rb-modal-title", text: "My allergens" });
		contentEl.createDiv({ cls: "rb-modal-desc", text: "Warn when a recipe contains any of these allergens." });
		contentEl.createEl("hr");

		const wrapper = contentEl.createDiv("recipe-box-tag-editor");
		this.renderEditor(wrapper);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderEditor(wrapper: HTMLElement): void {
		wrapper.empty();
		const tagRow = wrapper.createDiv("recipe-box-tag-row");
		this.settings.myAllergens.forEach((tag, i) => {
			const chip = tagRow.createSpan({ cls: "recipe-box-tag-chip", text: tag });
			const del = chip.createEl("button", { text: "✕" });
			del.addEventListener("click", () => {
				this.settings.myAllergens.splice(i, 1);
				void this.save().then(() => this.renderEditor(wrapper));
			});
		});

		const input = wrapper.createEl("input", { type: "text", placeholder: "Add allergen and press Enter…" });
		input.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" || !input.value.trim()) return;
			const val = input.value.trim();
			if (!this.settings.myAllergens.includes(val)) {
				this.settings.myAllergens.push(val);
				void this.save().then(() => this.renderEditor(wrapper));
			} else {
				this.renderEditor(wrapper);
			}
		});
		input.focus();
	}
}
