/**
 * Settings section for recipe sharing -- currently just the share server
 * URL. This one setting is the entire self-host-readiness story for v1:
 * every share/unshare API call reads it instead of hardcoding the hosted
 * instance, so a future self-hoster only needs to point it at their own
 * Worker deployment.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";

export function renderSectionSharing(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void,
): void {
	new Setting(container)
		.setName("Share server URL")
		.setDesc("The server that hosts shared recipe links. Only change this if you're self-hosting the recipe sharing worker.")
		.addText((t) =>
			t.setValue(settings.shareServerUrl).onChange(async (v) => {
				settings.shareServerUrl = v.trim() || settings.shareServerUrl;
				await save();
			})
		);
}
