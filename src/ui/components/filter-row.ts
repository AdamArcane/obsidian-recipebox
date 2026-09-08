/**
 * Shared single-FieldFilter row: field picker + operator select + value input +
 * delete button. Used by the meal suggester's mode editor and the gallery's
 * property filter panel so both surfaces present filters identically.
 *
 * The row mutates `filter` in place (same convention as the mode editor's
 * draft) so a caller that only reads the object back on an explicit "Save"
 * (the mode editor) can pass a no-op `onChange`. A caller that applies
 * filters live (the gallery) gets `onChange` on the field picker, operator
 * select, and "one of" checkboxes immediately, but only once free-typing
 * value inputs settle (blur or Enter) rather than on every keystroke -- see
 * `commitOnSettle`.
 */
import { setIcon } from "obsidian";
import { FieldFilter, OPERATORS, FilterableType } from "../../discovery/filter-types";
import { DiscoveryResult } from "../../discovery/discovery-cache";
import { buildFieldPickerBtn, PickerField } from "./field-picker";

/** Above this many distinct observed values, "one of" falls back to a comma-separated text box. */
const ONE_OF_CHECKBOX_LIMIT = 30;

function discoveredValuesFor(field: string, discovery: DiscoveryResult | null): string[] | null {
	if (!discovery) return null;
	return discovery.fields.find(f => f.key === field)?.values ?? null;
}

/**
 * Fires `onChange` once the user leaves the field (blur, or Enter) instead of
 * on every keystroke. A caller that applies filters live (the gallery)
 * rebuilds the whole row list -- including this input's own <datalist> --
 * whenever onChange fires; doing that on every "input" event destroys the
 * element mid-keystroke and the browser immediately dismisses the native
 * suggestion popup, so it flashes and closes instead of staying open while
 * typing. Committing on settle keeps the element (and its open datalist)
 * alive for the whole typing gesture.
 */
function commitOnSettle(input: HTMLInputElement, onChange: () => void): void {
	input.addEventListener("blur", onChange);
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") input.blur();
	});
}

/**
 * Attaches a native <datalist> of known values to a text input so typing
 * offers real suggestions (e.g. "type" values like "salad"/"soup") instead of
 * requiring an exact-spelling guess. Native datalist rather than a custom
 * dropdown -- it survives the input being re-created across re-renders
 * without any extra wiring, and needs no keyboard-nav code of its own.
 */
function attachDatalist(input: HTMLInputElement, values: string[] | null): void {
	if (!values || values.length === 0) return;
	const listId = `rb-filter-datalist-${Math.random().toString(36).slice(2, 9)}`;
	const datalist = input.createEl("datalist", { attr: { id: listId } });
	for (const value of values) {
		const opt = datalist.createEl("option");
		opt.value = value;
	}
	input.insertAdjacentElement("afterend", datalist);
	input.setAttribute("list", listId);
}

