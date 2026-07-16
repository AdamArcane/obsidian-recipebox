/**
 * Renders a single gallery grid card: image, title, badge row (reusing the
 * same badge rendering path as the recipe view header). No inline actions --
 * mutations (favorite, mark cooked) stay inside RecipeView.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { renderBadgeRow } from "../recipe-view/badges";
import { getFrontmatterImageSrc } from "./gallery-image";

export interface GalleryCardHandle {
	file: TFile;
	setImage: (src: string | null) => void;
}

export function renderGalleryCard(
	container: HTMLElement,
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	onOpen: (file: TFile) => void,
): GalleryCardHandle {
	const card = container.createDiv({ cls: "rb-gallery-card", attr: { role: "button", tabindex: "0" } });

	const imageSlot = card.createDiv({ cls: "rb-gallery-card-image" });
	let imageEl: HTMLImageElement | null = null;

	function setImage(src: string | null): void {
		imageEl?.remove();
		imageSlot.empty();
		imageSlot.toggleClass("rb-gallery-card-image--empty", !src);
		if (!src) {
			imageEl = null;
			return;
		}
		imageEl = imageSlot.createEl("img", { attr: { src, loading: "lazy" } });
		imageEl.onerror = () => {
			imageEl?.remove();
			imageEl = null;
			imageSlot.addClass("rb-gallery-card-image--empty");
		};
	}

	setImage(getFrontmatterImageSrc(app, file, settings));

	const info = card.createDiv({ cls: "rb-gallery-card-info" });
	info.createDiv({ cls: "rb-gallery-card-title", text: file.basename });

	const cache = app.metadataCache.getFileCache(file);
	renderBadgeRow(info, settings, cache?.frontmatter ?? {});

	const open = (): void => onOpen(file);
	card.addEventListener("click", open);
	card.addEventListener("keydown", (evt) => {
		if (evt.key === "Enter" || evt.key === " ") {
			evt.preventDefault();
			open();
		}
	});

	return { file, setImage };
}
