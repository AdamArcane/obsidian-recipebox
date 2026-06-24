import { MealPlanViewDeps } from "./meal-plan-view-deps";

const MEAL_CHIPS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export type PopoverAnchor =
	| { kind: "point"; x: number; y: number }
	| { kind: "element"; el: HTMLElement };

/**
 * Shows a small floating popover near the drop point / button for choosing a
 * meal type. Quick-pick chips on top, free-text input below. Close button in
 * the corner dismisses without setting a value. Only called when the entry has
 * no meal type yet.
 */
export function showMealTypePopover(
	anchor: PopoverAnchor,
	entryId: string,
	deps: MealPlanViewDeps,
): void {
	const popover = activeDocument.body.createDiv({ cls: "rb-meal-type-popover" });

	const closeBtn = popover.createEl("button", { cls: "rb-meal-type-close", attr: { title: "Dismiss", "aria-label": "Dismiss" }, text: "×" });

	const header = popover.createDiv({ cls: "rb-meal-type-popover-header" });
	header.createDiv({ cls: "rb-meal-type-popover-label", text: "Meal type?" });

	const chips = popover.createDiv({ cls: "rb-meal-type-chips" });
	for (const option of MEAL_CHIPS) {
		const btn = chips.createEl("button", { cls: "rb-meal-type-chip", text: option });
		btn.addEventListener("click", () => commit(option));
	}

	const row = popover.createDiv({ cls: "rb-meal-type-popover-row" });
	const input = row.createEl("input", {
		cls: "rb-meal-type-input",
		attr: { type: "text", placeholder: "Custom…" },
	});
	const confirmBtn = row.createEl("button", { cls: "rb-meal-type-confirm", text: "✓" });

	function dismiss(): void {
		popover.remove();
		activeDocument.removeEventListener("pointerdown", outsideHandler, true);
	}

	function commit(value: string | undefined): void {
		dismiss();
		void deps.setMealType(entryId, value);
	}

	closeBtn.addEventListener("click", dismiss);
	confirmBtn.addEventListener("click", () => commit(input.value.trim() || undefined));
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") { e.preventDefault(); commit(input.value.trim() || undefined); }
		if (e.key === "Escape") { e.preventDefault(); dismiss(); }
	});

	positionPopover(popover, anchor);
	window.requestAnimationFrame(() => input.focus());

	function outsideHandler(e: PointerEvent): void {
		if (!popover.contains(e.target as Node)) dismiss();
	}
	window.setTimeout(() => activeDocument.addEventListener("pointerdown", outsideHandler, true), 0);
}

function positionPopover(popover: HTMLElement, anchor: PopoverAnchor): void {
	popover.setCssProps({ position: "fixed", visibility: "hidden", top: "0", left: "0" });

	window.requestAnimationFrame(() => {
		const pw = popover.offsetWidth;
		const ph = popover.offsetHeight;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		let x: number;
		let y: number;

		if (anchor.kind === "point") {
			x = anchor.x;
			y = anchor.y + 8;
		} else {
			const rect = anchor.el.getBoundingClientRect();
			x = rect.left;
			y = rect.bottom + 6;
		}

		if (x + pw > vw - 8) x = Math.max(8, vw - pw - 8);
		if (y + ph > vh - 8) {
			if (anchor.kind === "point") {
				y = anchor.y - ph - 8;
			} else {
				const rect = anchor.el.getBoundingClientRect();
				y = rect.top - ph - 6;
			}
		}

		popover.setCssProps({ left: `${Math.max(8, x)}px`, top: `${Math.max(8, y)}px`, visibility: "" });
	});
}
