/**
 * Creates a standalone countdown timer from a user-chosen duration and name,
 * used by the manual "Start timer" command and the ingredients-header button.
 * This is distinct from the inline duration-detection flow in
 * timer-dom-process.ts, which parses durations out of rendered instruction text.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { isRecipeFile } from "../../lifecycle/recipe-file-detection";
import { findOrOpenLeaf } from "../../utils/open-leaf";
import { RECIPE_VIEW_TYPE } from "../recipe-view/recipe-view";
import { TimerWidget } from "./timer-widget";

export function startManualTimer(app: App, settings: RecipeBoxSettings, seconds: number, name: string): void {
	const activeFile = app.workspace.getActiveFile();
	const linkedRecipe = activeFile && isRecipeFile(app, activeFile, settings) ? activeFile : null;

	// TimerWidget only touches the anchor to toggle an "active" class marker on
	// close -- a manual timer has no inline duration button in recipe text to
	// anchor to, so a detached element stands in.
	const anchor = createDiv();

	new TimerWidget(anchor, seconds, name, {
		autoStart: true,
		compactByDefault: settings.timerCompactDisplay,
		rangeDefault: settings.timerRangeDefault,
		recipeName: linkedRecipe ? linkedRecipe.basename : "Timer",
		onNavigate: () => {
			if (linkedRecipe) void findOrOpenLeaf(app, RECIPE_VIEW_TYPE, linkedRecipe.path);
		},
	});
}
