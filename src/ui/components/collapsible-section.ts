/** Shared collapsible settings section: a clickable heading with a chevron that shows/hides a body container, collapsed by default. */
export function createCollapsibleSection(
	container: HTMLElement,
	title: string,
	renderBody: (body: HTMLElement) => void
): void {
	const header = container.createEl("h3", { cls: "rb-settings-section-toggle", text: title });
	const body = container.createDiv({ cls: "rb-settings-collapsed" });
	header.addEventListener("click", () => {
		body.toggleClass("rb-settings-collapsed", !body.hasClass("rb-settings-collapsed"));
		header.toggleClass("rb-settings-open", !header.hasClass("rb-settings-open"));
	});
	renderBody(body);
}
