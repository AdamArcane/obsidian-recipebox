/**
 * Modal for adding a new one-off grocery item or editing an existing one,
 * with freeform ingredient parsing and optional category override.
 */
import { App, Notice } from "obsidian";
import { OneOffItem } from "../../types";
import { parseFreeformOneOff } from "../../grocery/one-off-actions";
import { BaseModal } from "./modal-shell";

type AddOneOffDeps = {
	addOneOff: (item: Omit<OneOffItem, "id">) => Promise<void>;
	updateOneOff: (id: string, updates: Partial<Omit<OneOffItem, "id">>) => Promise<void>;
	getKnownCategories: () => string[];
};

export class AddOneOffModal extends BaseModal {
	private readonly isEdit: boolean;
	private readonly existing: OneOffItem | undefined;

	// Held as instance fields so renderFooter can reference the inputs set up in renderBody
	private quickEntryInput: HTMLInputElement | null = null;
	private nameInput!: HTMLInputElement;
	private qtyInput!: HTMLInputElement;
	private unitInput!: HTMLInputElement;
	private catInput!: HTMLInputElement;

	constructor(
		app: App,
		private readonly deps: AddOneOffDeps,
		existingItem?: OneOffItem
	) {
		super(app);
		this.existing = existingItem;
		this.isEdit = existingItem !== undefined;
	}

	getTitle(): string { return this.isEdit ? "Edit grocery item" : "Add grocery item"; }

	renderBody(bodyEl: HTMLElement): void {
		if (!this.isEdit) {
			const section = bodyEl.createDiv({ cls: "rb-modal-section" });
			section.createDiv({ cls: "rb-modal-section-heading", text: "Quick entry" });
			section.createDiv({
				cls: "rb-modal-section-desc",
				text: 'Type a full ingredient line like "2 cans black beans" to auto-fill the fields below.',
			});
			this.quickEntryInput = section.createEl("input", {
				cls: "rb-modal-input",
				type: "text",
				placeholder: "e.g. 2 cans black beans",
			});
		}

		const fields = bodyEl.createDiv({ cls: "rb-modal-fields" });

		const nameField = fields.createDiv({ cls: "rb-modal-field" });
		nameField.createEl("label", { text: "Name *" });
		this.nameInput = nameField.createEl("input", { cls: "rb-modal-input", type: "text", placeholder: "e.g. black beans" });
		this.nameInput.value = this.existing?.name ?? "";

		const qtyField = fields.createDiv({ cls: "rb-modal-field" });
		qtyField.createEl("label", { text: "Quantity" });
		this.qtyInput = qtyField.createEl("input", { cls: "rb-modal-input", type: "text", placeholder: "e.g. 2" });
		this.qtyInput.value = this.existing?.quantity !== null && this.existing?.quantity !== undefined
			? String(this.existing.quantity)
			: "";

		const unitField = fields.createDiv({ cls: "rb-modal-field" });
		unitField.createEl("label", { text: "Unit" });
		this.unitInput = unitField.createEl("input", { cls: "rb-modal-input", type: "text", placeholder: "e.g. cans" });
		this.unitInput.value = this.existing?.unit ?? "";

		const catField = fields.createDiv({ cls: "rb-modal-field" });
		catField.createEl("label", { text: "Category" });
		catField.createEl("small", { cls: "rb-modal-field-hint", text: "Leave blank to auto-detect" });
		this.catInput = catField.createEl("input", { cls: "rb-modal-input", type: "text", placeholder: "e.g. Produce" });
		this.catInput.value = this.existing?.categoryOverride ?? "";
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
		footerEl.createEl("button", { cls: "mod-cta", text: this.isEdit ? "Save" : "Add" })
			.addEventListener("click", () => { void this.submit(); });
	}

	private async submit(): Promise<void> {
		const quickText = this.quickEntryInput?.value.trim() ?? "";
		const nameText = this.nameInput.value.trim();

		let name: string;
		let quantity: number | null;
		let unit: string;

		if (!this.isEdit && quickText && !nameText) {
			const parsed = parseFreeformOneOff(quickText);
			if (!parsed) {
				new Notice("Could not parse that entry. Please fill in the fields manually.");
				return;
			}
			name = parsed.name;
			quantity = parsed.quantity;
			unit = parsed.unit;
		} else {
			if (!nameText) {
				new Notice("Name is required.");
				return;
			}
			name = nameText;
			const rawQty = this.qtyInput.value.trim();
			const parsedQty = parseFloat(rawQty);
			quantity = rawQty && !isNaN(parsedQty) ? parsedQty : null;
			unit = this.unitInput.value.trim();
		}

		const rawCat = this.catInput.value.trim();
		const categoryOverride = rawCat || null;

		if (this.isEdit && this.existing) {
			await this.deps.updateOneOff(this.existing.id, { name, quantity, unit, categoryOverride });
		} else {
			await this.deps.addOneOff({ name, quantity, unit, categoryOverride });
		}

		this.close();
	}
}
