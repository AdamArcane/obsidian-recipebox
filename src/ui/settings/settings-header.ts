/**
 * Branded header row for the top of the settings tab: logo, plugin name and
 * version, and links to the website, documentation, and issue tracker.
 */
import { addIcon, SettingDefinitionRender, setIcon } from "obsidian";
import RecipeBoxPlugin from "../../main";
import logoDataUri from "../../../assets/rb-logo-icon.png";

const REPO_URL = "https://github.com/AdamArcane/obsidian-recipebox";

// Obsidian only bundles Lucide, whose "github" icon is an outline cat with no
// circle. This is the filled circular GitHub mark (16px grid), scaled into
// addIcon's 100x100 viewBox.
const GITHUB_MARK_ICON = "rb-github-mark";
const GITHUB_MARK_PATH = "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";

const LINKS: { label: string; url: string; icon: string }[] = [
	{ label: "Website", url: "https://recipebox.arcanerecipes.com", icon: "globe" },
	{ label: "Documentation", url: "https://recipebox-docs.arcanerecipes.com", icon: "book-open" },
	{ label: "Support", url: "https://github.com/AdamArcane/obsidian-recipebox/issues", icon: "life-buoy" },
];

export function buildSettingsHeader(plugin: RecipeBoxPlugin): SettingDefinitionRender {
	return {
		name: "Recipe Box",
		// A decorative header should never show up as a search result.
		searchable: false,
		render: (setting) => {
			// Reuse the row only as a host: drop its name/description chrome.
			setting.settingEl.addClass("rb-settings-header-row");
			setting.infoEl.empty();
			setting.controlEl.empty();

			const header = setting.controlEl.createDiv({ cls: "rb-settings-header" });
			const brand = header.createDiv({ cls: "rb-settings-header-brand" });
			brand.createEl("img", { cls: "rb-settings-header-logo", attr: { src: logoDataUri, alt: "Recipe Box logo" } });
			const title = brand.createDiv({ cls: "rb-settings-header-title" });
			title.createDiv({ cls: "rb-settings-header-name", text: "Recipe Box" });
			title.createDiv({ cls: "rb-settings-header-version", text: `Version ${plugin.manifest.version}` });

			const links = header.createDiv({ cls: "rb-settings-header-links" });
			for (const { label, url, icon } of LINKS) {
				const link = links.createEl("a", { cls: "rb-settings-header-link", href: url });
				setIcon(link.createSpan({ cls: "rb-settings-header-link-glyph" }), icon);
				link.createSpan({ text: label });
			}

			// Icon-only, so the aria-label is the only accessible name.
			const repo = links.createEl("a", {
				cls: "rb-settings-header-link rb-settings-header-link-icon",
				href: REPO_URL,
				attr: { "aria-label": "GitHub repository" },
			});
			addIcon(GITHUB_MARK_ICON, `<path transform="scale(6.25)" fill="currentColor" d="${GITHUB_MARK_PATH}"/>`);
			setIcon(repo, GITHUB_MARK_ICON);
		},
	};
}
