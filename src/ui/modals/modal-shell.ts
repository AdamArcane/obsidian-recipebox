/**
 * Abstract base class that owns the three-part modal layout: sticky header,
 * scrollable body, sticky footer. Concrete modals extend BaseModal and never
 * touch contentEl directly -- they only receive body/footer as parameters.
 *
 * Using an abstract class (vs. a helper function) means a concrete modal
 * literally cannot put content in the wrong place: BaseModal's onOpen() is
 * the only code that ever constructs the outer structure.
 */

import { Modal, setIcon } from "obsidian";

export abstract class BaseModal extends Modal {
	/** Protected so multi-stage modals (e.g. ImportRecipeModal) can update it. */
	protected shellTitleEl!: HTMLElement;

	/** Text shown in the modal header. */
	abstract getTitle(): string;

	/** Populate the scrollable body region. May return a Promise for async loading. */
	abstract renderBody(bodyEl: HTMLElement): void | Promise<void>;

	/** Populate the sticky footer (action buttons). Implement as empty body for live-edit modals. */
	abstract renderFooter(footerEl: HTMLElement): void;

	/** Optional Lucide icon shown left of the title. */
	getIcon(): string | undefined { return undefined; }

	/** Optional subtitle shown beneath the title. */
	getSubtitle(): string | undefined { return undefined; }

	/** Extra CSS classes to add to contentEl (modal-specific). */
	getContentClasses(): string[] { return []; }

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal", "rb-shell", ...this.getContentClasses());

		const headerEl = contentEl.createDiv({ cls: "rb-shell-header" });
		const icon = this.getIcon();
		if (icon) setIcon(headerEl.createSpan({ cls: "rb-shell-icon" }), icon);
		this.shellTitleEl = headerEl.createEl("h2", { cls: "rb-shell-title", text: this.getTitle() });
		const subtitle = this.getSubtitle();
		if (subtitle) headerEl.createEl("p", { cls: "rb-shell-subtitle", text: subtitle });

		const bodyEl = contentEl.createDiv({ cls: "rb-shell-body" });
		const footerEl = contentEl.createDiv({ cls: "rb-shell-footer" });

		// renderFooter is always synchronous; renderBody may be async.
		// Footer is set up immediately so Cancel is always reachable.
		this.renderFooter(footerEl);
		void this.renderBody(bodyEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/**
 * Appends a Cancel button (first, per spec order) then a primary action button.
 * Returns the primary button so callers can attach async click handlers or disable it.
 */
export function addFooterButtons(
	footerEl: HTMLElement,
	opts: {
		cancelLabel?: string;
		confirmLabel: string;
		destructive?: boolean;
		onCancel: () => void;
		onConfirm: () => void;
	},
): HTMLButtonElement {
	footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: opts.cancelLabel ?? "Cancel" })
		.addEventListener("click", opts.onCancel);
	const btn = footerEl.createEl("button", {
		cls: opts.destructive ? "mod-warning" : "mod-cta",
		text: opts.confirmLabel,
	});
	btn.addEventListener("click", opts.onConfirm);
	return btn;
}
