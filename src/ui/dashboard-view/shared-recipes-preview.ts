/**
 * Lists recipes that currently have an active (or expired-but-not-yet-
 * unshared) public share, with each one's expiry. Reuses the existing
 * share-frontmatter/share-status readers rather than re-deriving expiry
 * logic here -- this is purely a glance surface over that same state.
 */
import { App, Notice, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { getShareData } from "../../sharing/share-frontmatter";
import { getShareStatus, ShareStatus } from "../../sharing/share-status";
import { getFrontmatterImageSrc } from "../gallery-view/gallery-image";
import { resolveImagePath } from "../recipe-view/image-resolve";
import { defaultRecipeImageValue } from "../../parser/resolve-hero-image";
import { ConfirmModal } from "../modals/confirm-modal";

export interface SharedRecipeEntry {
	file: TFile;
	status: ShareStatus;
	expiresAt: string;
}

export function computeSharedRecipes(app: App, files: TFile[], settings: RecipeBoxSettings): SharedRecipeEntry[] {
	const entries: SharedRecipeEntry[] = [];
	for (const file of files) {
		const data = getShareData(app.metadataCache.getFileCache(file), settings);
		if (!data) continue;
		entries.push({ file, status: getShareStatus(data), expiresAt: data.expires });
	}
	// Soonest-expiring (and already-expired) shares surface first -- those are
	// the ones most likely to need a renew-or-unshare decision.
	return entries.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
}

function formatStatus(status: ShareStatus): string {
	if (status.kind === "expired") return "Expired";
	if (status.kind === "shared") return status.daysLeft === 1 ? "Expires in 1 day" : `Expires in ${status.daysLeft} days`;
	return "";
}

export interface SharedRecipesPreviewActions {
	openRecipe: (file: TFile) => void;
	unshareRecipe: (file: TFile) => Promise<void>;
}

function confirmAndRevoke(app: App, file: TFile, actions: SharedRecipesPreviewActions): void {
	new ConfirmModal(
		app,
		"Revoke share?",
		`The public link for "${file.basename}" will stop working immediately.`,
		"Revoke",
		{
			destructive: true,
			onConfirm: () => {
				void actions.unshareRecipe(file)
					.then(() => new Notice("Recipe unshared."))
					.catch((err: unknown) => new Notice(`Failed to unshare recipe: ${err instanceof Error ? err.message : String(err)}`));
			},
		},
	).open();
}

export function renderSharedRecipesPreview(
	container: HTMLElement,
	app: App,
	files: TFile[],
	settings: RecipeBoxSettings,
	actions: SharedRecipesPreviewActions,
): void {
	const card = container.createDiv({ cls: "rb-dashboard-card rb-dashboard-span-8" });
	card.createDiv({ cls: "rb-dashboard-card-label", text: "Shared recipes" });

	const shared = computeSharedRecipes(app, files, settings);
	if (shared.length === 0) {
		card.createDiv({ cls: "rb-dashboard-empty-text", text: "No recipes shared yet." });
		return;
	}

	// Frontmatter-only, same as the gallery card's synchronous phase 1 -- no
	// lazy body-image fallback here, this is a compact list, not a card grid.
	const defaultImageValue = defaultRecipeImageValue(settings);
	const defaultSrc = defaultImageValue ? resolveImagePath(app, defaultImageValue) : null;

	const list = card.createDiv({ cls: "rb-dashboard-shared-list" });
	for (const entry of shared) {
		const row = list.createDiv({ cls: "rb-dashboard-shared-row", attr: { role: "button", tabindex: "0" } });

		const src = getFrontmatterImageSrc(app, entry.file, settings) ?? defaultSrc;
		const thumb = row.createDiv({ cls: "rb-dashboard-shared-thumb" });
		if (src) thumb.createEl("img", { attr: { src, loading: "lazy" } });

		row.createSpan({ cls: "rb-dashboard-shared-name", text: entry.file.basename });
		row.createSpan({
			cls: `rb-dashboard-shared-status${entry.status.kind === "expired" ? " rb-dashboard-shared-status--expired" : ""}`,
			text: formatStatus(entry.status),
		});

		const revokeBtn = row.createDiv({
			cls: "rb-dashboard-shared-revoke",
			attr: { role: "button", "aria-label": "Revoke share", title: "Revoke share" },
		});
		setIcon(revokeBtn, "trash-2");
		revokeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			confirmAndRevoke(app, entry.file, actions);
		});

		row.addEventListener("click", () => actions.openRecipe(entry.file));
	}
}
