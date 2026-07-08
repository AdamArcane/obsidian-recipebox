/** Renders a small "Currently resolves to: ..." caption below a note path input, updated on demand as the template changes. */
import { resolveNotePath } from "../../utils/vault-notes";

export interface NotePathPreview {
	update(template: string): void;
}

export function renderNotePathPreview(container: HTMLElement, initialTemplate: string): NotePathPreview {
	const el = container.createDiv({ cls: "setting-item-description" });

	const update = (template: string): void => {
		el.setText(`Currently resolves to: ${resolveNotePath(template)}`);
	};
	update(initialTemplate);

	return { update };
}
