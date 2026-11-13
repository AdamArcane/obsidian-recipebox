/**
 * Per-badge edit modal -- holds a draft copy of one badge and only
 * commits to settings on explicit Save. Cancel discards with no write.
 *
 * Modes:
 *  isNew=true  -> "Add badge" title, Use-formula toggle at top
 *  builtin     -> "Edit badge: {name}" title, label/icon/color only
 *  formula     -> "Edit badge: {name}" title, formula + label/icon/color
 *  regular     -> "Edit badge: {name}" title, property/prefix/suffix/split + label/icon/color
 */
import { t as translateUi } from "../../i18n";
import { App, Setting, setIcon } from "obsidian";
import { CustomBadge, BadgeColor } from "../../types";
import { BaseModal } from "./modal-shell";
import { DiscoveryResult } from "../../discovery/discovery-cache";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { buildFieldPickerBtn, buildPickerFieldList } from "../components/field-picker";
import { propertyToLabel } from "../../utils/property-label";

const COLOR_OPTIONS: Record<BadgeColor, string> = {
	default: translateUi("Default"),
	green: translateUi("Green"),
	blue: translateUi("Blue"),
	purple: translateUi("Purple"),
	yellow: translateUi("Yellow"),
	red: translateUi("Red"),
};

export class BadgeEditModal extends BaseModal {
	private draft: CustomBadge;
	private useFormula: boolean;
	/** Tracks whether the user has manually changed the label, suppressing auto-populate from property. */
	private labelManuallyEdited = false;

	constructor(
		app: App,
		private readonly source: CustomBadge,
		private readonly onSave: (updated: CustomBadge) => void,
		private readonly isNew: boolean = false,
		private readonly getDiscovery?: () => DiscoveryResult | null,
		private readonly getSettings?: () => RecipeBoxSettings,
	) {
		super(app);
		this.draft = { ...source };
		this.useFormula = !!source.formula;
	}

