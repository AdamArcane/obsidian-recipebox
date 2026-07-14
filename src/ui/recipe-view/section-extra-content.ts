/**
 * Splits trailing Markdown sections from the recipe body and renders them as
 * collapsible cards in the desktop sidebar, adjacent to the instructions column.
 */
import { App, Component, MarkdownView, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { CookHistoryModal } from "../modals/cook-history-modal";
import { SectionContentModal } from "../modals/section-content-modal";
import { ShareRecipeModal } from "../modals/share-recipe-modal";
import { ShareStatus } from "../../sharing/share-status";

export interface TrailingSection {
	heading: string;
	body: string;
}

const HEADING_LINE_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/;

export function splitTrailingSections(markdown: string, excludeHeading: string): TrailingSection[] {
	const lines = markdown.split("\n");
	const exclude = excludeHeading.trim().toLowerCase();
	const sections: TrailingSection[] = [];
	let current: { heading: string; lines: string[] } | null = null;

	for (const line of lines) {
		const m = line.match(HEADING_LINE_RE);
		if (m) {
			if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });
			current = { heading: m[2].trim(), lines: [] };
		} else if (current) {
			current.lines.push(line);
		}
	}
	if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });

	return sections.filter(s => s.heading.toLowerCase() !== exclude);
}

export function renderExtraSectionsButtons(
	buttonsContainer: HTMLElement,
	_sectionsContentContainer: HTMLElement,
	sections: TrailingSection[],
	app: App,
	component: Component,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	cookedCount: number,
	shareStatus: ShareStatus,
	saveSettings: () => Promise<void>,
	onEditSection?: (heading: string) => void,
): void {
	const hasCookHistory = settings.cookHistoryEnabled;
	const isShared = shareStatus.kind === "shared";
	if (sections.length === 0 && !hasCookHistory && !isShared) return;

	const sectionButtons = buttonsContainer.createDiv({ cls: "rb-section-sidebar" });

	if (hasCookHistory) {
		const btn = sectionButtons.createEl("button", { cls: "rb-sidebar-btn rb-sidebar-btn--history" });
		const iconSpan = btn.createSpan({ cls: "rb-sidebar-btn-icon rb-icon" });
		setIcon(iconSpan, "history");
		btn.createSpan({ cls: "rb-sidebar-btn-label", text: "Cook history" });
		if (cookedCount > 0) {
			btn.createSpan({ cls: "rb-sidebar-btn-badge", text: String(cookedCount) });
		}
		btn.addEventListener("click", () => {
			new CookHistoryModal(app, recipeFile, settings).open();
		});
	}

	// Primary "actually visible" share status surface (the header toolbar icon
	// swap in recipe-view.ts is the secondary, less-noticeable signal) -- same
	// row and visual treatment as the cook history pill above.
	if (isShared) {
		const btn = sectionButtons.createEl("button", { cls: "rb-sidebar-btn rb-sidebar-btn--shared" });
		const iconSpan = btn.createSpan({ cls: "rb-sidebar-btn-icon rb-icon" });
		setIcon(iconSpan, "link-2");
		const days = shareStatus.daysLeft;
		btn.createSpan({ cls: "rb-sidebar-btn-label", text: `Shared · expires in ${days} day${days === 1 ? "" : "s"}` });
		btn.addEventListener("click", () => {
			new ShareRecipeModal(app, recipeFile, settings, saveSettings).open();
		});
	}

	for (const section of sections) {
		const btn = sectionButtons.createEl("button", { cls: "rb-sidebar-btn" });
		const iconSpan = btn.createSpan({ cls: "rb-sidebar-btn-icon rb-icon" });
		setIcon(iconSpan, "file-text");
		btn.createSpan({ cls: "rb-sidebar-btn-label", text: section.heading });
		btn.addEventListener("click", () => {
			new SectionContentModal(app, section.heading, section.body, recipeFile.path, component, onEditSection).open();
		});
	}


}

const MARKDOWN_HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function findMatchingMarkdownView(app: App, recipeFile: TFile): MarkdownView | null {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (activeView?.file?.path === recipeFile.path) return activeView;

	for (const leaf of app.workspace.getLeavesOfType("markdown")) {
		if (!(leaf.view instanceof MarkdownView)) continue;
		if (leaf.view.file?.path === recipeFile.path) return leaf.view;
	}
	return null;
}

function findLeafForMarkdownView(app: App, targetView: MarkdownView): WorkspaceLeaf | null {
	for (const leaf of app.workspace.getLeavesOfType("markdown")) {
		if (leaf.view === targetView) return leaf;
	}
	return null;
}

async function jumpEditorToHeading(view: MarkdownView, heading: string): Promise<boolean> {
	const editor = view.editor;
	const target = heading.trim().toLowerCase();
	for (let line = 0; line < editor.lineCount(); line++) {
		const match = editor.getLine(line).trim().match(MARKDOWN_HEADING_RE);
		if (!match) continue;
		if (match[2].trim().toLowerCase() !== target) continue;
		const targetLine = Math.min(line + 1, Math.max(0, editor.lineCount() - 1));
		editor.setCursor({ line: targetLine, ch: 0 });
		editor.scrollIntoView({ from: { line: targetLine, ch: 0 }, to: { line: targetLine, ch: 0 } }, true);
		editor.focus();
		await delay(16);
		// Live Preview can ignore direct editor scroll calls during mode/layout transitions.
		// Fallback to the active CodeMirror line element once focus is established.
		const activeLine = view.containerEl.querySelector<HTMLElement>(".cm-activeLine, .cm-line.cm-active");
		activeLine?.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
		editor.scrollIntoView({ from: { line: targetLine, ch: 0 }, to: { line: targetLine, ch: 0 } }, true);
		return true;
	}
	return false;
}

export async function openRecipeInEditorAtSectionHeading(
	app: App,
	recipeFile: TFile,
	heading: string,
	editAsMarkdown: (path: string) => void,
): Promise<void> {
	editAsMarkdown(recipeFile.path);

	for (let attempt = 0; attempt < 60; attempt++) {
		const view = findMatchingMarkdownView(app, recipeFile);
		if (view) {
			const leaf = findLeafForMarkdownView(app, view);
			if (leaf) app.workspace.setActiveLeaf(leaf, { focus: true });
			if (await jumpEditorToHeading(view, heading)) return;
		}
		await delay(50);
	}
}
