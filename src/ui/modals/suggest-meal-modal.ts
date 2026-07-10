/**
 * Modal for the meal suggester: mode picker and auto-run results with thumbnails.
 * Suggestions run automatically on open and whenever the mode changes.
 */
import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { MealPlanEntry } from "../../types";
import type { SuggesterMode } from "../../suggester/strategy-types";
import { DiscoveryResult } from "../../discovery/discovery-cache";
import { suggestRecipes, resolveActiveMode } from "../../suggester/suggest-recipes";
import { ModeEditorModal } from "./strategy-editor-modal";
import { ScheduleRecipesModal } from "./schedule-recipes-modal";
import { BaseModal } from "./modal-shell";
import { resolveImagePath } from "../recipe-view/image-resolve";
import { buildInfoTokens } from "../../suggester/result-info-line";
import { findValue } from "../../parser/frontmatter-lookup";
import { getRecipeMetaAliases } from "../../parser/recipe-meta-aliases";

export interface SuggestMealDeps {
	getSettings: () => RecipeBoxSettings;
	saveSettings: () => Promise<void>;
	getDiscovery: () => DiscoveryResult | null;
	openFile: (file: TFile) => void;
	getMealPlan: () => MealPlanEntry[];
	addMealPlanEntry: (recipePath: string, day?: string) => Promise<string>;
	setMealType: (id: string, mealType: string | undefined) => Promise<void>;
	clearMealPlan: (alsoRemoveFromGrocery: boolean) => Promise<number>;
	openMealPlan: () => void;
}

const MAX_RESULTS_OPTIONS = [5, 7, 10, 14];
const DEFAULT_MAX_RESULTS = 7;

export class SuggestMealModal extends BaseModal {
	private resultsEl!: HTMLElement;
	private activeModeId: string;
	private selectedFiles = new Set<string>();
	private scheduleBtn!: HTMLButtonElement;
	private lastResults: Array<{ file: TFile }> = [];
	private maxResults = DEFAULT_MAX_RESULTS;

	constructor(app: App, private readonly deps: SuggestMealDeps) {
		super(app);
		const active = resolveActiveMode(deps.getSettings());
		this.activeModeId = active?.id ?? "";
	}

	getTitle(): string { return "Meal Suggester"; }
	getIcon(): string { return "wand-sparkles"; }
	getContentClasses(): string[] { return ["rb-suggest-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		this.renderModeRow(bodyEl);
		bodyEl.createEl("hr", { cls: "rb-modal-divider" });
		this.resultsEl = bodyEl.createDiv({ cls: "rb-suggest-results" });
		// Auto-run after resultsEl is ready (renderFooter runs first, so we can't run there)
		this.runSuggestion();
	}

	private renderModeRow(bodyEl: HTMLElement): void {
		const settings = this.deps.getSettings();
		const row = bodyEl.createDiv({ cls: "rb-modal-field rb-suggest-strategy-row" });
		row.createEl("label", { cls: "rb-modal-field-label", text: "Mode" });

		const controls = row.createDiv({ cls: "rb-suggest-controls-row" });

		const sel = controls.createEl("select", { cls: "rb-modal-select" });
		for (const s of settings.suggesterModes) {
			sel.createEl("option", { attr: { value: s.id }, text: s.name });
		}
		sel.value = this.activeModeId || sel.options[0]?.value || "";
		this.activeModeId = sel.value;
		// Re-run suggestions whenever the mode changes
		sel.addEventListener("change", () => {
			this.activeModeId = sel.value;
			this.runSuggestion();
		});

		// Edit button
		const editBtn = controls.createEl("button", { cls: "rb-suggest-icon-btn" });
		setIcon(editBtn.createSpan(), "pencil");
		editBtn.setAttribute("aria-label", "Edit mode");
		editBtn.addEventListener("click", () => {
			const mode = this.currentMode();
			if (!mode) return;
			new ModeEditorModal(this.app, mode, {
				getDiscovery: this.deps.getDiscovery,
				getSettings: this.deps.getSettings,
				onSave: async (updated) => {
					this.saveMode(updated);
					await this.deps.saveSettings();
					sel.empty();
					for (const s of this.deps.getSettings().suggesterModes) {
						sel.createEl("option", { attr: { value: s.id }, text: s.name });
					}
					sel.value = updated.id;
				},
				onDelete: mode.isBuiltin ? undefined : async () => {
					const s = this.deps.getSettings();
					s.suggesterModes = s.suggesterModes.filter(m => m.id !== mode.id);
					await this.deps.saveSettings();
					// Switch to first remaining mode and re-run
					sel.empty();
					for (const m of s.suggesterModes) {
						sel.createEl("option", { attr: { value: m.id }, text: m.name });
					}
					this.activeModeId = sel.options[0]?.value ?? "";
					sel.value = this.activeModeId;
					this.runSuggestion();
				},
			}).open();
		});

		// Duplicate button
		const dupBtn = controls.createEl("button", { cls: "rb-suggest-icon-btn" });
		setIcon(dupBtn.createSpan(), "copy");
		dupBtn.setAttribute("aria-label", "Duplicate as new mode");
		dupBtn.addEventListener("click", () => {
			const mode = this.currentMode();
			if (!mode) return;
			const copy: SuggesterMode = {
				...mode,
				id: `mode-${Date.now()}`,
				name: `${mode.name} (copy)`,
				isBuiltin: false,
				isDefault: false,
				filters: mode.filters.map(f => ({ ...f })),
				rules: mode.rules.map(r => ({ ...r })),
			};
			const s = this.deps.getSettings();
			s.suggesterModes.push(copy);
			sel.createEl("option", { attr: { value: copy.id }, text: copy.name });
			sel.value = copy.id;
			this.activeModeId = copy.id;
			void this.deps.saveSettings();
		});
	}

	private currentMode(): SuggesterMode | undefined {
		return this.deps.getSettings().suggesterModes.find(s => s.id === this.activeModeId);
	}

	private saveMode(updated: SuggesterMode): void {
		const s = this.deps.getSettings();
		if (updated.isDefault) {
			for (const m of s.suggesterModes) m.isDefault = false;
		}
		const idx = s.suggesterModes.findIndex(m => m.id === updated.id);
		if (idx >= 0) s.suggesterModes[idx] = updated;
	}

	private runSuggestion(): void {
		const settings = this.deps.getSettings();
		const mode = this.currentMode();
		this.resultsEl.empty();
		this.selectedFiles.clear();
		this.lastResults = [];
		this.updateAddBtn();

		if (!mode) {
			this.resultsEl.createEl("p", { cls: "rb-suggest-hint", text: "No mode selected." });
			return;
		}

		settings.state.lastUsedModeId = mode.id;
		const results = suggestRecipes(this.app, settings, mode, this.deps.getDiscovery(), this.maxResults);

		if (results.length === 0) {
			this.resultsEl.createEl("p", { cls: "rb-suggest-hint", text: "No recipes matched the current filters." });
			return;
		}

		for (const r of results) {
			this.lastResults.push({ file: r.file });
			const item = this.resultsEl.createDiv({ cls: "rb-suggest-result-item" });

			const checkbox = item.createEl("input", { attr: { type: "checkbox", class: "rb-suggest-checkbox" } });
			checkbox.checked = this.selectedFiles.has(r.file.path);
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) this.selectedFiles.add(r.file.path);
				else this.selectedFiles.delete(r.file.path);
				this.updateAddBtn();
			});

