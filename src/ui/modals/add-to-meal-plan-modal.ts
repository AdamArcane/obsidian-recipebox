/**
 * Modal for adding a recipe or custom meal to the meal plan, letting the user
 * choose a day, meal type, and optionally mark as leftovers. For recipe entries,
 * also lets the user select ingredients to contribute to the grocery list.
 */
import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ContributionMap, GroceryContributionSource } from "../../types";
import {
	loadRecipeIngredients,
	buildContributions,
	renderIngredientChecklist,
	LoadedIngredient,
} from "./ingredient-loader";
import { BaseModal } from "./modal-shell";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MEAL_SUGGESTIONS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export type MealPlanEntryTarget =
	| { kind: "recipe"; file: TFile }
	| { kind: "custom"; label: string };

/**
 * Write ops needed to place one recipe on more than one day in a single confirm.
 * Deliberately separate from `onConfirm`: multi-day placement must create N
 * independent entries via addMealPlanEntry, not call addToMealPlan N times,
 * since addToMealPlan replaces any existing entry for the same recipe path
 * (see meal-plan-actions.ts) and would delete each prior day's entry as the
 * next one was added.
 */
export interface MultiDayMealPlanDeps {
	addMealPlanEntry: (recipePath: string, day: string | undefined, isLeftovers: boolean) => Promise<string>;
	setMealType: (id: string, mealType: string | undefined) => Promise<void>;
	addToGroceryOnly: (contributions: ContributionMap, source: GroceryContributionSource) => Promise<void>;
}

export class AddToMealPlanModal extends BaseModal {
	// Multiple days only apply to new recipe entries (see supportsMultiDay()); every
	// other path (custom meals, edit mode) only ever populates the first element.
	private days: string[] = [];
	private meal: string | undefined = undefined;
	private isLeftovers = false;
	private customMealName: string;
	private readonly selectedKeys = new Set<string>();
	private ingredients: LoadedIngredient[] = [];
	private editMode = false;

	// Set during renderBody so renderFooter's confirm handler can access them
	private contributions: (() => ContributionMap) | undefined;
	private confirmBtn!: HTMLButtonElement;

	constructor(
		app: App,
		private readonly entry: MealPlanEntryTarget,
		private readonly settings: RecipeBoxSettings,
		private readonly onConfirm: (day?: string, meal?: string, contributions?: ContributionMap, isLeftovers?: boolean, label?: string) => void,
		private readonly prefill?: { day?: string; meal?: string; label?: string; isLeftovers?: boolean; isEdit?: boolean },
		private readonly multiDayDeps?: MultiDayMealPlanDeps,
	) {
		super(app);
		this.days = prefill?.day ? [prefill.day] : [];
		this.meal = prefill?.meal;
		this.isLeftovers = prefill?.isLeftovers ?? false;
		this.customMealName = entry.kind === "custom" ? (prefill?.label ?? entry.label) : "";

		// Callers set prefill.isEdit explicitly: whether an entry already has a day/meal
		// can't tell "editing an existing entry" apart from "adding a new one with a
		// preset day" (e.g. the week-grid "+" button also prefills day).
		this.editMode = prefill?.isEdit ?? false;
	}

	// Multi-day checkbox placement is a recipe-entry-only feature: custom meals have
	// no signal for multi-day use, and editing an existing entry means editing that
	// one entry, not fanning it out into new ones (see spec's editMode note).
	private supportsMultiDay(): boolean {
		return this.entry.kind === "recipe" && !this.editMode;
	}

	getTitle(): string { return (this.editMode ? "Edit" : "Add to") + " meal plan"; }
	getSubtitle(): string {
		return this.entry.kind === "recipe" ? this.entry.file.basename : "Custom meal";
	}
	getIcon(): string { return "calendar"; }
	getContentClasses(): string[] { return ["rb-meal-plan-modal"]; }

