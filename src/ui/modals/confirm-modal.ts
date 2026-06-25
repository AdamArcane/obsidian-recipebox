/**
 * Generic two-button confirmation modal with optional destructive styling,
 * used wherever an irreversible action needs explicit user approval.
 */
import { App, Modal } from "obsidian";

interface ConfirmOptions {
	cancelLabel?: string;
	destructive?: boolean;
	onConfirm: () => void;
}

export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private readonly heading: string,
		private readonly message: string,
		private readonly confirmLabel: string,
		private readonly options: ConfirmOptions,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal", "rb-confirm-modal");
		contentEl.createEl("h2", { cls: "rb-modal-title", text: this.heading });
		if (this.message) {
			contentEl.createEl("p", { cls: "rb-modal-message", text: this.message });
		}

		const footer = contentEl.createDiv({ cls: "rb-modal-footer" });
		footer.createEl("button", {
			cls: "rb-modal-btn rb-modal-btn-cancel",
			text: this.options.cancelLabel ?? "Cancel",
		}).addEventListener("click", () => this.close());

		footer.createEl("button", {
			cls: `rb-modal-btn ${this.options.destructive ? "rb-modal-btn-danger" : "rb-modal-btn-primary"}`,
			text: this.confirmLabel,
		}).addEventListener("click", () => {
			this.close();
			this.options.onConfirm();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
