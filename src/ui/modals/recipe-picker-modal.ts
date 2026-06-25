/**
 * Fuzzy-search modal for picking a recipe file from the vault, used when
 * dropping a recipe card onto a day column in the meal plan view.
 */
import { App, FuzzyMatch, FuzzySuggestModal, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { isRecipeFile } from "../../lifecycle/recipe-file-detection";

function getThumbnailSrc(app: App, file: TFile): string | null {
	const imageValue: unknown = app.metadataCache.getFileCache(file)?.frontmatter?.["image"];
	if (typeof imageValue !== "string" || !imageValue) return null;

	if (/^https?:\/\//i.test(imageValue)) return imageValue;

	const bare = imageValue.replace(/^!?\[\[(.+?)(?:\|.*)?\]\]$/, "$1").trim();
	const resolved = app.metadataCache.getFirstLinkpathDest(bare, "");
	if (resolved instanceof TFile) return app.vault.getResourcePath(resolved);

	const byPath = app.vault.getFileByPath(bare);
	if (byPath instanceof TFile) return app.vault.getResourcePath(byPath);

	return null;
}

export class RecipePickerModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly day: string | undefined,
		private readonly onSelect: (file: TFile, day: string | undefined) => void,
	) {
		super(app);
		const label = day ?? "Queue";
		this.setPlaceholder(`Add recipe to ${label}…`);
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles().filter(
			(f) => isRecipeFile(this.app, f, this.settings)
		);
	}

	getItemText(file: TFile): string {
		return file.basename;
	}

	renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
		el.addClass("rb-recipe-picker-item");

		const thumb = el.createDiv({ cls: "rb-recipe-picker-thumb" });
		const src = getThumbnailSrc(this.app, match.item);
		if (src) {
			const img = thumb.createEl("img", { attr: { src, loading: "lazy" } });
			img.onerror = () => { img.remove(); thumb.addClass("rb-recipe-picker-thumb--empty"); };
		} else {
			thumb.addClass("rb-recipe-picker-thumb--empty");
		}

		const text = el.createDiv({ cls: "rb-recipe-picker-text" });
		text.createDiv({ cls: "rb-recipe-picker-name", text: match.item.basename });
		const folder = match.item.parent?.path ?? "";
		if (folder && folder !== "/") {
			text.createDiv({ cls: "rb-recipe-picker-folder", text: folder });
		}
	}

	onChooseItem(file: TFile): void {
		this.onSelect(file, this.day);
	}
}
