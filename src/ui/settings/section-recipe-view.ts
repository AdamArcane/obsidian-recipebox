/**
 * Recipe view settings section. Owns view toggles, tag display,
 * rating property, and the inline header-badge list.
 */
import { App, Platform, setIcon, Setting } from "obsidian";
import { CustomBadge } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { migrateModeFieldReferences } from "../../suggester/migrate-mode-fields";
import { DEFAULT_SETTINGS } from "../../settings/settings-defaults";
import { BadgeEditModal } from "../modals/modal-badge-edit";
import { SeparatorEditModal } from "../modals/modal-separator-edit";
import { DiscoveryResult } from "../../discovery/discovery-cache";

export function renderSectionRecipeView(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App,
	getDiscovery?: () => DiscoveryResult | null,
): void {
	new Setting(container).setName("Recipe view").setHeading();

	new Setting(container)
		.setName("Auto-open recipe view")
		.setDesc("Automatically switch to recipe view when opening a recipe note.")
		.addToggle((t) =>
			t.setValue(settings.autoOpenRecipeView).onChange(async (v) => {
				settings.autoOpenRecipeView = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Strip duplicate title from body")
		.setDesc("Remove a leading h1 from the note body if it matches the note title.")
		.addToggle((t) =>
			t.setValue(settings.stripBodyTitle).onChange(async (v) => {
				settings.stripBodyTitle = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Strip duplicate hero image from body")
		.setDesc("Remove an inline image from the body if it matches the frontmatter image property.")
		.addToggle((t) =>
			t.setValue(settings.stripHeroImage).onChange(async (v) => {
				settings.stripHeroImage = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Rating frontmatter property")
		.setDesc("The property name used to store star ratings (1–5).")
		.addText((t) => {
			t.setValue(settings.ratingProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.ratingProperty, v);
				settings.ratingProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

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

		new Setting(container)
			.setName("Cross off while cooking")
			.setDesc("Clicking an ingredient or instruction step marks it as done for the current session.")
			.addToggle((t) =>
				t.setValue(settings.crossOffWhileCooking).onChange(async (v) => {
					settings.crossOffWhileCooking = v;
					await save();
				})
			);

	}

	// ── Inline badge list ────────────────────────────────────────────────────
	new Setting(container).setName("Header badges").setHeading();

	const badgeSetting = new Setting(container)
		.setDesc("Frontmatter properties to surface as badges in the recipe view header. Click a row to edit, drag to reorder. The last made badge property should match the tracking setting in the cooking & tracking section.");
	badgeSetting.settingEl.addClass("rb-badge-setting");

	const listEl = badgeSetting.settingEl.createDiv({ cls: "rb-badge-list" });
	renderBadgeList(listEl, settings, save, app, getDiscovery);
}

function badgePrimary(badge: CustomBadge): string {
	if (badge.type === "newline") return "↵ New line";
	if (badge.type === "separator") return `${badge.property || "|"}  separator`;
	if (badge.formula) return badge.label || "Formula";
	return badge.property || "(no property)";
}

function badgeSecondary(badge: CustomBadge): string | null {
	if (badge.type === "newline" || badge.type === "separator") return null;
	if (badge.formula) {
		return badge.formula.length > 48 ? badge.formula.slice(0, 48) + "…" : badge.formula;
	}
	const label = badge.label?.trim();
	if (label && label !== badge.property) return label;
	return null;
}

function renderBadgeList(
	listEl: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	app: App,
	getDiscovery?: () => DiscoveryResult | null,
): void {
	listEl.empty();
	let dragFromIndex = -1;

	settings.headerBadges.forEach((badge, i) => {
		const row = listEl.createDiv({ cls: "rb-badge-row" });

		if (!Platform.isMobile) {
			row.setAttribute("draggable", "true");
			const handle = row.createSpan({ cls: "rb-badge-drag-handle", text: "⠿" });
			handle.setAttribute("aria-hidden", "true");
		}

		const isFormula = !!badge.formula;
		const info = row.createDiv({ cls: "rb-badge-info" });
		if (isFormula) info.createSpan({ cls: "rb-badge-formula-tag", text: "f" });
		const textWrap = info.createDiv({ cls: "rb-badge-text" });
		textWrap.createSpan({ cls: "rb-badge-primary", text: badgePrimary(badge) });
		const sub = badgeSecondary(badge);
		if (sub) textWrap.createSpan({ cls: "rb-badge-secondary", text: sub });

		// Enabled checkbox
		const checkbox = row.createEl("input", { type: "checkbox" });
		checkbox.checked = badge.enabled;
		checkbox.addEventListener("change", () => {
			badge.enabled = checkbox.checked;
			void save();
		});

		// Delete button — available for all badges
		const del = row.createEl("button", { cls: "rb-badge-delete clickable-icon" });
		del.setAttribute("aria-label", "Remove badge");
		setIcon(del, "trash-2");
		del.addEventListener("click", (e) => {
			e.stopPropagation();
			settings.headerBadges.splice(i, 1);
			void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
		});

		// Click info area to edit (not checkbox/delete/handle)
		if (badge.type !== "newline") {
			info.setCssProps({ cursor: "pointer" });
			info.addEventListener("click", () => {
				if (badge.type === "separator") {
					new SeparatorEditModal(app, badge, (updated) => {
						Object.assign(badge, updated);
						void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
					}).open();
				} else {
					new BadgeEditModal(app, badge, (updated) => {
						Object.assign(badge, updated);
						void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
					}, false, getDiscovery, () => settings).open();
				}
			});
		}

		if (Platform.isMobile) {
			// ↑/↓ buttons replace drag on mobile — HTML5 drag-and-drop freezes the touch UI
			const up = row.createEl("button", { cls: "rb-badge-delete clickable-icon", text: "↑" });
			const dn = row.createEl("button", { cls: "rb-badge-delete clickable-icon", text: "↓" });
			up.disabled = i === 0;
			dn.disabled = i === settings.headerBadges.length - 1;
			up.addEventListener("click", (e) => {
				e.stopPropagation();
				[settings.headerBadges[i - 1], settings.headerBadges[i]] =
					[settings.headerBadges[i], settings.headerBadges[i - 1]];
				void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
			});
			dn.addEventListener("click", (e) => {
				e.stopPropagation();
				[settings.headerBadges[i], settings.headerBadges[i + 1]] =
					[settings.headerBadges[i + 1], settings.headerBadges[i]];
				void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
			});
		} else {
			// Desktop: HTML5 drag-and-drop reorder
			row.addEventListener("dragstart", (e) => {
				dragFromIndex = i;
				e.dataTransfer!.effectAllowed = "move";
				row.addClass("is-dragging");
			});
			row.addEventListener("dragend", () => row.removeClass("is-dragging"));
			row.addEventListener("dragover", (e) => {
				e.preventDefault();
				e.dataTransfer!.dropEffect = "move";
				listEl.querySelectorAll(".rb-badge-row").forEach((r) => r.removeClass("drop-target"));
				row.addClass("drop-target");
			});
			row.addEventListener("dragleave", () => row.removeClass("drop-target"));
			row.addEventListener("drop", (e) => {
				e.preventDefault();
				row.removeClass("drop-target");
				if (dragFromIndex < 0 || dragFromIndex === i) return;
				const [moved] = settings.headerBadges.splice(dragFromIndex, 1);
				settings.headerBadges.splice(i, 0, moved);
				dragFromIndex = -1;
				void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
			});
		}
	});

	// Footer actions
	const footer = listEl.createDiv({ cls: "rb-badge-footer" });

	footer.createEl("button", { text: "+ add badge" }).addEventListener("click", () => {
		const blank: CustomBadge = {
			type: "badge", property: "", label: "",
			color: "default", valueType: "auto", splitArray: false,
			enabled: true, builtin: false,
		};
		new BadgeEditModal(app, blank, (created) => {
			settings.headerBadges.push(created);
			void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
		}, true, getDiscovery, () => settings).open();
	});

	footer.createEl("button", { text: "+ separator" }).addEventListener("click", () => {
		new SeparatorEditModal(app, null, (badge) => {
			settings.headerBadges.push(badge);
			void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
		}).open();
	});

	footer.createEl("button", { text: "+ new line" }).addEventListener("click", () => {
		settings.headerBadges.push({
			type: "newline", property: "", label: "",
			color: "default", valueType: "auto", splitArray: false,
			enabled: true, builtin: false,
		});
		void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
	});

	let resetPending = false;
	let resetTimer: number | null = null;
	const resetBtn = footer.createEl("button", { text: "Reset to defaults" });
	resetBtn.addEventListener("click", () => {
		if (!resetPending) {
			resetPending = true;
			resetBtn.textContent = "Confirm reset?";
			resetTimer = window.setTimeout(() => { resetPending = false; resetBtn.textContent = "Reset to defaults"; }, 3000);
		} else {
			if (resetTimer) window.clearTimeout(resetTimer);
			settings.headerBadges = structuredClone(DEFAULT_SETTINGS.headerBadges);
			void save().then(() => renderBadgeList(listEl, settings, save, app, getDiscovery));
		}
	});
}
