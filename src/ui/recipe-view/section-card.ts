import { App, Component, MarkdownRenderer, setIcon } from "obsidian";

export interface SectionCard {
	el: HTMLElement;
	expand(): void;
	isExpanded(): boolean;
	scrollIntoView(): void;
}

export function renderSectionCard(
	container: HTMLElement,
	app: App,
	component: Component,
	filePath: string,
	heading: string,
	bodyMarkdown: string,
): SectionCard {
	const card = container.createDiv({ cls: "rb-extra-card rb-extra-card--collapsed" });

	const header = card.createDiv({ cls: "rb-extra-card-header" });
	const arrow = header.createSpan({ cls: "rb-extra-card-arrow" });
	setIcon(arrow, "chevron-down");
	header.createSpan({ cls: "rb-extra-card-title", text: heading });

	const body = card.createDiv({ cls: "rb-extra-card-body" });
	void MarkdownRenderer.render(app, bodyMarkdown, body, filePath, component);

	function isExpanded(): boolean {
		return !card.classList.contains("rb-extra-card--collapsed");
	}

	function expand(): void {
		card.classList.remove("rb-extra-card--collapsed");
	}

	function collapse(): void {
		card.classList.add("rb-extra-card--collapsed");
	}

	header.addEventListener("click", () => {
		if (isExpanded()) collapse(); else expand();
	});

	return {
		el: card,
		expand,
		isExpanded,
		scrollIntoView() { card.scrollIntoView({ behavior: "smooth", block: "start" }); },
	};
}
