/**
 * Renders the dashboard's time-of-day greeting heading. Sits above the grid
 * with generous surrounding space so the view opens with some breathing room
 * instead of jumping straight into dense cards.
 */
function timeOfDayGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 5) return "Good evening";
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

export function renderGreeting(container: HTMLElement): void {
	const header = container.createDiv({ cls: "rb-dashboard-greeting" });
	header.createEl("h1", { cls: "rb-dashboard-greeting-text", text: timeOfDayGreeting() });
}
