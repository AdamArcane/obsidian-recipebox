/**
 * Modal for stamping a recipe as cooked, collecting a date, optional notes,
 * and an optional photo before writing the history entry.
 */
import { App, Modal, Platform, Setting, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { CookedImageResult } from "../recipe-view/recipe-view-deps";
import { VaultImageSuggestModal } from "./vault-image-suggest-modal";
import { localDateISO } from "../../utils/date";

export class MarkCookedModal extends Modal {
	private selectedDate: string;
	private notes = "";
	private imageResult: CookedImageResult | null = null;
	private previewUrl: string | null = null;

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly settings: RecipeBoxSettings,
		private readonly onStamp: (date: string, notes: string, image: CookedImageResult | null) => void,
	) {
		super(app);
		this.selectedDate = localDateISO();
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal");
		contentEl.createEl("h2", { cls: "rb-modal-title", text: "Mark as cooked" });
		contentEl.createEl("p", { cls: "rb-modal-subtitle", text: this.file.basename });

		new Setting(contentEl)
			.setName("Date")
			.addText(text => {
				text.inputEl.type = "date";
				text.setValue(this.selectedDate);
				text.onChange(v => { this.selectedDate = v || localDateISO(); });
			});

		if (this.settings.cookHistoryEnabled) {
			new Setting(contentEl)
				.setName("Notes")
				.setDesc("How did it turn out?")
				.addTextArea(ta => {
					ta.setPlaceholder("Optional…");
					ta.onChange(v => { this.notes = v; });
				});

			this.buildImageSection(contentEl);
		}

		const footer = contentEl.createDiv({ cls: "rb-modal-footer" });
		footer.createEl("button", { cls: "rb-modal-btn rb-modal-btn-cancel", text: "Cancel" })
			.addEventListener("click", () => this.close());
		footer.createEl("button", { cls: "rb-modal-btn rb-modal-btn-primary", text: "Mark as cooked" })
			.addEventListener("click", () => {
				this.onStamp(this.selectedDate, this.notes.trim(), this.imageResult);
				this.close();
			});
	}

	private buildImageSection(container: HTMLElement): void {
		container.createEl("p", { cls: "rb-modal-section-title", text: "Photo" });

		const previewWrap = container.createDiv({ cls: "rb-modal-image-preview" });
		const previewImg = previewWrap.createEl("img", { attr: { alt: "" }, cls: "is-hidden" });

		const showPreview = (src: string | null): void => {
			if (src) { previewImg.src = src; }
			previewImg.toggleClass("is-hidden", !src);
		};

		const btnRow = container.createDiv({ cls: "rb-modal-image-btns" });

		btnRow.createEl("button", { cls: "rb-modal-btn", text: "Choose from vault" })
			.addEventListener("click", () => {
				new VaultImageSuggestModal(this.app, vaultFile => {
					this.releasePreview();
					this.imageResult = { kind: "vault-file", file: vaultFile };
					showPreview(this.app.vault.getResourcePath(vaultFile));
				}).open();
			});

		const uploadInput = container.createEl("input", {
			attr: { type: "file", accept: "image/*", style: "display:none" },
		});
		btnRow.createEl("button", { cls: "rb-modal-btn", text: "Upload file" })
			.addEventListener("click", () => uploadInput.click());
		uploadInput.addEventListener("change", () => void this.handleFileInput(uploadInput, showPreview));

		if (Platform.isMobile) {
			const cameraInput = container.createEl("input", {
				attr: { type: "file", accept: "image/*", capture: "environment", style: "display:none" },
			});
			btnRow.createEl("button", { cls: "rb-modal-btn", text: "Take photo" })
				.addEventListener("click", () => cameraInput.click());
			cameraInput.addEventListener("change", () => void this.handleFileInput(cameraInput, showPreview));
		}

		btnRow.createEl("button", { cls: "rb-modal-btn rb-modal-btn-danger", text: "Remove" })
			.addEventListener("click", () => { this.releasePreview(); this.imageResult = null; showPreview(null); });
	}

	private async handleFileInput(input: HTMLInputElement, showPreview: (src: string | null) => void): Promise<void> {
		const file = input.files?.[0];
		if (!file) return;
		this.releasePreview();
		this.previewUrl = URL.createObjectURL(file);
		showPreview(this.previewUrl);
		const data = await file.arrayBuffer();
		this.imageResult = { kind: "upload", filename: file.name, data };
	}

	private releasePreview(): void {
		if (this.previewUrl) { URL.revokeObjectURL(this.previewUrl); this.previewUrl = null; }
	}

	onClose(): void {
		this.releasePreview();
		this.contentEl.empty();
	}
}
