/**
 * Compact modal for adding or editing a separator badge.
 * Separators have one meaningful field (character) plus presets.
 */
import { t as translateUi } from "../../i18n";
import { App } from "obsidian";
import { CustomBadge } from "../../types";
import { BaseModal } from "./modal-shell";

const PRESETS = ["|", "·", "/", "—", "•", "∙"];

export class SeparatorEditModal extends BaseModal {
	private character: string;

	constructor(
		app: App,
		private readonly source: Partial<CustomBadge> | null,
		private readonly onSave: (badge: CustomBadge) => void,
	) {
		super(app);
		this.character = (source as CustomBadge)?.property ?? "|";
	}

	getTitle(): string { return this.source ? translateUi("Edit separator") : translateUi("Add separator"); }
	getContentClasses(): string[] { return ["rb-separator-edit-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		bodyEl.createDiv({ cls: "rb-modal-desc", text: translateUi("Choose a character to display between badge groups.") });

		const presetRow = bodyEl.createDiv({ cls: "rb-separator-presets" });
		PRESETS.forEach((char) => {
			const btn = presetRow.createEl("button", { cls: "rb-separator-preset-btn", text: char });
			btn.addEventListener("click", () => {
				customInput.value = char;
				this.character = char;
			});
		});

		const customRow = bodyEl.createDiv({ cls: "rb-separator-custom-row" });
		customRow.createSpan({ text: translateUi("Custom:") });
		const customInput = customRow.createEl("input", { type: "text", value: this.character, cls: "rb-separator-input" });
		customInput.maxLength = 4;
		customInput.addEventListener("input", () => { this.character = customInput.value; });
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: translateUi("Cancel") })
			.addEventListener("click", () => this.close());
		footerEl.createEl("button", { cls: "mod-cta", text: translateUi("Save") })
			.addEventListener("click", () => {
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
	}
}
