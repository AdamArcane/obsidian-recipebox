/**
 * Click, middle-click, hover preview and context menu for internal links
 * rendered with MarkdownRenderer. Obsidian's reading view wires these up
 * itself, but a custom view gets only the <a> markup, so without this the links
 * render and do nothing.
 */
import { App, Component, HoverParent, Keymap, Menu, PaneType, WorkspaceLeaf } from "obsidian";
import { linkTargetFromAttributes, splitLinkpath } from "./link-target";

export interface LinkHandlerOptions {
	/** The hover-link source id registered in onload (the view type). */
	hoverSource: string;
	hoverParent: HoverParent;
	/** Called before a click navigates, e.g. so a modal can close first. */
	onNavigate?: () => void;
	/** The leaf hosting the links, passed to file-menu listeners. Absent in modals. */
	getLeaf?: () => WorkspaceLeaf | null;
}

// Obsidian's reading view adds these three items from its own link handler,
// not from the file-menu event, so a custom view has to add them itself.
const OPEN_ITEMS: Array<{ title: string; icon: string; where: PaneType }> = [
	{ title: "Open in new tab", icon: "file-plus", where: "tab" },
	{ title: "Open to the right", icon: "separator-vertical", where: "split" },
	{ title: "Open in new window", icon: "scan", where: "window" },
];

function internalLink(evt: Event, root: HTMLElement): { anchor: HTMLAnchorElement; linktext: string } | null {
	const anchor = (evt.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a.internal-link");
	if (!anchor || !root.contains(anchor)) return null;
	const linktext = linkTargetFromAttributes(anchor.getAttribute("data-href"), anchor.getAttribute("href"));
	return linktext ? { anchor, linktext } : null;
}

/**
 * Registers delegated listeners on `root`, so one call covers every section,
 * layout and card inside it. `getSourcePath` is a getter because the same view
 * leaf can navigate to a different file without being rebuilt.
 */
export function registerLinkHandlers(
	app: App,
	component: Component,
	root: HTMLElement,
	getSourcePath: () => string,
	options: LinkHandlerOptions,
): void {
	component.registerDomEvent(root, "click", (evt) => {
		const link = internalLink(evt, root);
		if (!link || evt.button !== 0) return;
		// Stops the browser following the href, and (via the callers' cross-off
		// guard) the row from being struck through.
		evt.preventDefault();
		options.onNavigate?.();
		void app.workspace.openLinkText(link.linktext, getSourcePath(), Keymap.isModEvent(evt));
	});

	component.registerDomEvent(root, "auxclick", (evt) => {
		const link = internalLink(evt, root);
		if (!link || evt.button !== 1) return;
		evt.preventDefault();
		options.onNavigate?.();
		void app.workspace.openLinkText(link.linktext, getSourcePath(), "tab");
	});

	component.registerDomEvent(root, "mouseover", (evt) => {
		const link = internalLink(evt, root);
		if (!link) return;
		app.workspace.trigger("hover-link", {
			event: evt,
			source: options.hoverSource,
			hoverParent: options.hoverParent,
			targetEl: link.anchor,
			linktext: link.linktext,
			sourcePath: getSourcePath(),
		});
	});

	component.registerDomEvent(root, "contextmenu", (evt) => {
		const link = internalLink(evt, root);
		if (!link) return;
		const sourcePath = getSourcePath();
		const file = app.metadataCache.getFirstLinkpathDest(splitLinkpath(link.linktext), sourcePath);
		// Unresolved link: leave the default menu alone, there is no file to act on.
		if (!file) return;
		evt.preventDefault();
		const menu = new Menu();
		for (const item of OPEN_ITEMS) {
			menu.addItem((menuItem) =>
				menuItem.setTitle(item.title).setIcon(item.icon).onClick(() => {
					options.onNavigate?.();
					void app.workspace.openLinkText(link.linktext, sourcePath, item.where);
				}),
			);
		}
		menu.addSeparator();
		// Plugins that add file-menu items may use the leaf argument, so pass the
		// hosting leaf rather than null.
		app.workspace.trigger("file-menu", menu, file, "link-context-menu", options.getLeaf?.() ?? undefined);
		menu.showAtMouseEvent(evt);
	});
}
