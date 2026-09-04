/**
 * Edits the four nutrition fields (calories, protein, fat, carbs) in one
 * form. Fields show/save the raw stored value -- never the multiplier- or
 * per-serving/total-scaled display value the banner shows.
 */
import { App, Setting, TFile } from "obsidian";
import { BaseModal, addFooterButtons } from "./modal-shell";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { NUTRITION_FIELDS } from "../recipe-view/nutrition-fields";
import { fmNutrient } from "../recipe-view/frontmatter-read-helpers";
import { saveNutritionEdits, NutritionEditValues } from "../recipe-view/nutrition-write";

export class NutritionEditModal extends BaseModal {
	private draft: NutritionEditValues = {};

	constructor(
		app: App,
		private readonly file: TFile,
		private readonly fm: Record<string, unknown>,
		private readonly settings: RecipeBoxSettings,
	) {
		super(app);
		for (const field of NUTRITION_FIELDS) {
			const configuredKey = settings[field.settingsKey] as string;
			const lookupKeys = [configuredKey, ...field.aliases.filter((a) => a !== configuredKey)];
			const raw = fmNutrient(fm, lookupKeys);
			this.draft[field.settingsKey] = raw === null ? "" : String(raw);
		}
	}

	getTitle(): string { return "Edit nutrition"; }
	getContentClasses(): string[] { return ["rb-nutrition-edit-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const basisLabel = this.settings.nutritionSource === "per-serving" ? "per serving" : "recipe total";
		bodyEl.createDiv({
			cls: "rb-modal-desc",
			text: `Values are stored as ${basisLabel}, unscaled by the current multiplier.`,
		});

		for (const field of NUTRITION_FIELDS) {
			new Setting(bodyEl)
				.setName(field.unit ? `${field.label} (${field.unit})` : field.label)
				.addText((t) => {
					t.inputEl.type = "number";
					t.inputEl.step = "any";
					t
						.setValue(this.draft[field.settingsKey])
						.setPlaceholder("—")
						.onChange((v) => { this.draft[field.settingsKey] = v; });
				});
		}
	}

	renderFooter(footerEl: HTMLElement): void {
		addFooterButtons(footerEl, {
			confirmLabel: "Save",
			onCancel: () => this.close(),
			onConfirm: () => {
				void saveNutritionEdits(this.app, this.file, this.settings, this.draft).then(() => this.close());
			},
		});
	}
}
