import { App, Modal, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ContributionMap } from "../../types";
import {
	loadRecipeIngredients,
	buildContributions,
	renderIngredientChecklist,
	LoadedIngredient,
} from "./ingredient-loader";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_SUGGESTIONS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export class AddToMealPlanModal extends Modal {
	private day: string | undefined = undefined;
	private meal: string | undefined = undefined;
	private readonly selectedKeys = new Set<string>();
	private ingredients: LoadedIngredient[] = [];

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly settings: RecipeBoxSettings,
		private readonly onConfirm: (day?: string, meal?: string, contributions?: ContributionMap) => void,
		private readonly prefill?: { day?: string; meal?: string },
	) {
		super(app);
		this.day = prefill?.day;
		this.meal = prefill?.meal;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass("rb-modal", "rb-meal-plan-modal");

		// ── Meal plan section ─────────────────────────────────────────────────
		const planSection = contentEl.createDiv({ cls: "rb-modal-section" });

		planSection.createEl("p", { cls: "rb-modal-recipe-name", text: this.file.basename });

		const planHeader = planSection.createDiv({ cls: "rb-modal-section-header" });
		setIcon(planHeader.createSpan({ cls: "rb-modal-section-icon" }), "calendar");
		planHeader.createSpan({ cls: "rb-modal-section-heading", text: "Add to meal plan" });
		planSection.createEl("p", {
			cls: "rb-modal-section-desc",
			text: "The recipe will be scheduled on your meal plan.",
		});

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

		// ── Divider ───────────────────────────────────────────────────────────
		contentEl.createEl("hr", { cls: "rb-modal-divider" });

		// ── Grocery section ───────────────────────────────────────────────────
		const grocerySection = contentEl.createDiv({ cls: "rb-modal-section" });

		const groceryHeader = grocerySection.createDiv({ cls: "rb-modal-section-header" });
		setIcon(groceryHeader.createSpan({ cls: "rb-modal-section-icon rb-icon-green" }), "shopping-cart");
		groceryHeader.createSpan({ cls: "rb-modal-section-heading", text: "Grocery ingredients" });

		grocerySection.createEl("p", {
			cls: "rb-modal-section-desc",
			text: "Checked ingredients will be added to your grocery list.",
		});

		const counter = grocerySection.createEl("p", { cls: "rb-modal-selection-counter" });

		const checklistEl = grocerySection.createDiv({ cls: "rb-checklist-container" });

		this.ingredients = await loadRecipeIngredients(this.app, this.file, this.settings);
		this.ingredients.forEach(i => this.selectedKeys.add(i.key));

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

		// ── Footer ────────────────────────────────────────────────────────────
		const footer = contentEl.createDiv({ cls: "rb-modal-footer" });
		footer.createEl("button", { cls: "rb-modal-btn rb-modal-btn-cancel", text: "Cancel" })
			.addEventListener("click", () => this.close());

		const confirmBtn = footer.createEl("button", { cls: "rb-modal-btn rb-modal-btn-primary", text: this.prefill ? "Update" : "Add to plan" });
		confirmBtn.addEventListener("click", () => { void (async () => {
			confirmBtn.disabled = true;
			confirmBtn.textContent = "Adding…";
			const contributions = buildContributions(this.ingredients, this.selectedKeys);
			await Promise.resolve(this.onConfirm(this.day, this.meal, contributions));
			this.close();
		})(); });
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