	getTitle(): string {
		return this.isNew ? translateUi("Add badge") : translateUi`Edit badge: ${this.draft.label || this.draft.property}`;
	}
	getContentClasses(): string[] { return ["rb-badge-edit-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		this.rebuildFields(bodyEl);
	}

	renderFooter(footerEl: HTMLElement): void {
		this.rebuildButtons(footerEl);
	}

	/**
	 * Re-renders both body and footer when the "Use formula" toggle changes.
	 * Clears and rebuilds rather than patching, to keep state consistent.
	 */
	private rerenderAll(): void {
		const bodyEl = this.contentEl.querySelector<HTMLElement>(".rb-shell-body");
		const footerEl = this.contentEl.querySelector<HTMLElement>(".rb-shell-footer");
		if (bodyEl) { bodyEl.empty(); this.rebuildFields(bodyEl); }
		if (footerEl) { footerEl.empty(); this.rebuildButtons(footerEl); }
	}

	private rebuildFields(body: HTMLElement): void {
		const isBuiltin = this.source.builtin && !this.isNew;

		if (isBuiltin) {
			if (this.draft.formula) {
				this.renderFormulaSection(body);
			} else {
				new Setting(body)
					.setName(translateUi("Property"))
					.setDesc(translateUi("Frontmatter key to read from the recipe note."))
					.addText((t) =>
						t
							.setValue(this.draft.property)
							.setPlaceholder(translateUi("E.g. Preptime"))
							.onChange((v) => { this.draft.property = v; }),
					);
			}
			this.renderLabelSection(body);
		} else {
			new Setting(body)
				.setName(translateUi("Use formula"))
				.setDesc(translateUi("Replace property lookup with a custom JavaScript expression."))
				.addToggle((t) =>
					t.setValue(this.useFormula).onChange((v) => {
						this.useFormula = v;
						if (!v) this.draft.formula = undefined;
						else if (!this.draft.formula) this.draft.formula = "";
						this.rerenderAll();
					}),
				);

			if (this.useFormula) {
				this.renderFormulaSection(body);
			} else {
				this.renderPropertySection(body);
			}
			this.renderLabelSection(body);
		}
	}

	private rebuildButtons(footer: HTMLElement): void {
		footer.createEl("button", { cls: "rb-shell-cancel-btn", text: translateUi("Cancel") })
			.addEventListener("click", () => this.close());
		footer.createEl("button", { cls: "mod-cta", text: translateUi("Save") })
			.addEventListener("click", () => {
				this.onSave({ ...this.draft });
				this.close();
			});
	}

	private renderFormulaSection(body: HTMLElement): void {
		new Setting(body)
			.setName(translateUi("Formula"))
			.setDesc(
				translateUi("Simple arithmetic expression using frontmatter properties as variables: + - * /, parentheses, and || as a fallback for missing values (ex: prepTime || 0).")
			)
			.addTextArea((t) =>
				t
					.setValue(this.draft.formula ?? "")
					.onChange((v) => {
						this.draft.formula = v.trim() || undefined;
					}),
			);
	}

	private renderPropertySection(body: HTMLElement): void {
		const discovery = this.getDiscovery?.() ?? null;
		const settings = this.getSettings?.();
		const fields = settings ? buildPickerFieldList(settings, discovery) : [];
		const selectedField = fields.find(f => f.key === this.draft.property);

		const propSetting = new Setting(body)
			.setName(translateUi("Property"))
			.setDesc(translateUi("Frontmatter key to read from the recipe note."));

		if (fields.length > 0) {
			propSetting.settingEl.createDiv({ cls: "rb-badge-prop-picker" }, (el) => {
				buildFieldPickerBtn(el, this.draft.property, fields, (val) => {
					this.draft.property = val;
					// Auto-populate label from property name unless the user already customized it.
					if (!this.labelManuallyEdited && val) {
						this.draft.label = propertyToLabel(val);
					}
					this.rerenderAll();
				});
			});
		} else {
			// No discovery available -- fall back to text input.
			propSetting.addText((t) =>
				t.setValue(this.draft.property).setPlaceholder(translateUi("E.g. Cuisine"))
					.onChange((v) => { this.draft.property = v; }),
			);
		}

		new Setting(body)
			.setName(translateUi("Prefix"))
			.setDesc(translateUi('Text prepended to the value, e.g. "$".'))
			.addText((t) =>
				t
					.setValue(this.draft.prefix ?? "")
					.setPlaceholder(translateUi("Ex. $"))
					.onChange((v) => {
						this.draft.prefix = v || undefined;
					}),
			);

		new Setting(body)
			.setName(translateUi("Suffix"))
			.setDesc(translateUi('Text appended to the value, e.g. " kcal" or " min".'))
			.addText((t) =>
				t
					.setValue(this.draft.suffix ?? "")
					.setPlaceholder(translateUi("Ex. Kcal"))
					.onChange((v) => {
						this.draft.suffix = v || undefined;
					}),
			);

		// Only show "Split array" when discovery confirms this field carries array values.
		// If discovery is unavailable, show it unconditionally rather than hiding a useful option.
		const showSplitArray = !selectedField || selectedField.hasArrayValues;
		if (showSplitArray) {
			new Setting(body)
				.setName(translateUi("Split array"))
				.setDesc(
					translateUi("When the property is a list, show one badge per item instead of a single comma-joined badge."),
				)
				.addToggle((t) =>
					t.setValue(this.draft.splitArray).onChange((v) => {
						this.draft.splitArray = v;
					}),
				);
		}
	}

	private renderLabelSection(body: HTMLElement): void {
		new Setting(body)
			.setName(translateUi("Show label"))
			.setDesc(translateUi("When off, only the value is shown with no label text."))
			.addToggle((t) =>
				t.setValue(!(this.draft.hideLabel ?? false)).onChange((v) => {
					this.draft.hideLabel = !v;
					this.rerenderAll();
				}),
			);

		if (!this.draft.hideLabel) {
			new Setting(body)
				.setName(translateUi("Label"))
				.setDesc(translateUi("Display label shown in the badge."))
				.addText((t) =>
					t
						.setValue(this.draft.label)
						.setPlaceholder("Ex. Cuisine")
						.onChange((v) => {
							this.draft.label = v;
							this.labelManuallyEdited = true;
						}),
				);
		}

		new Setting(body)
			.setName(translateUi("Icon"))
			.setDesc(translateUi("Lucide icon name shown inside the badge. Leave blank for no icon."))
			.addText((t) => {
				t.setValue(this.draft.icon ?? "")
					.setPlaceholder(translateUi("Ex. Tag, globe, bookmark"))
					.onChange((v) => {
						this.draft.icon = v.trim() || undefined;
					});

				const preview = t.inputEl.parentElement!.createEl("button", {
					cls: "rb-badge-icon-preview",
					attr: { type: "button" },
				});
				const previewIcon = preview.createSpan();
				if (this.draft.icon) setIcon(previewIcon, this.draft.icon);

				t.inputEl.addEventListener("input", () => {
					previewIcon.empty();
					if (t.inputEl.value.trim()) setIcon(previewIcon, t.inputEl.value.trim());
				});
			});

		new Setting(body)
			.setName(translateUi("Color"))
			.addDropdown((dd) =>
				dd
					.addOptions(COLOR_OPTIONS)
					.setValue(this.draft.color)
					.onChange((v) => {
						this.draft.color = v as BadgeColor;
					}),
			);
	}
}
