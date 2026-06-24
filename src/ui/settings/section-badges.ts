import { Setting } from "obsidian";
import { BadgeColor, BadgeValueType, CustomBadge } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { DEFAULT_SETTINGS } from "../../settings/settings-defaults";
import { checkExprSyntax } from "../../utils/expr-eval";

const COLOR_OPTIONS: Record<BadgeColor, string> = {
	default: "Default",
	green: "Green",
	blue: "Blue",
	purple: "Purple",
	yellow: "Yellow",
	red: "Red",
};

const VALUE_TYPE_OPTIONS: Record<BadgeValueType, string> = {
	auto: "Auto",
	minutes: "Minutes (formatted)",
};

export function renderSectionBadges(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	new Setting(container).setName("Header badges").setHeading();

	const notice = container.createDiv({ cls: "rb-settings-mobile-note" });
	notice.createSpan({ text: "Prep, Cook, and Total time badges always appear in a fixed position and style on mobile, regardless of how you've ordered or styled them here. Other badges remain fully customizable on both platforms." });

	const listEl = container.createDiv("recipe-box-badge-list");
	renderBadgeList(listEl, settings, save, rerender);

	// Two-click reset pattern
	const resetBtn = container.createEl("button", { cls: "recipe-box-reset-btn", text: "Reset badges to defaults" });
	let resetPending = false;
	let resetTimer: number | null = null;
	resetBtn.addEventListener("click", () => {
		if (!resetPending) {
			resetPending = true;
			resetBtn.textContent = "Confirm reset?";
			resetTimer = window.setTimeout(() => {
				resetPending = false;
				resetBtn.textContent = "Reset badges to defaults";
			}, 3000);
		} else {
			if (resetTimer) window.clearTimeout(resetTimer);
			settings.headerBadges = structuredClone(DEFAULT_SETTINGS.headerBadges);
			void save().then(() => rerender());
		}
	});

	// ── Tag header display ──────────────────────────────────────────────────
	new Setting(container).setName("Tag display in header").setHeading();

	new Setting(container)
		.setName("Show tags in header")
		.addToggle((t) =>
			t.setValue(settings.showTagsInHeader).onChange(async (v) => {
				settings.showTagsInHeader = v;
				await save();
				rerender();
			})
		);

	if (settings.showTagsInHeader) {
		new Setting(container)
			.setName("Prefix tags with #")
			.addToggle((t) =>
				t.setValue(settings.prefixTagsWithHash).onChange(async (v) => {
					settings.prefixTagsWithHash = v;
					await save();
				})
			);

		new Setting(container)
			.setName("Show full tag path")
			.setDesc("When off, only the last segment of a nested tag is shown.")
			.addToggle((t) =>
				t.setValue(settings.showFullTagPath).onChange(async (v) => {
					settings.showFullTagPath = v;
					await save();
				})
			);
	}
}

function renderBadgeList(
	listEl: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	listEl.empty();

	settings.headerBadges.forEach((badge, i) => {
		const card = listEl.createDiv("recipe-box-badge-card");
		renderBadgeCard(card, badge, i, settings, save, rerender);
	});

	const addBtn = listEl.createEl("button", { text: "+ add badge" });
	addBtn.addEventListener("click", () => {
		settings.headerBadges.push({
			type: "badge",
			property: "",
			label: "New badge",
			color: "default",
			valueType: "auto",
			splitArray: false,
			enabled: true,
			builtin: false,
		});
		void save().then(() => renderBadgeList(listEl, settings, save, rerender));
	});
}

