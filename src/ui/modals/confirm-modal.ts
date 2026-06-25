/**
 * Generic two-button confirmation modal with optional destructive styling,
 * used wherever an irreversible action needs explicit user approval.
 */
import { App } from "obsidian";
import { BaseModal, addFooterButtons } from "./modal-shell";

interface ConfirmOptions {
	cancelLabel?: string;
	destructive?: boolean;
	onConfirm: () => void;
}

export class ConfirmModal extends BaseModal {
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
	}

	renderFooter(footerEl: HTMLElement): void {
		addFooterButtons(footerEl, {
			cancelLabel: this.options.cancelLabel,
			confirmLabel: this.confirmLabel,
			destructive: this.options.destructive,
			onCancel: () => this.close(),
			onConfirm: () => {
				this.close();
				this.options.onConfirm();
			},
		});
	}
}
