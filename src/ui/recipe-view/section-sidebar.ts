/**
 * Splits trailing Markdown sections from the recipe body and renders them as
 * collapsible cards in the desktop sidebar, adjacent to the instructions column.
 */
import { App, Component, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { SectionCard, renderSectionCard } from "./section-card";
import { CookHistoryModal } from "../modals/cook-history-modal";

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

export function renderSectionSidebar(
	sidebarContainer: HTMLElement,
	cardsContainer: HTMLElement,
	sections: TrailingSection[],
	app: App,
	component: Component,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	cookedCount: number,
): void {
	const hasCookHistory = settings.cookHistoryEnabled;
	if (sections.length === 0 && !hasCookHistory) return;

	const sidebar = sidebarContainer.createDiv({ cls: "rb-section-sidebar" });

	const cards = new Map<string, SectionCard>();
	for (const section of sections) {
		const card = renderSectionCard(cardsContainer, app, component, recipeFile.path, section.heading, section.body);
		cards.set(section.heading.toLowerCase(), card);
	}

	for (const section of sections) {
		const btn = sidebar.createEl("button", { cls: "rb-sidebar-btn" });
		const iconSpan = btn.createSpan({ cls: "rb-sidebar-btn-icon rb-icon" });
		setIcon(iconSpan, "file-text");
		btn.createSpan({ cls: "rb-sidebar-btn-label", text: section.heading });
		btn.addEventListener("click", () => {
			const card = cards.get(section.heading.toLowerCase());
			if (!card) return;
			if (!card.isExpanded()) card.expand();
			card.scrollIntoView();
		});
	}

	if (hasCookHistory) {
		const btn = sidebar.createEl("button", { cls: "rb-sidebar-btn rb-sidebar-btn--history" });
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
}
