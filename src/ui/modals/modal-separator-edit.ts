/**
 * Compact modal for adding or editing a separator badge.
 * Separators have one meaningful field (character) plus presets.
 */
import { App, Modal } from "obsidian";
import { CustomBadge } from "../../types";

const PRESETS = ["|", "·", "/", "—", "•", "∙"];

export class SeparatorEditModal extends Modal {
	private character: string;

	constructor(
		app: App,
		private readonly source: Partial<CustomBadge> | null,
		private readonly onSave: (badge: CustomBadge) => void,
	) {
		super(app);
		this.character = (source as CustomBadge)?.property ?? "|";
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal", "rb-separator-edit-modal");
		contentEl.createEl("h2", { cls: "rb-modal-title", text: this.source ? "Edit separator" : "Add separator" });
		contentEl.createDiv({ cls: "rb-modal-desc", text: "Choose a character to display between badge groups." });
		contentEl.createEl("hr");

		const presetRow = contentEl.createDiv({ cls: "rb-separator-presets" });
		PRESETS.forEach((char) => {
			const btn = presetRow.createEl("button", { cls: "rb-separator-preset-btn", text: char });
			btn.addEventListener("click", () => {
				customInput.value = char;
				this.character = char;
			});
		});

		const customRow = contentEl.createDiv({ cls: "rb-separator-custom-row" });
		customRow.createSpan({ text: "Custom:" });
		const customInput = customRow.createEl("input", { type: "text", value: this.character, cls: "rb-separator-input" });
		customInput.maxLength = 4;
		customInput.addEventListener("input", () => { this.character = customInput.value; });

		const footer = contentEl.createDiv({ cls: "rb-badge-edit-footer" });
		footer.createEl("button", { cls: "mod-cta", text: "Save" }).addEventListener("click", () => {
			this.onSave({
				type: "separator",
				property: this.character || "|",
				label: "",
				color: "default",
				valueType: "auto",
				splitArray: false,
				enabled: true,
				builtin: false,
			});
			this.close();
		});
		footer.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
