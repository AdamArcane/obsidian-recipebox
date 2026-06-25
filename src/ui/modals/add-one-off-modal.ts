/**
 * Modal for adding a new one-off grocery item or editing an existing one,
 * with freeform ingredient parsing and optional category override.
 */
import { App, Modal, Notice } from "obsidian";
import { OneOffItem } from "../../types";
import { parseFreeformOneOff } from "../../grocery/one-off-actions";

type AddOneOffDeps = {
	addOneOff: (item: Omit<OneOffItem, "id">) => Promise<void>;
	updateOneOff: (id: string, updates: Partial<Omit<OneOffItem, "id">>) => Promise<void>;
	getKnownCategories: () => string[];
};

export class AddOneOffModal extends Modal {
	private readonly isEdit: boolean;
	private readonly existing: OneOffItem | undefined;

	constructor(
		app: App,
		private readonly deps: AddOneOffDeps,
		existingItem?: OneOffItem
	) {
		super(app);
		this.existing = existingItem;
		this.isEdit = existingItem !== undefined;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("rb-modal");

		contentEl.createEl("h2", {
			cls: "rb-modal-title",
			text: this.isEdit ? "Edit grocery item" : "Add grocery item",
		});

		let quickEntryInput: HTMLInputElement | null = null;

		if (!this.isEdit) {
			const section = contentEl.createDiv({ cls: "rb-modal-section" });
			section.createDiv({ cls: "rb-modal-section-heading", text: "Quick entry" });
			section.createDiv({
				cls: "rb-modal-section-desc",
				text: 'Type a full ingredient line like "2 cans black beans" to auto-fill the fields below.',
			});
			quickEntryInput = section.createEl("input", {
				cls: "rb-modal-input",
				type: "text",
				placeholder: "e.g. 2 cans black beans",
			});
		}

		const fields = contentEl.createDiv({ cls: "rb-modal-fields" });

		const nameField = fields.createDiv({ cls: "rb-modal-field" });
		nameField.createEl("label", { text: "Name *" });
		const nameInput = nameField.createEl("input", {
			cls: "rb-modal-input",
			type: "text",
			placeholder: "e.g. black beans",
		});
		nameInput.value = this.existing?.name ?? "";

		const qtyField = fields.createDiv({ cls: "rb-modal-field" });
		qtyField.createEl("label", { text: "Quantity" });
		const qtyInput = qtyField.createEl("input", {
			cls: "rb-modal-input",
			type: "text",
			placeholder: "e.g. 2",
		});
		qtyInput.value = this.existing?.quantity !== null && this.existing?.quantity !== undefined
			? String(this.existing.quantity)
			: "";

		const unitField = fields.createDiv({ cls: "rb-modal-field" });
		unitField.createEl("label", { text: "Unit" });
		const unitInput = unitField.createEl("input", {
			cls: "rb-modal-input",
			type: "text",
			placeholder: "e.g. cans",
		});
		unitInput.value = this.existing?.unit ?? "";

		const catField = fields.createDiv({ cls: "rb-modal-field" });
		catField.createEl("label", { text: "Category" });
		catField.createEl("small", {
			cls: "rb-modal-field-hint",
			text: "Leave blank to auto-detect",
		});
		const catInput = catField.createEl("input", {
			cls: "rb-modal-input",
			type: "text",
			placeholder: "e.g. Produce",
		});
		catInput.value = this.existing?.categoryOverride ?? "";

		const footer = contentEl.createDiv({ cls: "rb-modal-footer" });
		footer.createEl("button", { cls: "rb-modal-btn rb-modal-btn-cancel", text: "Cancel" })
			.addEventListener("click", () => this.close());

		footer.createEl("button", {
			cls: "rb-modal-btn rb-modal-btn-primary",
			text: this.isEdit ? "Save" : "Add",
		}).addEventListener("click", () => { void this.submit(quickEntryInput, nameInput, qtyInput, unitInput, catInput); });
	}

	private async submit(
		quickEntryInput: HTMLInputElement | null,
		nameInput: HTMLInputElement,
		qtyInput: HTMLInputElement,
		unitInput: HTMLInputElement,
		catInput: HTMLInputElement
	): Promise<void> {
		const quickText = quickEntryInput?.value.trim() ?? "";
		const nameText = nameInput.value.trim();

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
			const rawQty = qtyInput.value.trim();
			const parsedQty = parseFloat(rawQty);
			quantity = rawQty && !isNaN(parsedQty) ? parsedQty : null;
			unit = unitInput.value.trim();
		}

		const rawCat = catInput.value.trim();
		const categoryOverride = rawCat || null;

		if (this.isEdit && this.existing) {
			await this.deps.updateOneOff(this.existing.id, { name, quantity, unit, categoryOverride });
		} else {
			await this.deps.addOneOff({ name, quantity, unit, categoryOverride });
		}

		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