	async renderBody(bodyEl: HTMLElement): Promise<void> {
		const planSection = bodyEl.createDiv({ cls: "rb-modal-section" });

		planSection.createEl("p", {
			cls: "rb-modal-section-desc",
			text: this.entry.kind === "recipe"
				? "The recipe will be scheduled on your meal plan."
				: "The meal will be added to your plan.",
		});

		// Meal name row (custom entries only) — full width, above day/meal
		if (this.entry.kind === "custom") {
			const nameRow = planSection.createDiv({ cls: "rb-modal-fields rb-modal-fields--full" });
			const nameField = nameRow.createDiv({ cls: "rb-modal-field rb-modal-field--grow" });
			nameField.createEl("label", { cls: "rb-modal-field-label", text: "Meal name" });
			const nameInput = nameField.createEl("input", {
				cls: "rb-modal-input",
				attr: { type: "text", placeholder: "E.g. Grilled cheese" },
			});
			nameInput.value = this.customMealName;
			nameInput.addEventListener("input", () => {
				this.customMealName = nameInput.value;
				this.shellTitleEl.textContent = nameInput.value || this.getTitle();
			});
			window.requestAnimationFrame(() => nameInput.focus());
		}

		if (this.supportsMultiDay()) {
			// Full-width checkbox group so a recipe can be placed on several days in
			// one confirm (e.g. a daily mocha on every morning) instead of repeating
			// the add flow once per day.
			const dayRow = planSection.createDiv({ cls: "rb-modal-fields rb-modal-fields--full" });
			const dayField = dayRow.createDiv({ cls: "rb-modal-field rb-modal-field--grow" });
			dayField.createEl("label", { cls: "rb-modal-field-label", text: "Day" });
			const dayGroup = dayField.createDiv({ cls: "rb-modal-radio-group rb-modal-radio-group--wrap" });

			// Queue and day placement are mutually exclusive: queue entries have no
			// day by definition, and no one has asked for "queue AND specific days"
			// in one action (queue-only already exists as its own mode elsewhere).
			const queueRow = dayGroup.createEl("label", { cls: "rb-modal-radio-row" });
			const queueCheck = queueRow.createEl("input", { attr: { type: "checkbox" } });
			queueRow.createSpan({ text: "Queue" });
			queueCheck.checked = this.days.length === 0;

			const dayChecks = new Map<string, HTMLInputElement>();
			queueCheck.addEventListener("change", () => {
				if (!queueCheck.checked) return;
				this.days = [];
				for (const c of dayChecks.values()) c.checked = false;
			});
			for (const d of WEEKDAYS) {
				const row = dayGroup.createEl("label", { cls: "rb-modal-radio-row" });
				const check = row.createEl("input", { attr: { type: "checkbox" } });
				check.checked = this.days.includes(d);
				row.createSpan({ text: d });
				dayChecks.set(d, check);
				check.addEventListener("change", () => {
					if (check.checked) {
						queueCheck.checked = false;
						this.days.push(d);
					} else {
						this.days = this.days.filter((x) => x !== d);
					}
					this.updateConfirmLabel();
				});
			}
		}

		// Day (single) + Meal row
		const fields = planSection.createDiv({ cls: "rb-modal-fields" });

		if (!this.supportsMultiDay()) {
			// Day dropdown
			const dayField = fields.createDiv({ cls: "rb-modal-field" });
			dayField.createEl("label", { cls: "rb-modal-field-label", text: "Day" });
			const daySelect = dayField.createEl("select", { cls: "rb-modal-select" });
			daySelect.createEl("option", { attr: { value: "" }, text: "Queue" });
			for (const d of WEEKDAYS) daySelect.createEl("option", { attr: { value: d }, text: d });
			if (this.prefill?.day) daySelect.value = this.prefill.day;
			daySelect.addEventListener("change", () => { this.days = daySelect.value ? [daySelect.value] : []; });
		}

		// Meal type input
		const mealField = fields.createDiv({ cls: "rb-modal-field" });
		mealField.createEl("label", { cls: "rb-modal-field-label", text: "Meal" });
		const datalistId = "rb-meal-datalist";
		const mealInput = mealField.createEl("input", {
			cls: "rb-modal-input",
			attr: { type: "text", list: datalistId, placeholder: "E.g. Dinner" },
		});
		const datalist = mealField.createEl("datalist", { attr: { id: datalistId } });
		for (const m of MEAL_SUGGESTIONS) datalist.createEl("option", { attr: { value: m } });
		if (this.prefill?.meal) mealInput.value = this.prefill.meal;
		mealInput.addEventListener("input", () => { this.meal = mealInput.value.trim() || undefined; });

		// Leftovers checkbox — own row beneath day/meal
		const leftoversRow = planSection.createDiv({ cls: "rb-modal-fields rb-modal-fields--full" });
		const leftoversField = leftoversRow.createDiv({ cls: "rb-modal-field rb-modal-field--checkbox" });
		const leftoversLabel = leftoversField.createEl("label", { cls: "rb-modal-field-label rb-modal-field-label--checkbox" });
		const leftoversCheck = leftoversLabel.createEl("input", { attr: { type: "checkbox" } });
		leftoversCheck.checked = this.isLeftovers;
		leftoversLabel.createSpan({ text: "Mark as leftovers" });
		leftoversCheck.addEventListener("change", () => { this.isLeftovers = leftoversCheck.checked; });

		// Same prefill-truthiness bug as editMode: any prefill (including a day-only
		// preset from the "+" button) used to skip the grocery section entirely.
		if (this.editMode) return; // edit mode: no grocery section

		// Grocery section (recipe entries only, collapsible, closed by default)
		if (this.entry.kind !== "recipe") return;

		bodyEl.createEl("hr", { cls: "rb-modal-divider" });
		const grocerySection = bodyEl.createDiv({ cls: "rb-modal-section" });

		let groceryExpanded = false;

		const groceryHeader = grocerySection.createDiv({ cls: "rb-modal-section-header rb-modal-section-header-toggle" });
		setIcon(groceryHeader.createSpan({ cls: "rb-modal-section-icon rb-icon-green" }), "shopping-cart");
		groceryHeader.createSpan({ cls: "rb-modal-section-heading", text: "Grocery ingredients" });
		groceryHeader.createSpan({ cls: "rb-modal-section-hint", text: "Expand to add ingredients to your grocery list" });
		const chevron = groceryHeader.createSpan({ cls: "rb-modal-section-chevron" });
		setIcon(chevron, "chevron-right");

		const groceryBody = grocerySection.createDiv({ cls: "rb-modal-section-body rb-modal-section-body-collapsed" });
		const counter = groceryBody.createEl("p", { cls: "rb-modal-selection-counter" });
		groceryBody.createEl("p", {
			cls: "rb-modal-section-desc",
			text: "Checked ingredients will be added to your grocery list.",
		});
		const checklistEl = groceryBody.createDiv({ cls: "rb-checklist-container" });

		const hintEl = groceryHeader.querySelector<HTMLElement>(".rb-modal-section-hint");
		groceryHeader.addEventListener("click", () => {
			groceryExpanded = !groceryExpanded;
			groceryBody.toggleClass("rb-modal-section-body-collapsed", !groceryExpanded);
			chevron.empty();
			setIcon(chevron, groceryExpanded ? "chevron-down" : "chevron-right");
			if (hintEl) hintEl.toggleClass("rb-hidden", groceryExpanded);
		});

		this.ingredients = await loadRecipeIngredients(this.app, this.entry.file, this.settings);

		const updateCounter = (): void => {
			const total = this.ingredients.length;
			const selected = this.selectedKeys.size;
			counter.textContent = `${selected} of ${total} selected`;
		};

		renderIngredientChecklist(checklistEl, this.ingredients, this.selectedKeys, (key, checked) => {
			if (checked) this.selectedKeys.add(key);
			else this.selectedKeys.delete(key);
			updateCounter();
		});
		updateCounter();

		this.contributions = () => buildContributions(this.ingredients, this.selectedKeys);
	}