function renderBadgeCard(
	card: HTMLElement,
	badge: CustomBadge,
	index: number,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	const hasFormula = !!badge.formula;

	const header = card.createDiv("recipe-box-badge-header");
	header.createSpan({ text: badge.label || `Badge ${index + 1}` });

	const controls = header.createDiv("recipe-box-badge-controls");

	const up = controls.createEl("button", { text: "↑" });
	const down = controls.createEl("button", { text: "↓" });
	up.disabled = index === 0;
	down.disabled = index === settings.headerBadges.length - 1;

	up.addEventListener("click", () => {
		[settings.headerBadges[index - 1], settings.headerBadges[index]] = [
			settings.headerBadges[index],
			settings.headerBadges[index - 1],
		];
		void save().then(() => rerender());
	});
	down.addEventListener("click", () => {
		[settings.headerBadges[index], settings.headerBadges[index + 1]] = [
			settings.headerBadges[index + 1],
			settings.headerBadges[index],
		];
		void save().then(() => rerender());
	});

	if (!badge.builtin) {
		const del = controls.createEl("button", { text: "✕" });
		del.addEventListener("click", () => {
			settings.headerBadges.splice(index, 1);
			void save().then(() => rerender());
		});
	}

	const body = card.createDiv("recipe-box-badge-body");

	new Setting(body).setName("Enabled").addToggle((t) =>
		t.setValue(badge.enabled).onChange(async (v) => {
			badge.enabled = v;
			await save();
		})
	);

	new Setting(body).setName("Label").addText((t) =>
		t.setValue(badge.label).onChange(async (v) => {
			badge.label = v;
			await save();
			header.querySelector("span")!.textContent = v || `Badge ${index + 1}`;
		})
	);

	new Setting(body).setName("Hide label").addToggle((t) =>
		t.setValue(badge.hideLabel ?? false).onChange(async (v) => {
			badge.hideLabel = v;
			await save();
		})
	);

	new Setting(body).setName("Icon").setDesc("Lucide icon name").addText((t) =>
		t.setValue(badge.icon ?? "").onChange(async (v) => {
			badge.icon = v || undefined;
			await save();
		})
	);

	new Setting(body).setName("Color").addDropdown((dd) =>
		dd
			.addOptions(COLOR_OPTIONS)
			.setValue(badge.color)
			.onChange(async (v) => {
				badge.color = v as BadgeColor;
				await save();
			})
	);

	new Setting(body).setName("Value type").addDropdown((dd) =>
		dd
			.addOptions(VALUE_TYPE_OPTIONS)
			.setValue(badge.valueType)
			.onChange(async (v) => {
				badge.valueType = v as BadgeValueType;
				await save();
			})
	);

	const formulaErrorEl = body.createDiv({ cls: "recipe-box-formula-error" });
	formulaErrorEl.hide();

	new Setting(body)
		.setName("Formula")
		.setDesc("Js expression evaluated with frontmatter in scope. Overrides property/prefix/suffix/split-array when set.")
		.addText((t) => {
			t.setValue(badge.formula ?? "").onChange(async (v) => {
				const trimmed = v.trim();
				badge.formula = trimmed || undefined;
				await save();
				rerender();
				if (trimmed) {
					const err = checkExprSyntax(trimmed);
					if (err) {
						formulaErrorEl.textContent = err;
						formulaErrorEl.show();
					} else {
						formulaErrorEl.hide();
					}
				} else {
					formulaErrorEl.hide();
				}
			});
		});

	const propSetting = new Setting(body).setName("Frontmatter property").addText((t) =>
		t.setValue(badge.property).onChange(async (v) => {
			badge.property = v;
			await save();
		})
	);

	const prefixSetting = new Setting(body).setName("Prefix").addText((t) =>
		t.setValue(badge.prefix ?? "").onChange(async (v) => {
			badge.prefix = v || undefined;
			await save();
		})
	);

	const suffixSetting = new Setting(body).setName("Suffix").addText((t) =>
		t.setValue(badge.suffix ?? "").onChange(async (v) => {
			badge.suffix = v || undefined;
			await save();
		})
	);

	const splitSetting = new Setting(body).setName("Split array into multiple badges").addToggle((t) =>
		t.setValue(badge.splitArray).onChange(async (v) => {
			badge.splitArray = v;
			await save();
		})
	);

	if (hasFormula) {
		[propSetting, prefixSetting, suffixSetting, splitSetting].forEach((s) => {
			s.settingEl.addClass("recipe-box-overridden");
			s.setDesc("Overridden by formula");
		});
	}
}
