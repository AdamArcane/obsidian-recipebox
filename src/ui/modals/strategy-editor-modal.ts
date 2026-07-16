/**
 * Modal for creating or editing a suggester mode: name, isDefault toggle,
 * filter rows, and scoring rule rows. Scoring rules are drag-reorderable; order
 * determines weight (first = highest influence). No weight number, no threshold.
 * Built-in modes show a "Reset to default" button that restores shipped defaults.
 */
import { App, Platform, setIcon } from "obsidian";
import type { SuggesterMode, ScoringRule, ScoringDirection } from "../../suggester/strategy-types";
import { DiscoveryResult } from "../../discovery/discovery-cache";
import { FieldFilter, OPERATORS, FilterableType } from "../../discovery/filter-types";
import { BaseModal, addFooterButtons } from "./modal-shell";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { BUILTIN_MODES } from "../../suggester/built-in-strategies";
import { buildFieldPickerBtn, buildPickerFieldList } from "../components/field-picker";

export interface ModeEditorDeps {
	getDiscovery: () => DiscoveryResult | null;
	getSettings: () => RecipeBoxSettings;
	onSave: (mode: SuggesterMode) => Promise<void>;
	/** Called when the user deletes this mode. Only provided for non-built-in modes. */
	onDelete?: () => Promise<void>;
}


/**
 * Generates the "Prefer" option label for a direction + field + type combination.
 * Date fields get "more/less recent"; booleans get "has/doesn't have"; everything
 * else gets plain "more/less". Applied uniformly to any field — no per-field table.
 */
function directionPhrase(
	field: string,
	type: FilterableType | null,
	direction: "favor-high" | "favor-low" | "favor-none",
): string {
	const label = field || "field";
	if (direction === "favor-none") return `No ${label}`;
	if (type === "boolean") {
		return direction === "favor-high" ? `Has ${label}` : `Doesn't have ${label}`;
	}
	if (type === "date") {
		return direction === "favor-high" ? `More recent ${label}` : `Less recent ${label}`;
	}
	return direction === "favor-high" ? `More ${label}` : `Less ${label}`;
}

function cloneMode(s: SuggesterMode): SuggesterMode {
	return {
		...s,
		filters: s.filters.map(f => ({ ...f })),
		rules: s.rules.map(r => ({ ...r })),
	};
}

export class ModeEditorModal extends BaseModal {
	private draft: SuggesterMode;

	constructor(
		app: App,
		mode: SuggesterMode,
		private readonly deps: ModeEditorDeps,
	) {
		super(app);
		this.draft = cloneMode(mode);
	}

