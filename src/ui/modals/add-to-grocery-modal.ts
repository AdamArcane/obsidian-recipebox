import { App, Modal, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ContributionMap, GroceryItem } from "../../types";
import {
	loadRecipeIngredients,
	buildContributions,
	renderIngredientChecklist,
	LoadedIngredient,
} from "./ingredient-loader";

export class AddToGroceryModal extends Modal {
	private readonly initialChecked = new Set<string>();
	private readonly selectedKeys = new Set<string>();
	private ingredients: LoadedIngredient[] = [];

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly settings: RecipeBoxSettings,
		private readonly getGroceryItems: () => GroceryItem[],
		private readonly onConfirm: (toAdd: ContributionMap, toRemoveKeys: string[]) => Promise<void>,
	) {
		super(app);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass("rb-modal");
		contentEl.createEl("h2", { cls: "rb-modal-title", text: "Update grocery list" });
		contentEl.createEl("p", { cls: "rb-modal-subtitle", text: this.file.basename });

		const checklistEl = contentEl.createDiv({ cls: "rb-checklist-container" });

		this.ingredients = await loadRecipeIngredients(this.app, this.file, this.settings);
		const onListKeys = new Set(this.getGroceryItems().map(i => i.key));
		for (const ing of this.ingredients) {
			if (onListKeys.has(ing.key)) {
				this.initialChecked.add(ing.key);
				this.selectedKeys.add(ing.key);
			}
		}

		renderIngredientChecklist(checklistEl, this.ingredients, this.selectedKeys, (key, checked) => {
			if (checked) this.selectedKeys.add(key);
			else this.selectedKeys.delete(key);
		});

		const footer = contentEl.createDiv({ cls: "rb-modal-footer" });
		footer.createEl("button", { cls: "rb-modal-btn rb-modal-btn-cancel", text: "Cancel" })
			.addEventListener("click", () => this.close());

		const confirmBtn = footer.createEl("button", { cls: "rb-modal-btn rb-modal-btn-primary", text: "Save changes" });
		confirmBtn.addEventListener("click", () => { void (async () => {
			confirmBtn.disabled = true;
			const toAddKeys = new Set([...this.selectedKeys].filter(k => !this.initialChecked.has(k)));
			const toRemoveKeys = [...this.initialChecked].filter(k => !this.selectedKeys.has(k));
			const toAdd = buildContributions(this.ingredients, toAddKeys);
			await this.onConfirm(toAdd, toRemoveKeys);
			this.close();
		})(); });
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
