/**
 * Generic two-button confirmation modal with optional destructive styling,
 * used wherever an irreversible action needs explicit user approval.
 * Supports an optional checkbox whose checked state is passed to onConfirm.
 */
import { App } from "obsidian";
import { BaseModal, addFooterButtons } from "./modal-shell";

interface ConfirmOptions {
	cancelLabel?: string;
	destructive?: boolean;
	/** If provided, renders a checkbox below the message. The checked value is
	 *  passed as the argument to onConfirm. */
	checkbox?: { label: string; defaultChecked?: boolean };
	onConfirm: (checked: boolean) => void;
}

export class ConfirmModal extends BaseModal {
	// Tracks the checkbox state so renderFooter can read it when confirm fires.
	// Starts as false; set to defaultChecked in renderBody if a checkbox is configured.
	private checkboxChecked = false;

	constructor(
		app: App,
		private readonly heading: string,
		private readonly message: string,
		private readonly confirmLabel: string,
		private readonly options: ConfirmOptions,
	) {
		super(app);
	}

	getTitle(): string { return this.heading; }
	getContentClasses(): string[] { return ["rb-confirm-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		if (this.message) {
			bodyEl.createEl("p", { cls: "rb-modal-message", text: this.message });
		}
		if (this.options.checkbox) {
			this.checkboxChecked = this.options.checkbox.defaultChecked ?? true;
			const row = bodyEl.createEl("label", { cls: "rb-confirm-checkbox-row" });
			const input = row.createEl("input", { attr: { type: "checkbox" } });
			input.checked = this.checkboxChecked;
			row.createSpan({ text: this.options.checkbox.label });
			input.addEventListener("change", () => { this.checkboxChecked = input.checked; });
		}
	}

	renderFooter(footerEl: HTMLElement): void {
		addFooterButtons(footerEl, {
			cancelLabel: this.options.cancelLabel,
			confirmLabel: this.confirmLabel,
			destructive: this.options.destructive,
			onCancel: () => this.close(),
			onConfirm: () => {
				this.close();
				this.options.onConfirm(this.checkboxChecked);
			},
		});
	}
}