			// Thumbnail from the image frontmatter field
			const cache = this.app.metadataCache.getFileCache(r.file);
			const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;
			const imageValue = findValue(fm, getRecipeMetaAliases(settings).image);
			if (typeof imageValue === "string" && imageValue) {
				const src = resolveImagePath(this.app, imageValue);
				if (src) {
					item.createEl("img", { cls: "rb-suggest-thumbnail", attr: { src } });
				}
			}

			const textCol = item.createDiv({ cls: "rb-suggest-text-col" });

			const link = textCol.createEl("a", { cls: "rb-suggest-result-link", text: r.file.basename });
			link.addEventListener("click", () => {
				this.deps.openFile(r.file);
				this.close();
			});

			// Secondary info line: scoring-field values + prep/cook times
			const tokens = buildInfoTokens(fm, mode, settings);
			if (tokens.length > 0) {
				const infoEl = textCol.createDiv({ cls: "rb-suggest-info-line" });
				infoEl.textContent = tokens.join(" · ");
			}
		}

		this.updateAddBtn();
	}

	private updateAddBtn(): void {
		if (!this.scheduleBtn) return;
		const selectedCount = this.selectedFiles.size;
		const totalCount = this.lastResults.length;

		if (totalCount === 0) {
			this.scheduleBtn.addClass("rb-hidden");
			this.scheduleBtn.textContent = "Schedule recipes";
			return;
		}

		this.scheduleBtn.removeClass("rb-hidden");
		this.scheduleBtn.textContent = selectedCount > 0
			? `Schedule selected (${selectedCount})`
			: `Schedule all (${totalCount})`;
	}

	private openScheduleModal(): void {
		const files = this.selectedFiles.size > 0
			? this.lastResults.map(r => r.file).filter(f => this.selectedFiles.has(f.path))
			: this.lastResults.map(r => r.file);
		if (!files.length) return;
		new ScheduleRecipesModal(this.app, files, this.deps).open();
		this.close();
	}

	renderFooter(footerEl: HTMLElement): void {
		const refreshBtn = footerEl.createEl("button", { cls: "rb-suggest-icon-btn" });
		setIcon(refreshBtn.createSpan(), "refresh-cw");
		refreshBtn.setAttribute("aria-label", "Refresh suggestions");
		refreshBtn.addEventListener("click", () => this.runSuggestion());

		const maxResultsSelect = footerEl.createEl("select", { cls: "rb-modal-select rb-suggest-max-results-select" });
		maxResultsSelect.setAttribute("aria-label", "Number of suggestions");
		for (const n of MAX_RESULTS_OPTIONS) {
			maxResultsSelect.createEl("option", { attr: { value: String(n) }, text: String(n) });
		}
		maxResultsSelect.value = String(this.maxResults);
		maxResultsSelect.addEventListener("change", () => {
			this.maxResults = parseInt(maxResultsSelect.value, 10);
			this.runSuggestion();
		});

		footerEl.createDiv({ cls: "rb-modal-footer-spacer" });

		const closeBtn = footerEl.createEl("button", { text: "Close" });
		closeBtn.addEventListener("click", () => this.close());

		this.scheduleBtn = footerEl.createEl("button", { cls: "rb-suggest-add-btn mod-cta", text: "Schedule recipes" });
		this.scheduleBtn.addEventListener("click", () => this.openScheduleModal());
		this.updateAddBtn();
	}
}