	getTitle(): string { return "Edit mode"; }
	getIcon(): string { return "sliders-horizontal"; }
	getContentClasses(): string[] { return ["rb-strategy-editor-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		this.renderNameRow(bodyEl);
		this.renderDefaultRow(bodyEl);
		bodyEl.createEl("hr", { cls: "rb-modal-divider" });
		this.renderFiltersSection(bodyEl);
		bodyEl.createEl("hr", { cls: "rb-modal-divider" });
		this.renderRulesSection(bodyEl);
	}

	private renderNameRow(bodyEl: HTMLElement): void {
		const row = bodyEl.createDiv({ cls: "rb-modal-field" });
		row.createEl("label", { cls: "rb-modal-field-label", text: "Name" });
		const input = row.createEl("input", {
			cls: "rb-modal-input",
			attr: { type: "text", value: this.draft.name },
		});
		input.addEventListener("input", () => { this.draft.name = input.value; });
	}

	private renderDefaultRow(bodyEl: HTMLElement): void {
		const row = bodyEl.createDiv({ cls: "rb-confirm-checkbox-row" });
		const checkbox = row.createEl("input", { attr: { type: "checkbox", id: "rb-strategy-default" } });
		checkbox.checked = this.draft.isDefault;
		checkbox.addEventListener("change", () => { this.draft.isDefault = checkbox.checked; });
		row.createEl("label", { attr: { for: "rb-strategy-default" }, text: "Use as default mode" });
	}

	// ── Filters ──────────────────────────────────────────────────────────────────

	private renderFiltersSection(bodyEl: HTMLElement): void {
		const section = bodyEl.createDiv({ cls: "rb-modal-section" });
		const header = section.createDiv({ cls: "rb-modal-section-header" });
		header.createSpan({ cls: "rb-modal-section-heading", text: "Filters" });
		header.createSpan({ cls: "rb-modal-section-hint", text: "Narrow the recipe pool before scoring" });

		const listEl = section.createDiv({ cls: "rb-rule-list" });
		for (const filter of this.draft.filters) {
			this.renderFilterRow(listEl, filter);
		}

		section.createEl("button", { cls: "rb-add-rule-btn", text: "+ add filter" })
			.addEventListener("click", () => {
				const f: FieldFilter = { field: "", operator: "eq", value: "" };
				this.draft.filters.push(f);
				this.renderFilterRow(listEl, f);
			});
	}

	private renderFilterRow(listEl: HTMLElement, filter: FieldFilter): void {
		const row = listEl.createDiv({ cls: "rb-rule-row" });
		const discovery = this.deps.getDiscovery();
		const settings = this.deps.getSettings();
		const fields = buildPickerFieldList(settings, discovery);

		buildFieldPickerBtn(row, filter.field, fields, (val) => {
			filter.field = val;
			rebuildOperators();
		});

		const opSel = row.createEl("select", { cls: "rb-select" });
		const valueWrap = row.createDiv({ cls: "rb-filter-value-wrap" });

		const inferType = (): FilterableType => {
			const match = fields.find(f => f.key === filter.field);
			if (match) return match.type;
			if (filter.field.startsWith("#")) return "tag";
			return "string";
		};

		const rebuildOperators = (): void => {
			opSel.empty();
			valueWrap.empty();
			let type = inferType();
			// Preserve a saved operator whose type doesn't match the inferred one —
			// e.g. "not-within-last" belongs to "date", not "string".
			if (filter.operator && !OPERATORS[type].some(op => op.id === filter.operator)) {
				const ownerType = (Object.keys(OPERATORS) as FilterableType[]).find(t =>
					OPERATORS[t].some(op => op.id === filter.operator)
				);
				if (ownerType) type = ownerType;
			}
			for (const op of OPERATORS[type] ?? []) {
				opSel.createEl("option", { attr: { value: op.id }, text: op.label });
			}
			opSel.value = filter.operator || OPERATORS[type][0]?.id || "";
			filter.operator = opSel.value;
			this.buildValueInput(valueWrap, filter, inferType);
		};

		opSel.addEventListener("change", () => {
			filter.operator = opSel.value;
			valueWrap.empty();
			this.buildValueInput(valueWrap, filter, inferType);
		});

		rebuildOperators();

		const delBtn = row.createEl("button", { cls: "rb-icon-btn rb-icon-btn--md rb-icon-btn--danger" });
		setIcon(delBtn.createSpan(), "x");
		delBtn.addEventListener("click", () => {
			this.draft.filters.splice(this.draft.filters.indexOf(filter), 1);
			row.remove();
		});
	}

	private buildValueInput(
		wrap: HTMLElement,
		filter: FieldFilter,
		inferType: () => FilterableType,
	): void {
		const op = filter.operator;
		if (["is-true", "is-false", "has", "not-has"].includes(op)) {
			filter.value = undefined;
			return;
		}

		if (op === "between") {
			const type = inferType();
			const inputType = type === "date" ? "date" : "number";
			const [lo, hi] = Array.isArray(filter.value) ? filter.value as [unknown, unknown] : [undefined, undefined];
			const loInput = wrap.createEl("input", { cls: "rb-modal-input rb-filter-between-input", attr: { type: inputType } });
			const hiInput = wrap.createEl("input", { cls: "rb-modal-input rb-filter-between-input", attr: { type: inputType } });
			wrap.createSpan({ cls: "rb-filter-between-sep", text: "To" });
			if (lo !== undefined && lo !== null) loInput.value = `${lo as string | number}`;
			if (hi !== undefined && hi !== null) hiInput.value = `${hi as string | number}`;
			const update = (): void => {
				const lv = type === "number" ? parseFloat(loInput.value) : loInput.value;
				const hv = type === "number" ? parseFloat(hiInput.value) : hiInput.value;
				filter.value = [lv, hv];
			};
			loInput.addEventListener("input", update);
			hiInput.addEventListener("input", update);
			return;
		}

		if (op === "within-last" || op === "not-within-last") {
			const input = wrap.createEl("input", { cls: "rb-modal-input rb-filter-days-input", attr: { type: "number", min: "1", placeholder: "0" } });
			if (typeof filter.value === "number") input.value = String(filter.value);
			input.addEventListener("input", () => { filter.value = parseInt(input.value, 10) || 0; });
			wrap.createSpan({ cls: "rb-filter-days-label", text: "Days" });
			return;
		}

		if (op === "one-of") {
			const input = wrap.createEl("input", {
				cls: "rb-modal-input",
				attr: { type: "text", placeholder: "Comma-separated values" },
			});
			if (Array.isArray(filter.value)) input.value = (filter.value as string[]).join(", ");
			input.addEventListener("input", () => {
				filter.value = input.value.split(",").map(s => s.trim()).filter(Boolean);
			});
			return;
		}

		const type = inferType();
		const inputType = type === "date" ? "date" : type === "number" ? "number" : "text";
		const input = wrap.createEl("input", { cls: "rb-modal-input", attr: { type: inputType } });
		if (typeof filter.value === "string" || typeof filter.value === "number") input.value = String(filter.value);
		input.addEventListener("input", () => {
			filter.value = type === "number" ? parseFloat(input.value) : input.value;
		});
	}

	// ── Scoring rules ─────────────────────────────────────────────────────────

	private renderRulesSection(bodyEl: HTMLElement): void {
		const section = bodyEl.createDiv({ cls: "rb-modal-section" });
		const header = section.createDiv({ cls: "rb-modal-section-header" });
		header.createSpan({ cls: "rb-modal-section-heading", text: "Scoring rules" });
		header.createSpan({
			cls: "rb-modal-section-hint",
			text: Platform.isMobile
				? "Use arrows to reorder — top rule matters most"
				: "Drag to reorder — top rule matters most",
		});

		const listEl = section.createDiv({ cls: "rb-rule-list" });
		const renderAll = (): void => {
			listEl.empty();
			for (const rule of this.draft.rules) {
				this.renderRuleRow(listEl, rule, renderAll);
			}
		};
		renderAll();

		section.createEl("button", { cls: "rb-add-rule-btn", text: "+ add rule" })
			.addEventListener("click", () => {
				const rule: ScoringRule = { field: "", direction: "favor-high" };
				this.draft.rules.push(rule);
				renderAll();
			});
	}

	/**
	 * Renders a single scoring rule row: drag handle, field picker, prefer select, delete.
	 * Drag-and-drop reorders `this.draft.rules` in place, then calls `renderAll`.
	 */
	private renderRuleRow(
		listEl: HTMLElement,
		rule: ScoringRule,
		renderAll: () => void,
	): void {
		const row = listEl.createDiv({ cls: "rb-rule-row rb-rule-row--draggable" });

		const discovery = this.deps.getDiscovery();
		const settings = this.deps.getSettings();
		const fields = buildPickerFieldList(settings, discovery);

		if (!Platform.isMobile) {
			row.setAttribute("draggable", "true");
			const handle = row.createDiv({ cls: "rb-rule-drag-handle" });
			setIcon(handle, "grip-vertical");
		}

		const inferType = (): FilterableType | null => {
			return fields.find(f => f.key === rule.field)?.type ?? null;
		};

		buildFieldPickerBtn(row, rule.field, fields, (val) => {
			rule.field = val;
			rebuildPreferOptions();
		});

		// "Prefer" select — two options, auto-phrased from field name + type
		const preferWrap = row.createDiv({ cls: "rb-rule-prefer-wrap" });
		preferWrap.createSpan({ cls: "rb-rule-label", text: "Prefer" });
		const preferSel = preferWrap.createEl("select", { cls: "rb-select" });

		const rebuildPreferOptions = (): void => {
			const type = inferType();
			const field = rule.field;
			preferSel.empty();
			for (const dir of ["favor-high", "favor-low", "favor-none"] as const) {
				preferSel.createEl("option", {
					attr: { value: dir },
					text: directionPhrase(field, type, dir),
				});
			}
			preferSel.value = rule.direction;
			if (preferSel.value !== rule.direction) {
				preferSel.value = "favor-high";
				rule.direction = "favor-high";
			}
		};

		rebuildPreferOptions();
		preferSel.addEventListener("change", () => {
			rule.direction = preferSel.value as ScoringDirection;
		});

		// Delete button
		const delBtn = row.createEl("button", { cls: "rb-rule-delete-btn" });
		setIcon(delBtn.createSpan(), "x");
		delBtn.addEventListener("click", () => {
			this.draft.rules.splice(this.draft.rules.indexOf(rule), 1);
			renderAll();
		});

		if (Platform.isMobile) {
			// ↑/↓ buttons replace drag on mobile — HTML5 drag-and-drop freezes the touch UI
			const ruleIndex = () => this.draft.rules.indexOf(rule);
			const up = row.createEl("button", { cls: "rb-icon-btn rb-icon-btn--md" });
			setIcon(up.createSpan(), "chevron-up");
			up.addEventListener("click", () => {
				const idx = ruleIndex();
				if (idx > 0) {
					[this.draft.rules[idx - 1], this.draft.rules[idx]] =
						[this.draft.rules[idx], this.draft.rules[idx - 1]];
					renderAll();
				}
			});
			const dn = row.createEl("button", { cls: "rb-icon-btn rb-icon-btn--md" });
			setIcon(dn.createSpan(), "chevron-down");
			dn.addEventListener("click", () => {
				const idx = ruleIndex();
				if (idx < this.draft.rules.length - 1) {
					[this.draft.rules[idx], this.draft.rules[idx + 1]] =
						[this.draft.rules[idx + 1], this.draft.rules[idx]];
					renderAll();
				}
			});
		} else {
			// Desktop: HTML5 drag-and-drop reorder
			row.addEventListener("dragstart", (e) => {
				e.dataTransfer?.setData("text/plain", String(this.draft.rules.indexOf(rule)));
				row.addClass("rb-dragging");
			});
			row.addEventListener("dragend", () => row.removeClass("rb-dragging"));
			row.addEventListener("dragover", (e) => {
				e.preventDefault();
				row.addClass("rb-drag-over");
			});
			row.addEventListener("dragleave", () => row.removeClass("rb-drag-over"));
			row.addEventListener("drop", (e) => {
				e.preventDefault();
				row.removeClass("rb-drag-over");
				const fromIdx = parseInt(e.dataTransfer?.getData("text/plain") ?? "-1", 10);
				const toIdx = this.draft.rules.indexOf(rule);
				if (fromIdx >= 0 && fromIdx !== toIdx) {
					const [moved] = this.draft.rules.splice(fromIdx, 1);
					this.draft.rules.splice(toIdx, 0, moved);
					renderAll();
				}
			});
		}
	}

	renderFooter(footerEl: HTMLElement): void {
		// Delete — only for custom (non-built-in) modes, and only when a callback is wired up.
		if (!this.draft.isBuiltin && this.deps.onDelete) {
			const deleteBtn = footerEl.createEl("button", { cls: "mod-warning rb-mode-delete-btn", text: "Delete mode" });
			let deletePending = false;
			let deleteTimer: number | null = null;
			deleteBtn.addEventListener("click", () => {
				if (!deletePending) {
					deletePending = true;
					deleteBtn.textContent = "Confirm delete?";
					deleteTimer = window.setTimeout(() => {
						deletePending = false;
						deleteBtn.textContent = "Delete mode";
					}, 3000);
				} else {
					if (deleteTimer) window.clearTimeout(deleteTimer);
					this.close();
					void this.deps.onDelete!();
				}
			});
		}

		// "Reset to default" is only meaningful for built-in modes that have shipped defaults.
		if (this.draft.isBuiltin) {
			const resetBtn = footerEl.createEl("button", { cls: "mod-warning rb-mode-reset-btn", text: "Reset to default" });
			let resetPending = false;
			let resetTimer: number | null = null;
			resetBtn.addEventListener("click", () => {
				if (!resetPending) {
					resetPending = true;
					resetBtn.textContent = "Confirm reset?";
					resetTimer = window.setTimeout(() => {
						resetPending = false;
						resetBtn.textContent = "Reset to default";
					}, 3000);
				} else {
					if (resetTimer) window.clearTimeout(resetTimer);
					const original = BUILTIN_MODES.find(b => b.id === this.draft.id);
					if (original) {
						this.draft.filters = original.filters.map(f => ({ ...f }));
						this.draft.rules = original.rules.map(r => ({ ...r }));
					}
					this.close();
					void this.deps.onSave(this.draft);
				}
			});
		}

		addFooterButtons(footerEl, {
			confirmLabel: "Save",
			onCancel: () => this.close(),
			onConfirm: () => {
				void this.deps.onSave(this.draft).then(() => this.close());
			},
		});
	}
}
