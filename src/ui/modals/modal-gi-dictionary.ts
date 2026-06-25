/**
 * Modal for editing the user's custom high-GI food pattern list, with a live
 * validation pass against the pattern compiler.
 */
import { App, Modal } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { compileGiDictionary, DEFAULT_GI_DICTIONARY } from "../../parser/glycemic-dictionary";
import { debounce } from "../../utils/debounce";

export class GiDictionaryModal extends Modal {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly save: () => Promise<void>,
	) { super(app); }

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal");
		contentEl.createEl("h2", { cls: "rb-modal-title", text: "High-gi dictionary" });
		contentEl.createDiv({ cls: "rb-modal-desc", text: "One regex pattern per line. Lines starting with # are comments." });
		contentEl.createEl("hr");

		const textarea = contentEl.createEl("textarea", {
			cls: "recipe-box-gi-textarea recipe-box-gi-textarea--modal",
			text: this.settings.giDictionary,
		});
		textarea.rows = 24;

		const errorEl = contentEl.createDiv({ cls: "recipe-box-gi-errors" });
		const showErrors = (text: string): void => {
			const { errors } = compileGiDictionary(text);
			errorEl.empty();
			if (errors.length === 0) return;
			errorEl.createEl("p", { text: `${errors.length} invalid pattern(s):`, cls: "recipe-box-error-label" });
			errors.forEach((e) => errorEl.createEl("code", { text: e }));
		};

		const debouncedValidate = debounce(() => showErrors(this.settings.giDictionary), 400);

		textarea.addEventListener("input", () => {
			this.settings.giDictionary = textarea.value;
			void this.save().then(() => debouncedValidate());
		});

		showErrors(this.settings.giDictionary);

		let resetPending = false;
		let resetTimer: number | null = null;
		const resetBtn = contentEl.createEl("button", { cls: "recipe-box-reset-btn", text: "Reset to defaults" });
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
				this.settings.giDictionary = DEFAULT_GI_DICTIONARY;
				textarea.value = DEFAULT_GI_DICTIONARY;
				void this.save().then(() => {
					showErrors(DEFAULT_GI_DICTIONARY);
					resetPending = false;
					resetBtn.textContent = "Reset to defaults";
				});
			}
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
