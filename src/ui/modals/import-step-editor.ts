/**
 * Step-specific glue for the generic entry list editor: description and note
 * fields, composed with the note as a trailing parenthetical -- the same
 * convention ingredient lines use. There's no dedicated step-note syntax
 * elsewhere in the codebase (steps render as plain Markdown in the recipe
 * view), so the note is decomposed with the same parenthetical extractor
 * ingredients use rather than inventing a second convention.
 */
import { extractInlineNotes } from "../../parser/ingredient-clean";
import { renderEntryListEditor, EntryField } from "./import-entry-list-editor";

const FIELDS: EntryField[] = [
	{ key: "description", label: "Step", placeholder: "Preheat the oven to 350°F", cls: "rb-import-entry-cell--name" },
	{ key: "note", label: "Note", placeholder: "optional", cls: "rb-import-entry-cell--note" },
];

function decompose(line: string): Record<string, string> {
	const { cleaned, note } = extractInlineNotes(line);
	return { description: cleaned, note: note ?? "" };
}

function compose(v: Record<string, string>): string {
	const description = v.description.trim();
	if (!description) return "";
	return v.note.trim() ? `${description} (${v.note.trim()})` : description;
}

function renderSummary(v: Record<string, string>, textEl: HTMLElement): void {
	textEl.createSpan({ text: v.description });
	if (v.note) textEl.createSpan({ cls: "rb-import-entry-item-note", text: ` — ${v.note}` });
}

export function renderStepListEditor(
	parent: HTMLElement,
	initialItems: string[],
	onChange: (items: string[]) => void,
): void {
	renderEntryListEditor(parent, FIELDS, initialItems, decompose, compose, renderSummary, onChange);
}