function buildValueInput(
	wrap: HTMLElement,
	filter: FieldFilter,
	inferType: () => FilterableType,
	discovery: DiscoveryResult | null,
	focusKey: string | undefined,
	onChange: () => void,
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
		if (focusKey) {
			loInput.setAttribute("data-rb-focus-key", `${focusKey}-value-lo`);
			hiInput.setAttribute("data-rb-focus-key", `${focusKey}-value-hi`);
		}
		const update = (): void => {
			const lv = type === "number" ? parseFloat(loInput.value) : loInput.value;
			const hv = type === "number" ? parseFloat(hiInput.value) : hiInput.value;
			filter.value = [lv, hv];
		};
		loInput.addEventListener("input", update);
		hiInput.addEventListener("input", update);
		commitOnSettle(loInput, onChange);
		commitOnSettle(hiInput, onChange);
		return;
	}

	if (op === "within-last" || op === "not-within-last") {
		const input = wrap.createEl("input", { cls: "rb-modal-input rb-filter-days-input", attr: { type: "number", min: "1", placeholder: "0" } });
		if (typeof filter.value === "number") input.value = String(filter.value);
		if (focusKey) input.setAttribute("data-rb-focus-key", `${focusKey}-value`);
		input.addEventListener("input", () => {
			filter.value = parseInt(input.value, 10) || 0;
		});
		commitOnSettle(input, onChange);
		wrap.createSpan({ cls: "rb-filter-days-label", text: "Days" });
		return;
	}

	if (op === "one-of") {
		// A known, bounded value set (e.g. season: spring/summer/fall/winter) gets
		// checkboxes -- the whole point of "one of" for the gallery's use case is
		// picking among a property's real values, not typing them from memory.
		const options = discoveredValuesFor(filter.field, discovery);
		if (options && options.length > 0 && options.length <= ONE_OF_CHECKBOX_LIMIT) {
			const selected = new Set(Array.isArray(filter.value) ? (filter.value as string[]) : []);
			const list = wrap.createDiv({ cls: "rb-filter-one-of-list" });
			for (const option of options) {
				const label = list.createEl("label", { cls: "rb-filter-one-of-option" });
				const checkbox = label.createEl("input", { attr: { type: "checkbox" } });
				checkbox.checked = selected.has(option);
				label.createSpan({ text: option });
				checkbox.addEventListener("change", () => {
					if (checkbox.checked) selected.add(option); else selected.delete(option);
					filter.value = [...selected];
					onChange();
				});
			}
			return;
		}

		const input = wrap.createEl("input", {
			cls: "rb-modal-input",
			attr: { type: "text", placeholder: "Comma-separated values" },
		});
		if (Array.isArray(filter.value)) input.value = (filter.value as string[]).join(", ");
		if (focusKey) input.setAttribute("data-rb-focus-key", `${focusKey}-value`);
		attachDatalist(input, options);
		input.addEventListener("input", () => {
			filter.value = input.value.split(",").map(s => s.trim()).filter(Boolean);
		});
		commitOnSettle(input, onChange);
		return;
	}

	const type = inferType();
	const inputType = type === "date" ? "date" : type === "number" ? "number" : "text";
	const input = wrap.createEl("input", { cls: "rb-modal-input", attr: { type: inputType } });
	if (typeof filter.value === "string" || typeof filter.value === "number") input.value = String(filter.value);
	if (focusKey) input.setAttribute("data-rb-focus-key", `${focusKey}-value`);
	if (inputType === "text") attachDatalist(input, discoveredValuesFor(filter.field, discovery));
	input.addEventListener("input", () => {
		filter.value = type === "number" ? parseFloat(input.value) : input.value;
	});
	commitOnSettle(input, onChange);
}

/**
 * Renders one filter row into `container` and returns the row element.
 *
 * @param discovery  Discovered fields/values, for the "one of" checkbox list,
 *                    the "eq"/"contains" datalist, and resolving a discovered
 *                    field's inferred type.
 * @param focusKey   Stable identifier for this row (e.g. an index-derived
 *                    string), tagged onto its value input(s) via
 *                    `data-rb-focus-key` so a caller that re-renders the whole
 *                    row list on every keystroke (the gallery, debounced) can
 *                    restore focus and cursor position afterwards. Omit when
 *                    the caller never rebuilds rows out from under the user
 *                    mid-edit (the mode editor, which only reads the draft on
 *                    an explicit Save).
 * @param onChange   Called after a field/operator/checkbox change, or once a
 *                    free-typing value input settles (blur or Enter).
 * @param onDelete   Called when the row's delete button is clicked. The caller
 *                    owns removing `filter` from its backing array/list.
 */
export function renderFieldFilterRow(
	container: HTMLElement,
	filter: FieldFilter,
	fields: PickerField[],
	discovery: DiscoveryResult | null,
	focusKey: string | undefined,
	onChange: () => void,
	onDelete: () => void,
): HTMLElement {
	const row = container.createDiv({ cls: "rb-rule-row" });

	const inferType = (): FilterableType => {
		const match = fields.find(f => f.key === filter.field);
		if (match) return match.type;
		if (filter.field.startsWith("#")) return "tag";
		return "string";
	};

	// DOM order matches reading order: field, then comparison, then value.
	buildFieldPickerBtn(row, filter.field, fields, (val) => {
		filter.field = val;
		rebuildOperators();
		onChange();
	});

	const opSel = row.createEl("select", { cls: "rb-select" });
	const valueWrap = row.createDiv({ cls: "rb-filter-value-wrap" });

	const rebuildOperators = (): void => {
		opSel.empty();
		valueWrap.empty();
		let type = inferType();
		// Preserve a saved operator whose type doesn't match the inferred one --
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
		buildValueInput(valueWrap, filter, inferType, discovery, focusKey, onChange);
	};

	opSel.addEventListener("change", () => {
		filter.operator = opSel.value;
		valueWrap.empty();
		buildValueInput(valueWrap, filter, inferType, discovery, focusKey, onChange);
		onChange();
	});

	rebuildOperators();

	const delBtn = row.createEl("button", { cls: "rb-icon-btn rb-icon-btn--md rb-icon-btn--danger" });
	setIcon(delBtn.createSpan(), "x");
	delBtn.addEventListener("click", () => onDelete());

	return row;
}
