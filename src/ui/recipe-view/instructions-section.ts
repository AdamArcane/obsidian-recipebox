/**
 * Renders the instructions section of the recipe view, including sub-group
 * headings and Markdown-rendered steps with optional inline timer injection.
 */
import { App, Component, MarkdownRenderer, setIcon } from "obsidian";
import { InstructionGroup } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { TimerOptions, processTimerNodes } from "../timer/timer-dom-process";
export type { TimerOptions };

export async function renderInstructionsSection(
	container: HTMLElement,
	app: App,
	component: Component,
	sourcePath: string,
	groups: InstructionGroup[],
	settings: RecipeBoxSettings,
	timerOpts?: TimerOptions,
): Promise<void> {
	const section = container.createDiv({ cls: "rb-instructions-section" });
	const header = section.createDiv({ cls: "rb-section-header" });
	const sectionIcon = header.createSpan({ cls: "rb-section-icon" });
	setIcon(sectionIcon, "list-ordered");
	header.createSpan({ cls: "rb-section-title", text: settings.instructionsHeading });

	for (const group of groups) {
		if (!group.heading && group.steps.length === 0) continue;

		let stepContainer = section;
		if (group.heading) {
			const groupEl = section.createDiv({ cls: "rb-instruction-group" });
			const groupHeader = groupEl.createDiv({
				cls: `rb-group-header rb-heading-level-${group.headingLevel}`,
			});
			groupHeader.createSpan({ text: group.heading });
			groupHeader.addEventListener("click", () =>
				groupEl.toggleClass("rb-collapsed", !groupEl.hasClass("rb-collapsed")),
			);
			stepContainer = groupEl.createDiv({ cls: "rb-group-steps" });
		}

		const ol = stepContainer.createEl("ol", { cls: "rb-step-list" });
		for (const step of group.steps) {
			const li = ol.createEl("li", { cls: "rb-step" });
			if (settings.crossOffWhileCooking) {
				li.addEventListener("click", () => li.toggleClass("rb-crossed-off", !li.hasClass("rb-crossed-off")));
			}
			await MarkdownRenderer.render(app, step, li, sourcePath, component);
			if (timerOpts) processTimerNodes(li, timerOpts);
		}
	}
}
