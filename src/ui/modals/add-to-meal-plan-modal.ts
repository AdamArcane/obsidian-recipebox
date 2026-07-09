/**
 * Modal for adding a recipe or custom meal to the meal plan, letting the user
 * choose a day, meal type, and optionally mark as leftovers. For recipe entries,
 * also lets the user select ingredients to contribute to the grocery list.
 */
import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ContributionMap } from "../../types";
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

export class AddToMealPlanModal extends BaseModal {
	private day: string | undefined = undefined;
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
	) {
		super(app);
		this.day = prefill?.day;
		this.meal = prefill?.meal;
		this.isLeftovers = prefill?.isLeftovers ?? false;
		this.customMealName = entry.kind === "custom" ? (prefill?.label ?? entry.label) : "";

		// Callers set prefill.isEdit explicitly: whether an entry already has a day/meal
		// can't tell "editing an existing entry" apart from "adding a new one with a
		// preset day" (e.g. the week-grid "+" button also prefills day).
		this.editMode = prefill?.isEdit ?? false;
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

		// Day + Meal row
		const fields = planSection.createDiv({ cls: "rb-modal-fields" });

		// Day dropdown
		const dayField = fields.createDiv({ cls: "rb-modal-field" });
		dayField.createEl("label", { cls: "rb-modal-field-label", text: "Day" });
		const daySelect = dayField.createEl("select", { cls: "rb-modal-select" });
		daySelect.createEl("option", { attr: { value: "" }, text: "Queue" });
		for (const d of WEEKDAYS) daySelect.createEl("option", { attr: { value: d }, text: d });
		if (this.prefill?.day) daySelect.value = this.prefill.day;
		daySelect.addEventListener("change", () => { this.day = daySelect.value || undefined; });

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

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());

		this.confirmBtn = footerEl.createEl("button", { cls: "mod-cta", text: this.editMode ? "Update" : "Add to plan" });
		this.confirmBtn.addEventListener("click", () => { void (async () => {
			this.confirmBtn.disabled = true;
			this.confirmBtn.textContent = this.editMode ? "Updating…" : "Adding…";
			await Promise.resolve(this.onConfirm(this.day, this.meal, this.contributions?.(), this.isLeftovers, this.customMealName || undefined));
			this.close();
		})(); });
	}
}
