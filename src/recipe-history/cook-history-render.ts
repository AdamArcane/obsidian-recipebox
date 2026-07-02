/**
 * Shared cook history list renderer used by both CookHistoryModal and the
 * mobile recipe view's cook history tab. Reads entries fresh on every call so
 * callers only need to call `container.empty()` then re-invoke to refresh.
 */
import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { attachLightboxToImages } from "../ui/components/lightbox";
import { ConfirmModal } from "../ui/modals/confirm-modal";
import { EntryEditorModal } from "../ui/modals/entry-editor-modal";
import {
	CookHistoryEntry,
	readCookHistory,
	readNoteBodyEntriesWithPhotos,
	editCookHistoryEntry,
	deleteCookHistoryEntry,
} from "./cook-history";

export async function renderCookHistoryList(
	container: HTMLElement,
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	onMutate: () => void,
): Promise<void> {
	const entries = readCookHistory(app, recipeFile, settings);
	const withPhotos = await readNoteBodyEntriesWithPhotos(app, recipeFile, settings);
	const photosById = new Map(withPhotos.map(e => [e.id, e.photoEmbed]));
	const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

	if (sorted.length === 0) {
		container.createDiv({
			cls: "rb-ch-empty",
			text: "No cook history yet. Use \"Mark as cooked\" to add your first entry.",
		});
		return;
	}

	const list = container.createDiv({ cls: "rb-ch-entry-list" });
	sorted.forEach((entry, i) => {
		renderEntryRow(list, entry, photosById.get(entry.id) ?? null, i, app, recipeFile, settings, onMutate);
	});
}

function renderEntryRow(
	container: HTMLElement,
	entry: CookHistoryEntry,
	photoEmbed: string | null,
	index: number,
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	onMutate: () => void,
): void {
	const row = container.createDiv({ cls: "rb-ch-entry" });
	row.toggleClass("rb-ch-entry--odd", index % 2 === 1);

	// Text and photo sit side by side, with the photo pinned to the right edge.
	const top = row.createDiv({ cls: "rb-ch-entry-top" });
	const main = top.createDiv({ cls: "rb-ch-entry-main" });
	main.createDiv({ cls: "rb-ch-entry-date", text: entry.date });
	if (entry.note.trim()) {
		main.createDiv({ cls: "rb-ch-entry-note", text: entry.note });
	}

	if (photoEmbed) {
		const imgFile = app.metadataCache.getFirstLinkpathDest(photoEmbed, recipeFile.path);
		if (imgFile) {
			const imgWrap = top.createDiv({ cls: "rb-ch-entry-photo" });
			const img = imgWrap.createEl("img", { attr: { alt: "" } });
			img.src = app.vault.getResourcePath(imgFile);
			attachLightboxToImages(imgWrap);
		}
	}

	const actions = row.createDiv({ cls: "rb-ch-entry-actions" });

	const editBtn = actions.createEl("button", { cls: "rb-icon-btn", title: "Edit" });
	setIcon(editBtn, "pencil");
	editBtn.addEventListener("click", () => {
		new EntryEditorModal(app, recipeFile, settings, entry, async (date, note, image) => {
			await editCookHistoryEntry(app, recipeFile, settings, entry.id, date, note, image);
			onMutate();
		}).open();
	});

	const deleteBtn = actions.createEl("button", { cls: "rb-icon-btn rb-icon-btn--danger", title: "Delete" });
	setIcon(deleteBtn, "trash-2");
	deleteBtn.addEventListener("click", () => {
		new ConfirmModal(
			app,
			"Delete entry?",
			`Remove the ${entry.date} cook history entry. This cannot be undone.`,
			"Delete",
			{
				destructive: true,
				onConfirm: () => {
					void deleteCookHistoryEntry(app, recipeFile, settings, entry.id).then(() => onMutate());
				},
			},
		).open();
	});
}
