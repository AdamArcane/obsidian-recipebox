/**
 * Renders a single gallery grid card: image with an overlaid title (bottom,
 * semi-transparent, clamped to 2 lines), a favorite indicator (top left) and
 * a 3-dot actions menu (top right); then a read-only star rating, an
 * icon-led cook/history summary row, and the user's configured badge row
 * (reusing the recipe view's badge rendering path).
 *
 * The stars are read-only and the actions menu only opens existing modals --
 * no mutation logic lives here; rating changes and the modal wiring both stay
 * where they already are (RecipeView / register-views.ts).
 */
import { App, Menu, setIcon, TFile } from "obsidian";
import { CustomBadge } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { renderBadgeRow } from "../recipe-view/badges";
import { renderStarRating, readRating } from "../recipe-view/rating";
import { formatMinutes, readRecipeMeta, RecipeMeta } from "../../parser/recipe-meta-read";
import { getFrontmatterImageSrc } from "./gallery-image";

export interface GalleryCardActions {
	openRecipe: (file: TFile) => void;
	openAddToMealPlanModal: (file: TFile) => void;
	openAddToGroceryModal: (file: TFile) => void;
	openShareModal: (file: TFile) => void;
}

export interface GalleryCardHandle {
	file: TFile;
	setImage: (src: string | null) => void;
}

function formatLastMadeDisplay(iso: string): string {
	const d = new Date(iso + "T00:00:00");
	return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function renderMetaItem(row: HTMLElement, icon: string, text: string): void {
	const item = row.createSpan({ cls: "rb-gallery-card-meta-item" });
	setIcon(item.createSpan({ cls: "rb-gallery-card-meta-icon" }), icon);
	item.createSpan({ text });
}

function renderMetaRow(container: HTMLElement, meta: RecipeMeta): void {
	const row = container.createDiv({ cls: "rb-gallery-card-meta-row" });
	if (meta.times.cook !== null) renderMetaItem(row, "clock", formatMinutes(meta.times.cook));
	renderMetaItem(row, "repeat", meta.cookedCount > 0 ? `${meta.cookedCount}×` : "Never cooked");
	if (meta.lastMade) renderMetaItem(row, "calendar-check", formatLastMadeDisplay(meta.lastMade));
}

// Dividers make no sense on a compact card. The rest of the default badge
// set (cook time, last made) is skipped too since that's now covered by the
// meta row above as icons -- keep only the default diet badge and any
// badge the person added themselves (builtin === false).
function skipBadgeOnCard(badge: CustomBadge): boolean {
	const type = badge.type ?? "badge";
	if (type === "separator" || type === "newline") return true;
	return badge.builtin && badge.property !== "diet";
}

function openActionsMenu(evt: MouseEvent, file: TFile, actions: GalleryCardActions): void {
	const menu = new Menu();
	menu.addItem((item) =>
		item.setTitle("Add to meal plan")
			.setIcon("calendar-plus")
			.onClick(() => actions.openAddToMealPlanModal(file))
	);
	menu.addItem((item) =>
		item.setTitle("Add to grocery list")
			.setIcon("shopping-cart")
			.onClick(() => actions.openAddToGroceryModal(file))
	);
	menu.addItem((item) =>
		item.setTitle("Share recipe")
			.setIcon("share-2")
			.onClick(() => actions.openShareModal(file))
	);
	menu.showAtMouseEvent(evt);
}

export function renderGalleryCard(
	container: HTMLElement,
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	actions: GalleryCardActions,
): GalleryCardHandle {
	const card = container.createDiv({ cls: "rb-gallery-card", attr: { role: "button", tabindex: "0" } });

	const imageSlot = card.createDiv({ cls: "rb-gallery-card-image" });
	let imageEl: HTMLImageElement | null = null;

	function setImage(src: string | null): void {
		// Only the <img> itself is replaced -- imageSlot also holds the title
		// overlay, favorite badge, and actions button, which must survive a
		// lazy image swap.
		imageEl?.remove();
		imageEl = null;
		imageSlot.toggleClass("rb-gallery-card-image--empty", !src);
		if (!src) return;
		imageEl = imageSlot.createEl("img", { attr: { src, loading: "lazy" } });
		imageSlot.prepend(imageEl);
		imageEl.onerror = () => {
			imageEl?.remove();
			imageEl = null;
			imageSlot.addClass("rb-gallery-card-image--empty");
		};
	}

	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter ?? {};
	const meta = readRecipeMeta(cache, settings);

	setImage(getFrontmatterImageSrc(app, file, settings));

	if (meta.favorite) {
		const favorite = imageSlot.createDiv({ cls: "rb-gallery-card-favorite" });
		setIcon(favorite, "heart");
	}

	const menuBtn = imageSlot.createDiv({
		cls: "rb-gallery-card-menu-btn",
		attr: { role: "button", "aria-label": "Recipe actions", tabindex: "0" },
	});
	setIcon(menuBtn, "more-vertical");
	menuBtn.addEventListener("click", (evt) => {
		// Don't let the menu click bubble to the card's open-recipe handler.
		evt.stopPropagation();
		openActionsMenu(evt, file, actions);
	});

	const titleOverlay = imageSlot.createDiv({ cls: "rb-gallery-card-title-overlay" });
	titleOverlay.createDiv({ cls: "rb-gallery-card-title", text: file.basename });

	const info = card.createDiv({ cls: "rb-gallery-card-info" });

	// Read-only stars, and only when there's a rating to show -- five empty
	// stars on every unrated recipe would just be noise on a compact card.
	if (readRating(frontmatter, settings.ratingProperty) > 0) {
		renderStarRating(info, app, file, frontmatter, settings.ratingProperty, { interactive: false });
	}

	renderMetaRow(info, meta);
	renderBadgeRow(info, settings, frontmatter, skipBadgeOnCard);

	const open = (): void => actions.openRecipe(file);
	card.addEventListener("click", open);
	card.addEventListener("keydown", (evt) => {
		if (evt.key === "Enter" || evt.key === " ") {
			evt.preventDefault();
			open();
		}
	});

	return { file, setImage };
}
