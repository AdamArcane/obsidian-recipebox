/**
 * Mounts an imperative section renderer inside one full-width declarative row
 * on a page. The row exists so Obsidian search can match the page through the
 * row's aliases: search only indexes declarative rows, and anything rendered
 * inside a SettingPage is invisible to it.
 */
import { SettingDefinitionPage } from "obsidian";
import { SettingsKey } from "./settings-build-context";

export type SectionRender = (containerEl: HTMLElement, rerender: () => void) => void;

export function sectionPage(
	name: string,
	desc: string,
	aliases: string[],
	renderSection: SectionRender,
): SettingDefinitionPage<SettingsKey> {
	return {
		type: "page",
		name,
		desc,
		items: [
			{
				name: `${name} settings`,
				aliases,
				render: (setting) => {
					setting.settingEl.addClass("rb-section-host-row");
					setting.nameEl.empty();
					setting.descEl.empty();
					setting.infoEl.empty();

					const mount = (): void => {
						setting.controlEl.empty();
						renderSection(setting.controlEl.createDiv({ cls: "rb-section-host-mount" }), rerender);
					};
					// Sections call rerender after toggles that change which rows exist;
					// keep the scroll position so the page does not jump to the top.
					const rerender = (): void => {
						const scroller = setting.settingEl.closest<HTMLElement>(".vertical-tab-content, .modal-content") ?? setting.settingEl.parentElement;
						const top = scroller?.scrollTop ?? 0;
						mount();
						if (scroller) scroller.scrollTop = top;
					};
					mount();
				},
			},
		],
	};
}
