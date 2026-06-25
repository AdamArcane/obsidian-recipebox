/**
 * Modal for selectively adding or removing a recipe's ingredients from the
 * grocery list, showing a checklist of parsed ingredients with their current state.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ContributionMap, GroceryItem } from "../../types";
import {
	loadRecipeIngredients,
	buildContributions,
	renderIngredientChecklist,
	LoadedIngredient,
} from "./ingredient-loader";
import { BaseModal } from "./modal-shell";

export class AddToGroceryModal extends BaseModal {
	private readonly initialChecked = new Set<string>();
	private readonly selectedKeys = new Set<string>();
	private ingredients: LoadedIngredient[] = [];

	// Held so the async confirm handler can capture it after renderBody loads
	private confirmBtn!: HTMLButtonElement;

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly settings: RecipeBoxSettings,
		private readonly getGroceryItems: () => GroceryItem[],
		private readonly onConfirm: (toAdd: ContributionMap, toRemoveKeys: string[]) => Promise<void>,
	) {
		super(app);
	}

	getTitle(): string { return "Update grocery list"; }
	getSubtitle(): string { return this.file.basename; }

	async renderBody(bodyEl: HTMLElement): Promise<void> {
		const checklistEl = bodyEl.createDiv({ cls: "rb-checklist-container" });

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
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());

		this.confirmBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Save changes" });
		this.confirmBtn.addEventListener("click", () => { void (async () => {
			this.confirmBtn.disabled = true;
			const toAddKeys = new Set([...this.selectedKeys].filter(k => !this.initialChecked.has(k)));
			const toRemoveKeys = [...this.initialChecked].filter(k => !this.selectedKeys.has(k));
			const toAdd = buildContributions(this.ingredients, toAddKeys);
			await this.onConfirm(toAdd, toRemoveKeys);
			this.close();
		})(); });
	}
}
