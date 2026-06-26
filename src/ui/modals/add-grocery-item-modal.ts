/**
 * Modal for adding a new grocery item or editing an existing one.
 * Three plain fields: Name (required), Quantity (optional free text), Category
 * (optional). On submit, the Quantity field is parsed with parseLeadingQuantity
 * to extract a numeric quantity and unit string; if no leading number is found
 * the whole value is stored verbatim as the unit with quantity: null.
 */
import { App, Notice } from "obsidian";
import { GroceryItemEntry } from "../../types";
import { parseLeadingQuantity } from "../../parser/quantity-parse";
import { BaseModal } from "./modal-shell";

type AddGroceryItemDeps = {
	addGroceryItem: (item: Omit<GroceryItemEntry, "id">) => Promise<void>;
	updateGroceryItem: (id: string, updates: Partial<Omit<GroceryItemEntry, "id">>) => Promise<void>;
	getKnownCategories: () => string[];
};

export class AddGroceryItemModal extends BaseModal {
	private readonly isEdit: boolean;
	private readonly existing: GroceryItemEntry | undefined;

	// Held as instance fields so renderFooter can reference inputs set up in renderBody
	private nameInput!: HTMLInputElement;
	private qtyInput!: HTMLInputElement;
	private catInput!: HTMLInputElement;

	constructor(
		app: App,
		private readonly deps: AddGroceryItemDeps,
		existingItem?: GroceryItemEntry
	) {
		super(app);
		this.existing = existingItem;
		this.isEdit = existingItem !== undefined;
	}

	getTitle(): string { return this.isEdit ? "Edit grocery item" : "Add grocery item"; }
	getContentClasses(): string[] { return ["rb-add-grocery-item-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const fields = bodyEl.createDiv({ cls: "rb-modal-fields" });

		const nameField = fields.createDiv({ cls: "rb-modal-field" });
		nameField.createEl("label", { cls: "rb-modal-field-label", text: "Name *" });
		this.nameInput = nameField.createEl("input", { cls: "rb-modal-input", attr: { type: "text", placeholder: "E.g. Black beans" } });
		this.nameInput.value = this.existing?.name ?? "";

		const qtyField = fields.createDiv({ cls: "rb-modal-field" });
		qtyField.createEl("label", { cls: "rb-modal-field-label", text: "Quantity" });
		qtyField.createEl("small", { cls: "rb-modal-field-hint", text: "E.g. 2, 2 cans, a box, 1 gallon" });
		this.qtyInput = qtyField.createEl("input", { cls: "rb-modal-input", attr: { type: "text", placeholder: "Optional" } });
		// Reconstruct display value from stored quantity + unit for edit mode
		if (this.existing) {
			const parts: string[] = [];
			if (this.existing.quantity !== null) parts.push(String(this.existing.quantity));
			if (this.existing.unit) parts.push(this.existing.unit);
			this.qtyInput.value = parts.join(" ");
		}

		const catField = fields.createDiv({ cls: "rb-modal-field" });
		catField.createEl("label", { cls: "rb-modal-field-label", text: "Category" });
		catField.createEl("small", { cls: "rb-modal-field-hint", text: "Leave blank to auto-detect" });
		this.catInput = catField.createEl("input", { cls: "rb-modal-input", attr: { type: "text", placeholder: "E.g. Produce" } });
		this.catInput.value = this.existing?.categoryOverride ?? "";

		// Enter-to-submit from name or quantity fields
		const onEnter = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void this.submit(); } };
		this.nameInput.addEventListener("keydown", onEnter);
		this.qtyInput.addEventListener("keydown", onEnter);
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		footerEl.createEl("button", { cls: "mod-cta", text: this.isEdit ? "Save" : "Add" })
			.addEventListener("click", () => { void this.submit(); });
	}

	private async submit(): Promise<void> {
		const name = this.nameInput.value.trim();
		if (!name) {
			new Notice("Name is required.");
			return;
		}

		const qtyText = this.qtyInput.value.trim();
		let quantity: number | null;
		let unit: string;
		if (qtyText) {
			const parsed = parseLeadingQuantity(qtyText);
			if (parsed.quantity !== null) {
				quantity = parsed.quantity;
				unit = parsed.rest.trim();
			} else {
				// No leading number — store verbatim as the unit field
				quantity = null;
				unit = qtyText;
			}
		} else {
			quantity = null;
			unit = "";
		}

		const categoryOverride = this.catInput.value.trim() || null;

		if (this.isEdit && this.existing) {
			await this.deps.updateGroceryItem(this.existing.id, { name, quantity, unit, categoryOverride });
		} else {
			await this.deps.addGroceryItem({ name, quantity, unit, categoryOverride });
		}

		this.close();
	}
}
