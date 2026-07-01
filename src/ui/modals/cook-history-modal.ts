/**
 * Modal that displays a recipe's cook history as a scrollable list. This is a
 * thin shell: all list rendering is delegated to renderCookHistoryList. The
 * modal only owns the "Add entry" footer button and the self-referencing
 * refresh callback that re-renders the body after any mutation.
 */
import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { BaseModal } from "./modal-shell";
import { EntryEditorModal } from "./entry-editor-modal";
import { renderCookHistoryList } from "../../recipe-history/cook-history-render";
import { addCookHistoryEntry } from "../../recipe-history/cook-history";

export class CookHistoryModal extends BaseModal {
	private shellBody!: HTMLElement;

	constructor(
		app: App,
		private readonly recipeFile: TFile,
		private readonly settings: RecipeBoxSettings,
	) {
		super(app);
	}

	getTitle(): string { return "Cook history"; }
	getIcon(): string { return "history"; }
	getSubtitle(): string { return this.recipeFile.basename; }
	getContentClasses(): string[] { return ["rb-ch-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		this.shellBody = bodyEl;
		this.refresh();
	}

	renderFooter(footerEl: HTMLElement): void {
		const addBtn = footerEl.createEl("button", { cls: "mod-cta" });
		setIcon(addBtn.createSpan({ cls: "rb-ch-btn-icon" }), "plus");
		addBtn.createSpan({ text: "Add entry" });
		addBtn.addEventListener("click", () => {
			new EntryEditorModal(this.app, this.recipeFile, this.settings, null, async (date, note, image) => {
				await addCookHistoryEntry(this.app, this.recipeFile, this.settings, date, note, image ?? null);
				this.refresh();
			}).open();
		});

		const closeBtn = footerEl.createEl("button", { cls: "rb-shell-cancel-btn" });
		closeBtn.createSpan({ text: "Close" });
		closeBtn.addEventListener("click", () => this.close());
	}

	private refresh(): void {
		this.shellBody.empty();
		void renderCookHistoryList(this.shellBody, this.app, this.recipeFile, this.settings, () => this.refresh());
	}
}
