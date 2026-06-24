export function scrollToHeading(viewEl: HTMLElement, heading: string): void {
	const target = heading.trim().toLowerCase();
	const els = Array.from(viewEl.querySelectorAll("h1,h2,h3,h4,h5,h6"));
	for (const el of els) {
		if (el.textContent?.trim().toLowerCase() === target) {
			el.scrollIntoView({ behavior: "smooth" });
			return;
		}
	}
}
