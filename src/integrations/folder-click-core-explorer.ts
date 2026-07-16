/**
 * Adapter for Obsidian's built-in file explorer: intercepts clicks on a
 * recipe folder's name and opens the gallery instead of expanding it.
 * Relies on undocumented file-explorer DOM structure (.nav-folder-title,
 * .nav-folder-title-content, data-path) -- all DOM assumptions are wrapped
 * defensively so a future Obsidian internals change fails back to normal
 * folder click behavior instead of breaking navigation.
 */
import RecipeBoxPlugin from "../main";
import { isFolderClickGalleryTarget } from "./folder-click-match";

export function attachCoreExplorerFolderClickAdapter(plugin: RecipeBoxPlugin): () => void {
	// Tracks the element *we* applied "is-active" to. Obsidian's own click
	// handling normally clears the previously-active row via its own
	// remembered reference, not a blanket DOM query -- since it never learns
	// about a class we added by hand (we preventDefault/stopPropagation
	// before its handler runs), it can't clear ours for us. So we track and
	// clear it ourselves instead.
	let markedEl: Element | null = null;

	function clearMarked(): void {
		markedEl?.removeClass("is-active");
		markedEl = null;
	}

	function markActive(titleRow: Element): void {
		const scope = titleRow.closest(".nav-files-container") ?? activeDocument;
		// Also clears whatever Obsidian itself had marked active (a
		// previously open file, say) -- its handler never runs for an
		// intercepted click, so nothing else will do this.
		scope.querySelectorAll(".nav-folder-title.is-active, .nav-file-title.is-active")
			.forEach((el) => el.removeClass("is-active"));
		titleRow.addClass("is-active");
		markedEl = titleRow;
	}

	const handler = (evt: MouseEvent): void => {
		try {
			// Any other click -- a different folder, a file, whitespace --
			// means Obsidian's own handling is about to run and highlight
			// whatever was actually clicked. Clear our own leftover mark
			// first, unconditionally, before deciding whether *this*
			// particular click is one we intercept instead.
			clearMarked();

			const target = evt.target as HTMLElement | null;
			// Only the folder name text is intercepted -- clicks on the
			// collapse/expand arrow or row whitespace are left alone so
			// normal tree navigation keeps working even with this on.
			const titleContent = target?.closest(".nav-folder-title-content");
			if (!titleContent) return;
			const titleRow = titleContent.closest(".nav-folder-title");
			if (!titleRow) return;
			const folderPath = titleRow.getAttribute("data-path");
			if (!folderPath) return;
			if (!isFolderClickGalleryTarget(folderPath, plugin.settings)) return;

			evt.preventDefault();
			evt.stopPropagation();
			markActive(titleRow);
			// Behaves like clicking a file in the explorer -- replaces the
			// current leaf rather than opening a new tab -- but still reuses
			// an already-open gallery leaf if there is one (findOrOpenLeaf).
			void plugin.activateGalleryView(folderPath, { newLeaf: false });
		} catch {
			// Fail back to normal click behavior rather than breaking
			// folder navigation over a broken DOM-structure assumption.
		}
	};

	// Capture phase + stopPropagation() is what actually prevents the
	// explorer's own row listener from ever seeing the click.
	activeDocument.addEventListener("click", handler, true);
	return () => {
		activeDocument.removeEventListener("click", handler, true);
		clearMarked();
	};
}
