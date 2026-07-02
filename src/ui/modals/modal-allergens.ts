/**
 * Modal for editing the user's personal allergen list, used from the health
 * and safety settings section.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { BaseModal } from "./modal-shell";

export class AllergensModal extends BaseModal {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly save: () => Promise<void>,
	) { super(app); }

	getTitle(): string { return "My allergens"; }
	getSubtitle(): string { return "Warn when a recipe contains any of these allergens."; }

	renderBody(bodyEl: HTMLElement): void {
		const wrapper = bodyEl.createDiv("rb-tag-editor");
		this.renderEditor(wrapper);
	}

	renderFooter(_footerEl: HTMLElement): void { /* live-edit, no action buttons */ }

	private renderEditor(wrapper: HTMLElement): void {
		wrapper.empty();
		const tagRow = wrapper.createDiv("rb-tag-row");
		this.settings.myAllergens.forEach((tag, i) => {
			const chip = tagRow.createSpan({ cls: "rb-tag-chip", text: tag });
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
