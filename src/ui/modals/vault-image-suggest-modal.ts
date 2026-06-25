/**
 * Fuzzy-search modal for picking an image file from the vault, used when
 * attaching a photo to a cook history entry.
 */
import { App, FuzzySuggestModal, TFile } from "obsidian";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "heic", "heif"]);

export class VaultImageSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private readonly onSelect: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder("Search for an image in your vault…");
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter(f => IMAGE_EXTS.has(f.extension.toLowerCase()));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onSelect(file);
	}
}
