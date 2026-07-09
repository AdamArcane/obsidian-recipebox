/**
 * Modal for bulk-scheduling a batch of suggested recipes across the week in
 * one action, reached from the meal suggester's "Schedule" button. Lets the
 * user pick a meal type, choose how day conflicts are handled, and optionally
 * clear the existing meal plan first.
 *
 * Deviates from a bare (settings, save) constructor in favor of the existing
 * SuggestMealDeps object: every other call site in this codebase routes meal
 * plan writes through the manager (for the "change" event and note sync), so
 * this modal does the same rather than mutating settings directly.
 */
import { App, TFile } from "obsidian";
import { SuggestMealDeps } from "./suggest-meal-modal";
import { MEAL_SUGGESTIONS } from "./add-to-meal-plan-modal";
import { BaseModal, addFooterButtons } from "./modal-shell";
import { FillMode, scheduleRecipes } from "../../meal-plan/schedule-recipes";

export class ScheduleRecipesModal extends BaseModal {
	private clearFirst = false;
	private mealType: string | undefined = undefined;
	private fillMode: FillMode = "skip-occupied";
	private overflowToQueue = true;

	private fillModeRow!: HTMLElement;
	private overflowRow!: HTMLElement;
	private confirmBtn!: HTMLButtonElement;

	constructor(
		app: App,
		private readonly files: TFile[],
		private readonly deps: SuggestMealDeps,
	) {
		super(app);
	}

	getTitle(): string { return `Schedule ${this.files.length} recipe${this.files.length === 1 ? "" : "s"}`; }
	getIcon(): string { return "calendar"; }
	getContentClasses(): string[] { return ["rb-schedule-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const section = bodyEl.createDiv({ cls: "rb-modal-section" });

		const clearRow = section.createDiv({ cls: "rb-modal-fields rb-modal-fields--full" });
		const clearField = clearRow.createDiv({ cls: "rb-modal-field rb-modal-field--checkbox" });
		const clearLabel = clearField.createEl("label", { cls: "rb-modal-field-label rb-modal-field-label--checkbox" });
		const clearCheck = clearLabel.createEl("input", { attr: { type: "checkbox" } });
		clearLabel.createSpan({ text: "Clear meal plan first" });
		clearCheck.addEventListener("change", () => {
			this.clearFirst = clearCheck.checked;
			// An empty plan makes every day available, same as "skip occupied days" —
			// the fill-mode choice becomes moot, so hide it rather than let it lie.
			this.fillModeRow.toggleClass("rb-hidden", this.clearFirst);
		});

		const mealField = section.createDiv({ cls: "rb-modal-field" });
		mealField.createEl("label", { cls: "rb-modal-field-label", text: "Meal type" });
		const datalistId = "rb-schedule-meal-datalist";
		const mealInput = mealField.createEl("input", {
			cls: "rb-modal-input",
			attr: { type: "text", list: datalistId, placeholder: "E.g. Dinner" },
		});
		const datalist = mealField.createEl("datalist", { attr: { id: datalistId } });
		for (const m of this.mealTypeSuggestions()) datalist.createEl("option", { attr: { value: m } });
		mealInput.addEventListener("input", () => { this.mealType = mealInput.value.trim() || undefined; });

		bodyEl.createEl("hr", { cls: "rb-modal-divider" });

		this.fillModeRow = bodyEl.createDiv({ cls: "rb-modal-field" });
		this.fillModeRow.createEl("label", { cls: "rb-modal-field-label", text: "Day fill mode" });
		const radioGroup = this.fillModeRow.createDiv({ cls: "rb-modal-radio-group" });
		this.renderFillModeOption(radioGroup, "skip-occupied", "Skip occupied days");
		this.renderFillModeOption(radioGroup, "one-per-meal-type", "One per meal type");
		this.renderFillModeOption(radioGroup, "stack-freely", "Stack freely");
		this.renderFillModeOption(radioGroup, "queue-only", "Add all to queue");

		this.overflowRow = bodyEl.createDiv({ cls: "rb-modal-fields rb-modal-fields--full" });
		const overflowField = this.overflowRow.createDiv({ cls: "rb-modal-field rb-modal-field--checkbox" });
		const overflowLabel = overflowField.createEl("label", { cls: "rb-modal-field-label rb-modal-field-label--checkbox" });
		const overflowCheck = overflowLabel.createEl("input", { attr: { type: "checkbox" } });
		overflowCheck.checked = this.overflowToQueue;
		overflowLabel.createSpan({ text: "Add overflow to queue" });
		overflowCheck.addEventListener("change", () => { this.overflowToQueue = overflowCheck.checked; });
	}

	private renderFillModeOption(group: HTMLElement, value: FillMode, label: string): void {
		const row = group.createEl("label", { cls: "rb-modal-radio-row" });
		const radio = row.createEl("input", { attr: { type: "radio", name: "rb-schedule-fill-mode", value } });
		radio.checked = this.fillMode === value;
		row.createSpan({ text: label });
		radio.addEventListener("change", () => {
			if (!radio.checked) return;
			this.fillMode = value;
			// Neither mode ever overflows: stacking always lands a recipe somewhere,
			// and queue-only sends every recipe straight to the queue already — so
			// the overflow checkbox has nothing to do in either case.
			this.overflowRow.toggleClass("rb-hidden", value === "stack-freely" || value === "queue-only");
		});
	}

	private mealTypeSuggestions(): string[] {
		const used = new Set<string>(MEAL_SUGGESTIONS);
		for (const entry of this.deps.getMealPlan()) {
			if (entry.meal) used.add(entry.meal);
		}
		return [...used];
	}

	renderFooter(footerEl: HTMLElement): void {
		this.confirmBtn = addFooterButtons(footerEl, {
			confirmLabel: `Schedule ${this.files.length} recipe${this.files.length === 1 ? "" : "s"}`,
			onCancel: () => this.close(),
			onConfirm: () => { void this.confirm(); },
		});
	}

	private async confirm(): Promise<void> {
		this.confirmBtn.disabled = true;
		this.confirmBtn.textContent = "Scheduling…";

		if (this.clearFirst) {
			await this.deps.clearMealPlan(false);
		}

		// Snapshot after any clear, but taken once — see schedule-recipes.ts for
		// why availability isn't re-read after each placement.
		const initialPlan = this.deps.getMealPlan();

		await scheduleRecipes(
			this.files.map((f) => f.path),
			initialPlan,
			{
				addMealPlanEntry: (path, day) => this.deps.addMealPlanEntry(path, day),
				setMealType: (id, mealType) => this.deps.setMealType(id, mealType),
			},
			{
				mealType: this.mealType,
				fillMode: this.clearFirst ? "skip-occupied" : this.fillMode,
				overflowToQueue: this.overflowToQueue,
			},
		);

		this.deps.openMealPlan();
		this.close();
	}
}
