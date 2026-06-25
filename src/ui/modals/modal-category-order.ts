/**
 * Modal for reordering grocery categories via drag-and-drop or up/down buttons
 * when automatic category sorting is disabled.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { DEFAULT_SETTINGS } from "../../settings/settings-defaults";
import { BaseModal } from "./modal-shell";

export class CategoryOrderModal extends BaseModal {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly save: () => Promise<void>,
	) { super(app); }

	getTitle(): string { return "Category order"; }
	getSubtitle(): string { return "Drag or use buttons to set the display order when auto-sort is off."; }

	renderBody(bodyEl: HTMLElement): void {
		const list = bodyEl.createDiv("recipe-box-order-list");
		this.renderList(list);
	}

	renderFooter(_footerEl: HTMLElement): void { /* live-edit, no action buttons */ }

	private renderList(list: HTMLElement): void {
		list.empty();
		this.settings.manualCategoryOrder.forEach((cat, i) => {
			const row = list.createDiv("recipe-box-list-row");
			row.createSpan({ text: cat });
			const up = row.createEl("button", { text: "↑" });
			const down = row.createEl("button", { text: "↓" });
			up.disabled = i === 0;
			down.disabled = i === this.settings.manualCategoryOrder.length - 1;

			up.addEventListener("click", () => {
				[this.settings.manualCategoryOrder[i - 1], this.settings.manualCategoryOrder[i]] =
					[this.settings.manualCategoryOrder[i], this.settings.manualCategoryOrder[i - 1]];
				void this.save().then(() => this.renderList(list));
			});
			down.addEventListener("click", () => {
				[this.settings.manualCategoryOrder[i], this.settings.manualCategoryOrder[i + 1]] =
					[this.settings.manualCategoryOrder[i + 1], this.settings.manualCategoryOrder[i]];
				void this.save().then(() => this.renderList(list));
			});
		});

		let resetPending = false;
		let resetTimer: number | null = null;
		const resetBtn = list.createEl("button", { cls: "recipe-box-reset-btn", text: "Reset to defaults" });
		resetBtn.addEventListener("click", () => {
			if (!resetPending) {
				resetPending = true;
				resetBtn.textContent = "Confirm reset?";
				resetTimer = window.setTimeout(() => {
					resetPending = false;
					resetBtn.textContent = "Reset to defaults";
				}, 3000);
			} else {
				if (resetTimer) window.clearTimeout(resetTimer);
				this.settings.manualCategoryOrder = [...DEFAULT_SETTINGS.manualCategoryOrder];
				void this.save().then(() => this.renderList(list));
			}
		});
	}
}