	private confirmLabel(): string {
		if (this.editMode) return "Update";
		if (this.days.length > 1) return `Add to ${this.days.length} days`;
		return "Add to plan";
	}

	private updateConfirmLabel(): void {
		if (this.confirmBtn) this.confirmBtn.textContent = this.confirmLabel();
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());

		this.confirmBtn = footerEl.createEl("button", { cls: "mod-cta", text: this.confirmLabel() });
		this.confirmBtn.addEventListener("click", () => { void (async () => {
			this.confirmBtn.disabled = true;
			this.confirmBtn.textContent = this.editMode ? "Updating…" : "Adding…";
			if (this.days.length > 1 && this.entry.kind === "recipe" && this.multiDayDeps) {
				await this.confirmMultiDay(this.entry.file, this.multiDayDeps);
			} else {
				await Promise.resolve(this.onConfirm(this.days[0], this.meal, this.contributions?.(), this.isLeftovers, this.customMealName || undefined));
			}
			this.close();
		})(); });
	}

	// Places the recipe on every selected day as an independent entry (see
	// MultiDayMealPlanDeps doc comment for why this can't just loop onConfirm).
	private async confirmMultiDay(file: TFile, deps: MultiDayMealPlanDeps): Promise<void> {
		const contributions = this.contributions?.() ?? {};
		for (const day of this.days) {
			const id = await deps.addMealPlanEntry(file.path, day, this.isLeftovers);
			if (this.meal) await deps.setMealType(id, this.meal);
			// Contribute once per created entry, matching the existing per-entry
			// contribution model rather than inventing a shared-across-N-entries concept.
			if (Object.keys(contributions).length > 0) {
				await deps.addToGroceryOnly(contributions, { kind: "recipe", path: file.path, day, mealType: this.meal });
			}
		}
	}
}
