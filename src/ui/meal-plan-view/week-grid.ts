import { App, setIcon } from "obsidian";
import { MealPlanEntry } from "../../types";
import { MealPlanViewDeps } from "./meal-plan-view-deps";
import { renderRecipeCard } from "./recipe-card";
import { makeDropTarget, makeDraggable } from "./drag-reschedule";
import { RecipePickerModal } from "../modals/recipe-picker-modal";
import { showMealTypePopover, PopoverAnchor } from "./meal-type-popover";

const DAY_COLUMNS: Array<{ label: string; dayKey: string }> = [
	{ label: "Monday",    dayKey: "monday" },
	{ label: "Tuesday",   dayKey: "tuesday" },
	{ label: "Wednesday", dayKey: "wednesday" },
	{ label: "Thursday",  dayKey: "thursday" },
	{ label: "Friday",    dayKey: "friday" },
	{ label: "Saturday",  dayKey: "saturday" },
	{ label: "Sunday",    dayKey: "sunday" },
];

const KNOWN_DAY_KEYS = new Set(DAY_COLUMNS.map(c => c.dayKey));

function renderLeftoversCard(container: HTMLElement, entry: MealPlanEntry, deps: MealPlanViewDeps): void {
	const card = container.createDiv({ cls: "rb-mpv-card rb-mpv-card--leftovers" });
	makeDraggable(card, entry.id);
	const body = card.createDiv({ cls: "rb-mpv-card-body" });
	const nameRow = body.createDiv({ cls: "rb-mpv-card-name-row" });
	const iconEl = nameRow.createSpan({ cls: "rb-mpv-card-leftovers-icon" });
	setIcon(iconEl, "archive");
	nameRow.createSpan({ cls: "rb-mpv-card-name", text: entry.label ?? "Leftovers" });
	if (entry.meal) body.createDiv({ cls: "rb-mpv-card-meal", text: entry.meal });
	const removeBtn = card.createEl("button", { cls: "rb-mpv-card-remove", text: "×", attr: { title: "Remove" } });
	removeBtn.addEventListener("click", (e) => { e.stopPropagation(); void deps.removeFromMealPlan(entry.id); });
}

function renderColumn(
	container: HTMLElement,
	label: string,
	colEntries: MealPlanEntry[],
	dayKey: string | undefined,
	app: App,
	deps: MealPlanViewDeps,
): void {
	const colEl = container.createDiv({ cls: "rb-mpv-col" });

	const header = colEl.createDiv({ cls: "rb-mpv-col-header" });
	header.createSpan({ cls: "rb-mpv-col-day", text: label });
	header.createSpan({ cls: "rb-mpv-col-count", text: String(colEntries.length) });

	const addBtn = header.createEl("button", { cls: "rb-mpv-col-add", attr: { title: `Add recipe to ${label}`, "aria-label": `Add recipe to ${label}` } });
	addBtn.setText("+");
	addBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		const rect = addBtn.getBoundingClientRect();
		const anchor: PopoverAnchor = { kind: "point", x: rect.left, y: rect.bottom };
		new RecipePickerModal(app, deps.getSettings(), dayKey, (file, day) => {
			void deps.addToMealPlan(file.path, day).then((newId) => {
				if (newId) showMealTypePopover(anchor, newId, deps);
			});
		}).open();
	});

	const leftoversBtn = header.createEl("button", { cls: "rb-mpv-col-leftovers", attr: { title: `Mark leftovers for ${label}`, "aria-label": `Mark leftovers for ${label}` } });
	leftoversBtn.setText("↩");
	leftoversBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		const alreadyHasLeftovers = deps.getMealPlan().some(
			(en) => !en.recipePath && en.day?.toLowerCase() === dayKey?.toLowerCase()
		);
		if (!alreadyHasLeftovers) void deps.addLeftoversEntry(dayKey, "Leftovers");
	});

	const body = colEl.createDiv({ cls: "rb-mpv-col-body" });

	if (colEntries.length === 0) {
		body.createDiv({ cls: "rb-mpv-col-empty", text: "Drop a recipe here" });
	} else {
		for (const entry of colEntries) {
			if (entry.recipePath) {
				renderRecipeCard(body, entry, app, deps);
			} else {
				renderLeftoversCard(body, entry, deps);
			}
		}
	}

	makeDropTarget(colEl, dayKey, app, (payload, newDay, dropPoint) => {
		const anchor: PopoverAnchor = { kind: "point", x: dropPoint.x, y: dropPoint.y };
		if (payload.kind === "entry") {
			const existing = deps.getMealPlan().find(e => e.id === payload.id);
			void deps.rescheduleMealPlanEntry(payload.id, newDay).then(() => {
				if (existing && existing.recipePath && !existing.meal) showMealTypePopover(anchor, payload.id, deps);
			});
		} else {
			void deps.addToMealPlan(payload.path, newDay).then((newId) => {
				if (newId) showMealTypePopover(anchor, newId, deps);
			});
		}
	});
}

export function renderWeekGrid(
	container: HTMLElement,
	entries: MealPlanEntry[],
	app: App,
	deps: MealPlanViewDeps
): void {
	const grid = container.createDiv({ cls: "rb-mpv-grid" });

	// Queue — full-width strip at top
	const unscheduledEntries = entries.filter(e => !e.day || !KNOWN_DAY_KEYS.has(e.day.toLowerCase()));
	renderColumn(grid, "Queue", unscheduledEntries, undefined, app, deps);

	// Day columns — wrap naturally to available width
	const daysRow = grid.createDiv({ cls: "rb-mpv-days-row" });
	for (const col of DAY_COLUMNS) {
		const colEntries = entries.filter(e => e.day?.toLowerCase() === col.dayKey);
		renderColumn(daysRow, col.label, colEntries, col.label, app, deps);
	}
}
