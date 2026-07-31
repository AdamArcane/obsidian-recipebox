/**
 * Modal for editing custom unit aliases, with live validation against the
 * alias compiler.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { compileUnitAliases, DEFAULT_UNIT_ALIASES } from "../../parser/unit-aliases";
import { debounce } from "../../utils/debounce";
import { BaseModal } from "./modal-shell";

export class UnitAliasesModal extends BaseModal {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly save: () => Promise<void>,
	) { super(app); }

	getTitle(): string { return "Unit aliases"; }
	getSubtitle(): string { return "One \"alias => unit\" per line. Lines starting with # are comments."; }

	renderBody(bodyEl: HTMLElement): void {
		const textarea = bodyEl.createEl("textarea", {
			cls: "rb-gi-textarea rb-gi-textarea--modal",
			text: this.settings.unitAliases,
		});
		textarea.rows = 24;

		const errorEl = bodyEl.createDiv({ cls: "rb-gi-errors" });
		const showErrors = (text: string): void => {
			const { errors } = compileUnitAliases(text);
			errorEl.empty();
			if (errors.length === 0) return;
			errorEl.createEl("p", { text: `${errors.length} line(s) missing an "=>" separator:`, cls: "rb-error-label" });
			errors.forEach((e) => errorEl.createEl("code", { text: e }));
		};

		const debouncedValidate = debounce(() => showErrors(this.settings.unitAliases), 400);

		textarea.addEventListener("input", () => {
			this.settings.unitAliases = textarea.value;
			void this.save().then(() => debouncedValidate());
		});

		showErrors(this.settings.unitAliases);

		let resetPending = false;
		let resetTimer: number | null = null;
		const resetBtn = bodyEl.createEl("button", { cls: "rb-reset-btn", text: "Reset to defaults" });
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
				this.settings.unitAliases = DEFAULT_UNIT_ALIASES;
				textarea.value = DEFAULT_UNIT_ALIASES;
				void this.save().then(() => {
					showErrors(DEFAULT_UNIT_ALIASES);
					resetPending = false;
					resetBtn.textContent = "Reset to defaults";
				});
			}
		});
	}

	renderFooter(_footerEl: HTMLElement): void { /* live-edit, no action buttons */ }
}
