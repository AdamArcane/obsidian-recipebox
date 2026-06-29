/**
 * Modal that displays a recipe's cook history entries read from structured
 * frontmatter, with full add/edit/delete support. Frontmatter is the source
 * of truth for date and note; the note-body render is kept in sync by the
 * write functions in recipe-history/cook-history.ts on every change here.
 */
import { App, Platform, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { CookedImageResult } from "../recipe-view/recipe-view-deps";
import { attachLightboxToImages } from "../components/lightbox";
import { VaultImageSuggestModal } from "./vault-image-suggest-modal";
import { ConfirmModal } from "./confirm-modal";
import { BaseModal } from "./modal-shell";
import { localDateISO } from "../../utils/date";
import {
	CookHistoryEntry,
	CookHistoryEntryWithPhoto,
	readCookHistory,
	readNoteBodyEntriesWithPhotos,
	addCookHistoryEntry,
	editCookHistoryEntry,
	deleteCookHistoryEntry,
} from "../../recipe-history/cook-history";

type EntryDraftImage = CookedImageResult | null | undefined; // undefined = leave existing photo untouched

export class CookHistoryModal extends BaseModal {
	private shellBody!: HTMLElement;
	private shellFooter!: HTMLElement;

	constructor(
		app: App,
		private readonly recipeFile: TFile,
		private readonly settings: RecipeBoxSettings,
	) {
		super(app);
	}

	getTitle(): string { return "Cook history"; }
	getIcon(): string { return "history"; }
	getSubtitle(): string { return this.recipeFile.basename; }
	getContentClasses(): string[] { return ["rb-ch-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		this.shellBody = bodyEl;
		void this.loadAndRender();
	}

	renderFooter(footerEl: HTMLElement): void {
		this.shellFooter = footerEl;
	}

	/**
	 * Initial load only: reads entries from the metadata cache. Used solely
	 * when the modal first opens, where the cache is the only source available.
	 * After any add/edit/delete, render() is called directly with the entries
	 * those functions already returned, rather than re-reading this cache,
	 * which updates asynchronously after a write and is not guaranteed to be
	 * current on the very next tick.
	 */
	private async loadAndRender(): Promise<void> {
		const entries = readCookHistory(this.app, this.recipeFile, this.settings);
		await this.render(entries);
	}

	/** Renders the full entry list (and footer) from a known-correct entries array, plus a fresh photo lookup from the note body, which is always safe to re-read since it isn't behind an async cache. */
	private async render(entries: CookHistoryEntry[]): Promise<void> {
		const withPhotos = await readNoteBodyEntriesWithPhotos(this.app, this.recipeFile, this.settings);
		const photosById = new Map(withPhotos.map(e => [e.id, e.photoEmbed]));

		const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

		this.shellBody.empty();

		if (sorted.length === 0) {
			this.shellBody.createDiv({ cls: "rb-ch-empty", text: "No cook history entries yet." });
		} else {
			const list = this.shellBody.createDiv({ cls: "rb-ch-entry-list" });
			sorted.forEach((entry, i) => {
				this.renderEntryRow(list, entry, photosById.get(entry.id) ?? null, i);
			});
		}

		this.shellFooter.empty();
		const addBtn = this.shellFooter.createEl("button", { cls: "mod-cta" });
		const addIcon = addBtn.createSpan({ cls: "rb-ch-btn-icon" });
		setIcon(addIcon, "plus");
		addBtn.createSpan({ text: "Add entry" });
		addBtn.addEventListener("click", () => this.openEntryEditor(null));

		const closeBtn = this.shellFooter.createEl("button", { cls: "rb-shell-cancel-btn" });
		closeBtn.createSpan({ text: "Close" });
		closeBtn.addEventListener("click", () => this.close());
	}

	private renderEntryRow(container: HTMLElement, entry: CookHistoryEntry, photoEmbed: string | null, index: number): void {
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
			const imgFile = this.app.metadataCache.getFirstLinkpathDest(photoEmbed, this.recipeFile.path);
			if (imgFile) {
				const imgWrap = top.createDiv({ cls: "rb-ch-entry-photo" });
				const img = imgWrap.createEl("img", { attr: { alt: "" } });
				img.src = this.app.vault.getResourcePath(imgFile);
				attachLightboxToImages(imgWrap);
			}
		}

		const actions = row.createDiv({ cls: "rb-ch-entry-actions" });

		const editBtn = actions.createEl("button", { cls: "rb-ch-icon-btn", title: "Edit" });
		setIcon(editBtn, "pencil");
		editBtn.addEventListener("click", () => this.openEntryEditor(entry));

		const deleteBtn = actions.createEl("button", { cls: "rb-ch-icon-btn rb-ch-icon-btn-danger", title: "Delete" });
		setIcon(deleteBtn, "trash-2");
		deleteBtn.addEventListener("click", () => {
			new ConfirmModal(
				this.app,
				"Delete entry?",
				`Remove the ${entry.date} cook history entry. This cannot be undone.`,
				"Delete",
				{
					destructive: true,
					onConfirm: () => {
						void deleteCookHistoryEntry(this.app, this.recipeFile, this.settings, entry.id)
							.then((updated) => this.render(updated));
					},
				},
			).open();
		});
	}

	/** Opens the add/edit sub-flow for a single entry. Passing null means "add new"; passing an entry means "edit this one". */
	private openEntryEditor(entry: CookHistoryEntry | null): void {
		new EntryEditorModal(this.app, this.recipeFile, this.settings, entry, async (date, note, image) => {
			const updated = entry
				? await editCookHistoryEntry(this.app, this.recipeFile, this.settings, entry.id, date, note, image)
				: await addCookHistoryEntry(this.app, this.recipeFile, this.settings, date, note, image ?? null);
			void this.render(updated);
		}).open();
	}
}

/**
 * Sub-modal for adding or editing a single entry. Reuses the same field
 * layout as MarkCookedModal (date, notes, photo picker) since this is the
 * same data shape, just opened from a different entry point.
 */
class EntryEditorModal extends BaseModal {
	private selectedDate: string;
	private notes: string;
	private imageResult: EntryDraftImage = undefined;
	private previewUrl: string | null = null;
	// True the moment the user explicitly picks/removes an image. Guards against
	// the async existing-photo lookup below resolving late and overwriting a
	// choice the user already made.
	private userChangedImage = false;

	constructor(
		app: App,
		private readonly recipeFile: TFile,
		private readonly settings: RecipeBoxSettings,
		private readonly editing: CookHistoryEntry | null,
		private readonly onSave: (date: string, note: string, image: EntryDraftImage) => Promise<void>,
	) {
		super(app);
		this.selectedDate = editing?.date ?? localDateISO();
		this.notes = editing?.note ?? "";
	}

	getTitle(): string { return this.editing ? "Edit entry" : "Add entry"; }
	getIcon(): string { return this.editing ? "pencil" : "plus"; }
	getSubtitle(): string { return this.recipeFile.basename; }
	getContentClasses(): string[] { return ["rb-mark-cooked-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const fields = bodyEl.createDiv({ cls: "rb-mark-cooked-fields" });

		const dateField = fields.createDiv({ cls: "rb-modal-field rb-mark-cooked-date-field" });
		dateField.createEl("label", { cls: "rb-modal-field-label", text: "Date" });
		const dateInput = dateField.createEl("input", { cls: "rb-modal-input", attr: { type: "date" } });
		dateInput.value = this.selectedDate;
		dateInput.addEventListener("change", () => {
			this.selectedDate = dateInput.value || localDateISO();
			if (!dateInput.value) dateInput.value = this.selectedDate;
		});

		const notesField = fields.createDiv({ cls: "rb-modal-field rb-mark-cooked-notes-field" });
		notesField.createEl("label", { cls: "rb-modal-field-label", text: "Notes" });
		const notesInput = notesField.createEl("textarea", {
			cls: "rb-modal-input rb-mark-cooked-notes-input",
			attr: { rows: "6", placeholder: "How did it turn out?" },
		});
		notesInput.value = this.notes;
		notesInput.addEventListener("input", () => { this.notes = notesInput.value; });
		window.requestAnimationFrame(() => notesInput.focus());

		this.buildImageSection(bodyEl);
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		footerEl.createEl("button", { cls: "mod-cta", text: this.editing ? "Save changes" : "Add entry" })
			.addEventListener("click", () => {
				void this.onSave(this.selectedDate, this.notes.trim(), this.imageResult);
				this.close();
			});
	}

	override onClose(): void {
		this.releasePreview();
		this.contentEl.empty();
	}

	private buildImageSection(container: HTMLElement): void {
		container.createEl("p", { cls: "rb-modal-section-title", text: "Photo" });

		const imageLayout = container.createDiv({ cls: "rb-modal-image-layout" });
		const btnRow = imageLayout.createDiv({ cls: "rb-modal-image-btns" });
		const previewWrap = imageLayout.createDiv({ cls: "rb-modal-image-preview" });
		const previewImg = previewWrap.createEl("img", { attr: { alt: "" }, cls: "rb-hidden" });

		const showPreview = (src: string | null): void => {
			const hasImage = Boolean(src);
			if (src) previewImg.src = src;
			imageLayout.toggleClass("rb-modal-image-layout-has-preview", hasImage);
			previewWrap.toggleClass("rb-hidden", !hasImage);
			previewImg.toggleClass("rb-hidden", !hasImage);
			removeBtn.toggleClass("rb-hidden", !hasImage);
		};

		const vaultBtn = btnRow.createEl("button", { cls: "rb-modal-btn", title: "Choose from vault" });
		vaultBtn.addEventListener("click", () => {
			new VaultImageSuggestModal(this.app, vaultFile => {
				this.releasePreview();
				this.userChangedImage = true;
				this.imageResult = { kind: "vault-file", file: vaultFile };
				showPreview(this.app.vault.getResourcePath(vaultFile));
			}).open();
		});
		setIcon(vaultBtn.createSpan({ cls: "rb-modal-btn-icon" }), "folder");
		if (!Platform.isMobile) vaultBtn.createSpan({ text: "Select from vault" });

		const uploadInput = container.createEl("input", { attr: { type: "file", accept: "image/*", style: "display:none" } });
		uploadInput.addEventListener("change", () => void this.handleFileInput(uploadInput, showPreview));
		const uploadBtn = btnRow.createEl("button", { cls: "rb-modal-btn", title: "Upload image" });
		uploadBtn.addEventListener("click", () => uploadInput.click());
		setIcon(uploadBtn.createSpan({ cls: "rb-modal-btn-icon" }), "upload");
		if (!Platform.isMobile) uploadBtn.createSpan({ text: "Upload" });

		if (Platform.isMobile) {
			const cameraInput = container.createEl("input", {
				attr: { type: "file", accept: "image/*", capture: "environment", style: "display:none" },
			});
			const cameraBtn = btnRow.createEl("button", { cls: "rb-modal-btn", title: "Take photo", text: "" });
			cameraBtn.addEventListener("click", () => cameraInput.click());
			setIcon(cameraBtn, "camera");
			cameraInput.addEventListener("change", () => void this.handleFileInput(cameraInput, showPreview));
		}

		const removeBtn = btnRow.createEl("button", { cls: "rb-modal-btn rb-modal-btn-danger rb-modal-btn-remove", title: "Remove image", text: "" });
		removeBtn.addEventListener("click", () => {
			this.releasePreview();
			this.userChangedImage = true;
			// Explicit null (not undefined) tells the writer to remove any existing photo, vs. leaving it untouched.
			this.imageResult = null;
			showPreview(null);
		});
		setIcon(removeBtn, "trash-2");
		if (!Platform.isMobile) removeBtn.createSpan({ text: "Remove" });

		showPreview(null);

		// When editing an existing entry, look up whether it already has a photo
		// and pre-fill the preview. The photo isn't in frontmatter (see
		// cook-history.ts header), so this requires a note-body read.
		if (this.editing) {
			void readNoteBodyEntriesWithPhotos(this.app, this.recipeFile, this.settings).then(entries => {
				if (this.userChangedImage) return; // user already made a choice before this resolved
				const match = entries.find((e: CookHistoryEntryWithPhoto) => e.id === this.editing!.id);
				if (match?.photoEmbed) {
					const imgFile = this.app.metadataCache.getFirstLinkpathDest(match.photoEmbed, this.recipeFile.path);
					if (imgFile) showPreview(this.app.vault.getResourcePath(imgFile));
				}
			});
		}
	}

	private async handleFileInput(input: HTMLInputElement, showPreview: (src: string | null) => void): Promise<void> {
		const file = input.files?.[0];
		if (!file) return;
		this.releasePreview();
		this.userChangedImage = true;
		this.previewUrl = URL.createObjectURL(file);
		showPreview(this.previewUrl);
		const data = await file.arrayBuffer();
		this.imageResult = { kind: "upload", filename: file.name, data };
	}

	private releasePreview(): void {
		if (this.previewUrl) { URL.revokeObjectURL(this.previewUrl); this.previewUrl = null; }
	}
}
