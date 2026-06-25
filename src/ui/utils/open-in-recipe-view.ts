/** Opens a file in an existing recipe-view leaf already showing it, or a new tab if none exists. */
import { App } from "obsidian";
import { RECIPE_VIEW_TYPE } from "../recipe-view/recipe-view";
import { findOrOpenLeaf } from "../../utils/open-leaf";

/** Opens a file in an existing recipe-view leaf already showing it, or a new tab. */
export function openInRecipeView(app: App, filePath: string): void {
	void findOrOpenLeaf(app, RECIPE_VIEW_TYPE, filePath);
}
