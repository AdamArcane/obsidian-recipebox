/**
 * Turns a section header's title text into an "edit this section" button.
 * Only the title text is the target (not the whole header row), so the cart
 * and timer buttons and group-header collapse clicks keep working.
 */
import { setIcon } from "obsidian";

export function makeSectionTitleEditable(titleEl: HTMLElement, label: string, onEdit: () => void): void {
	titleEl.addClass("rb-section-title--editable");
	titleEl.setAttr("role", "button");
	titleEl.setAttr("tabindex", "0");
	titleEl.setAttr("aria-label", label);
	setIcon(titleEl.createSpan({ cls: "rb-section-title-edit-icon" }), "pencil");
	titleEl.addEventListener("click", onEdit);
	titleEl.addEventListener("keydown", (e) => {
		if (e.key !== "Enter" && e.key !== " ") return;
		e.preventDefault();
		onEdit();
	});
	// The plain title stretches (flex: 1) to push the header buttons right;
	// the editable one shrinks to its text so only the text is clickable, and
	// a spacer takes over the stretching.
	titleEl.insertAdjacentElement("afterend", createSpan({ cls: "rb-section-title-spacer" }));
}
