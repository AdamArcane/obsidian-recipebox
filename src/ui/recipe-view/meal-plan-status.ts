/**
 * Renders the meal plan status notice in the recipe view — showing whether
 * a recipe is scheduled, on which day, and offering a context menu for edits.
 */
import { App, Modal, setIcon, TFile } from "obsidian";
import { MealPlanEntry } from "../../types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { openMealPlanEntryMenu } from "../modals/meal-plan-entry-menu";

export function resolveStatusText(entries: MealPlanEntry[]): string {
	if (entries.length === 0) return "";
	if (entries.length === 2) return "Scheduled twice this week";
	if (entries.length > 2) return `Scheduled ${entries.length} times this week`;

	const entry = entries[0];
	if (entry.day && entry.meal) return `${entry.meal} on ${entry.day}`;
	if (entry.day && !entry.meal) return `Scheduled for ${entry.day}`;
	if (!entry.day && entry.meal) return `${entry.meal}, in queue`;
	return "In queue";
}

class MealPlanMultiEntryModal extends Modal {
	constructor(
		app: App,
		private readonly file: TFile,
		private readonly entries: MealPlanEntry[],
		private readonly deps: RecipeViewDeps,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("Scheduled multiple times");
		const { contentEl } = this;
		const list = contentEl.createDiv({ cls: "rb-mp-entry-list" });
		for (const entry of this.entries) {
			const row = list.createDiv({ cls: "rb-mp-entry-row" });
			row.textContent = resolveStatusText([entry]);
			row.addEventListener("click", (e) => {
				this.close();
				openMealPlanEntryMenu(e, this.app, this.file, entry, this.deps);
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function renderMealPlanStatus(
	container: HTMLElement,
	app: App,
	file: TFile,
	entries: MealPlanEntry[],
	deps: RecipeViewDeps,
): void {
	if (entries.length === 0) return;

	const row = container.createDiv({ cls: "rb-mp-status-row" });

	const iconEl = row.createSpan({ cls: "rb-mp-status-icon" });
	setIcon(iconEl, "calendar");

	row.createSpan({ cls: "rb-mp-status-text", text: resolveStatusText(entries) });

	const chevronEl = row.createSpan({ cls: "rb-mp-status-chevron" });
	setIcon(chevronEl, "chevron-right");

	row.addEventListener("click", (e) => {
		if (entries.length === 1) {
			openMealPlanEntryMenu(e, app, file, entries[0], deps);
		} else {
			new MealPlanMultiEntryModal(app, file, entries, deps).open();
		}
	});
}
