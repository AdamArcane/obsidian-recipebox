/**
 * Settings section for the meal suggester -- per-mode management (list, edit,
 * duplicate, delete, isDefault, reset all). How many suggestions to show is
 * chosen per-run from the suggester modal itself, not configured here.
 * The old global "Exclusion window" setting lives in each mode's filters now.
 */
import { App, setIcon, Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import type { SuggesterMode } from "../../suggester/strategy-types";
import { DiscoveryResult } from "../../discovery/discovery-cache";
import { ModeEditorModal } from "../modals/strategy-editor-modal";
import { ConfirmModal } from "../modals/confirm-modal";
import { BUILTIN_MODES } from "../../suggester/built-in-strategies";

export function renderSectionSuggester(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App,
	getDiscovery: () => DiscoveryResult | null,
): void {
	new Setting(container).setName("Meal suggester").setHeading();

	// Modes list lives inside a single Setting, matching the badge-list pattern
	const modesSetting = new Setting(container)
		.setName("Modes")
		.setDesc("Each mode is an independent set of filters and scoring rules. Built-in modes can be edited but not deleted.");
	modesSetting.settingEl.addClass("rb-modes-setting");

	const listEl = modesSetting.settingEl.createDiv({ cls: "rb-strategies-list" });
	renderModeList(listEl, settings, save, rerender, app, getDiscovery);

	const footer = modesSetting.settingEl.createDiv({ cls: "rb-modes-footer" });

	footer.createEl("button", { text: "+ new mode" }).addEventListener("click", () => {
		const newMode: SuggesterMode = {
			id: `mode-${Date.now()}`,
			name: "New mode",
			isBuiltin: false,
			isDefault: false,
			filters: [],
			rules: [],
		};
		new ModeEditorModal(app, newMode, {
			getDiscovery,
			getSettings: () => settings,
			onSave: async (saved) => {
				settings.suggesterModes.push(saved);
				await save();
				rerender();
			},
		}).open();
	});

	// Reset all modes — destructive: removes custom modes and resets built-ins.
	// Uses the confirm modal because this can permanently delete user-created content.
	footer.createEl("button", { text: "Reset to defaults" }).addEventListener("click", () => {
		new ConfirmModal(
			app,
			"Reset all modes?",
			"This restores every built-in mode to its shipped defaults and permanently deletes all custom modes you have created. This cannot be undone.",
			"Reset all modes",
			{
				destructive: true,
				onConfirm: () => {
					settings.suggesterModes = BUILTIN_MODES.map(m => ({
						...m,
						filters: m.filters.map(f => ({ ...f })),
						rules: m.rules.map(r => ({ ...r })),
					}));
					void save().then(rerender);
				},
			},
		).open();
	});
}

function renderModeList(
	listEl: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App,
	getDiscovery: () => DiscoveryResult | null,
): void {
	listEl.empty();
	for (const mode of settings.suggesterModes) {
		renderModeRow(listEl, mode, settings, save, rerender, app, getDiscovery);
	}
}

function renderModeRow(
	listEl: HTMLElement,
	mode: SuggesterMode,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App,
	getDiscovery: () => DiscoveryResult | null,
): void {
	const row = listEl.createDiv({ cls: "rb-strategy-row" });

	// isDefault radio button — setting one clears all others
	const radio = row.createEl("input", {
		attr: { type: "radio", name: "rb-mode-default", id: `rb-md-${mode.id}` },
	});
	radio.checked = mode.isDefault;
	radio.addEventListener("change", () => {
		if (radio.checked) {
			for (const m of settings.suggesterModes) m.isDefault = false;
			mode.isDefault = true;
			void save();
		}
	});

	row.createEl("label", {
		cls: "rb-strategy-name",
		attr: { for: `rb-md-${mode.id}` },
		text: mode.name,
	});

	if (mode.filters.length || mode.rules.length) {
		row.createEl("span", {
			cls: "rb-strategy-meta",
			text: `${mode.filters.length}F · ${mode.rules.length}R`,
		});
	}

	// Edit
	const editBtn = row.createEl("button", { cls: "rb-strategy-action-btn" });
	setIcon(editBtn.createSpan(), "pencil");
	editBtn.setAttribute("aria-label", "Edit");
	editBtn.addEventListener("click", () => {
		new ModeEditorModal(app, mode, {
			getDiscovery,
			getSettings: () => settings,
			onSave: async (updated) => {
				if (updated.isDefault) {
					for (const m of settings.suggesterModes) m.isDefault = false;
				}
				const idx = settings.suggesterModes.findIndex(m => m.id === updated.id);
				if (idx >= 0) settings.suggesterModes[idx] = updated;
				await save();
				rerender();
			},
			onDelete: mode.isBuiltin ? undefined : async () => {
				settings.suggesterModes = settings.suggesterModes.filter(m => m.id !== mode.id);
				await save();
				rerender();
			},
		}).open();
	});

	// Duplicate
	const dupBtn = row.createEl("button", { cls: "rb-strategy-action-btn" });
	setIcon(dupBtn.createSpan(), "copy");
	dupBtn.setAttribute("aria-label", "Duplicate");
	dupBtn.addEventListener("click", () => {
		const copy: SuggesterMode = {
			...mode,
			id: `mode-${Date.now()}`,
			name: `${mode.name} (copy)`,
			isBuiltin: false,
			isDefault: false,
			filters: mode.filters.map(f => ({ ...f })),
			rules: mode.rules.map(r => ({ ...r })),
		};
		settings.suggesterModes.push(copy);
		void save().then(rerender);
	});

	// Delete (hidden for built-ins — they can be reset but not deleted)
	if (!mode.isBuiltin) {
		const delBtn = row.createEl("button", { cls: "rb-strategy-action-btn rb-strategy-action-btn--delete" });
		setIcon(delBtn.createSpan(), "trash-2");
		delBtn.setAttribute("aria-label", "Delete");
		delBtn.addEventListener("click", () => {
			settings.suggesterModes = settings.suggesterModes.filter(m => m.id !== mode.id);
			void save().then(rerender);
		});
	}
}
