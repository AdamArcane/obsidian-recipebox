/**
 * Horizontal-scroll strip of the newest recipes (by file creation time), each
 * rendered with the gallery's existing renderGalleryCard rather than a new
 * component -- see dashboard-spec.md section 1 for why that's already reusable.
 * Wires the same lazy-image pass the gallery view uses so cards without a
 * frontmatter image still resolve one from the note body.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { renderGalleryCard, GalleryCardHandle, GalleryCardActions } from "../gallery-view/gallery-card";
import { runLazyImagePass, getFrontmatterImageSrc } from "../gallery-view/gallery-image";
import { resolveImagePath } from "../recipe-view/image-resolve";
import { defaultRecipeImageValue } from "../../parser/resolve-hero-image";

const STRIP_RECIPE_LIMIT = 6;

export function renderNewRecipesStrip(
	container: HTMLElement,
	app: App,
	files: TFile[],
	settings: RecipeBoxSettings,
	cardActions: GalleryCardActions,
	openGalleryView: () => void,
	isCancelled: () => boolean,
): void {
	const card = container.createDiv({ cls: "rb-dashboard-card rb-dashboard-new-recipes rb-dashboard-span-8" });
	card.createDiv({ cls: "rb-dashboard-card-label", text: "New recipes" });

	const newest = [...files].sort((a, b) => b.stat.ctime - a.stat.ctime).slice(0, STRIP_RECIPE_LIMIT);

	const strip = card.createDiv({ cls: "rb-dashboard-new-recipes-strip" });
	const needsLazyImage: GalleryCardHandle[] = [];
	for (const file of newest) {
		const handle = renderGalleryCard(strip, app, file, settings, cardActions);
		if (!getFrontmatterImageSrc(app, file, settings)) needsLazyImage.push(handle);
	}

	if (needsLazyImage.length > 0) {
		const defaultImageValue = defaultRecipeImageValue(settings);
		const defaultSrc = defaultImageValue ? resolveImagePath(app, defaultImageValue) : null;
		void runLazyImagePass(
			app,
			needsLazyImage.map((h) => h.file),
			settings,
			(file, src) => {
				const handle = needsLazyImage.find((h) => h.file.path === file.path);
				handle?.setImage(src ?? defaultSrc);
			},
			isCancelled,
		);
	}

	const footer = card.createEl("button", { cls: "rb-dashboard-footer-btn", text: "Browse all recipes →" });
	footer.addEventListener("click", () => openGalleryView());
}
