/**
 * Renders an interactive 5-star rating widget that reads from and writes to
 * a configurable frontmatter property.
 */
import { App, TFile } from "obsidian";

const STAR_COUNT = 5;
const STAR_FILLED = "★";
const STAR_EMPTY = "☆";

export function readRating(fm: Record<string, unknown>, property: string): number {
	const raw = fm[property];
	const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseFloat(raw) : NaN;
	if (!isFinite(n)) return 0;
	return Math.min(STAR_COUNT, Math.max(0, Math.round(n)));
}

async function persistRating(app: App, file: TFile, property: string, value: number): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		const f = fm as Record<string, unknown>;
		if (value === 0) {
			delete f[property];
		} else {
			f[property] = value;
		}
	});
}

export interface StarRatingOptions {
	// When false, the widget is a read-only display: no click-to-rate, no
	// hover preview, and the stars are not focusable. Used by the gallery
	// card, where rating changes stay inside the open recipe view.
	interactive?: boolean;
	// Highlight-on-hover preview. Only meaningful when interactive.
	hoverPreview?: boolean;
}

export function renderStarRating(
	container: HTMLElement,
	app: App,
	file: TFile,
	fm: Record<string, unknown>,
	property: string,
	options: StarRatingOptions = {},
): void {
	const interactive = options.interactive ?? true;
	const hoverPreview = options.hoverPreview ?? false;

	let current = readRating(fm, property);
	const row = container.createDiv({ cls: "rb-star-rating" });
	row.toggleClass("rb-star-rating-readonly", !interactive);
	const stars: HTMLElement[] = [];

	function applyDisplay(highlight: number): void {
		stars.forEach((s, i) => {
			s.textContent = i < highlight ? STAR_FILLED : STAR_EMPTY;
			s.toggleClass("rb-star-active", i < highlight);
		});
	}

	for (let i = 1; i <= STAR_COUNT; i++) {
		const attr: Record<string, string> = interactive ? { role: "button", tabindex: "0" } : {};
		const star = row.createSpan({ cls: "rb-star", attr });
		stars.push(star);

		if (!interactive) continue;

		star.addEventListener("click", () => {
			const next = i === current ? 0 : i;
			current = next;
			applyDisplay(current);
			void persistRating(app, file, property, current);
		});

		if (hoverPreview) {
			star.addEventListener("mouseenter", () => applyDisplay(i));
			row.addEventListener("mouseleave", () => applyDisplay(current));
		}
	}

	applyDisplay(current);
}
