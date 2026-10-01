/**
 * "Library and data" top-level group: recipe library, property names, recipe
 * parser, and the merged import/export/sharing page.
 */
import { SettingsBuildContext, SettingsDefinition } from "./settings-build-context";
import { EXPORT_FORMAT_OPTIONS } from "./settings-options";
import { sectionPage } from "./section-row-host";
import { renderSectionLibrary } from "./section-library";
import { renderSectionPropertyNames } from "./section-property-names";
import { renderSectionRecipeParser } from "./section-recipe-parser";

export function buildLibraryDataGroup(ctx: SettingsBuildContext): SettingsDefinition {
	const { app, plugin } = ctx;
	const save = (): Promise<void> => plugin.saveSettings();

	return {
		type: "group",
		heading: "Library and data",
		items: [
			sectionPage(
				"Recipe library",
				"Recipe folders, recipe type matching, dashboard toggle, and folder-click gallery behavior.",
				["recipe folders", "recipe type", "folder click gallery", "dashboard"],
				(el, rerender) => renderSectionLibrary(el, plugin.settings, save, rerender, app),
			),
			sectionPage(
				"Property names",
				"Frontmatter key names used by Recipe Box.",
				["frontmatter", "property names", "field names"],
				(el, rerender) => renderSectionPropertyNames(el, plugin.settings, save, rerender),
			),
			sectionPage(
				"Recipe parser",
				"Localized ingredient unit mappings and filler-word parsing.",
				["units", "synonyms", "localized ingredients", "filler word"],
				(el) => renderSectionRecipeParser(el, plugin.settings, save),
			),
			{
				type: "page",
				name: "Import, export and sharing",
				desc: "Importer template and folder, export defaults, and the share server.",
				items: [
					{
						type: "group",
						heading: "Importer",
						items: [
							{
								name: "Recipe template note path",
								desc: "Path to a note used as an import template. Leave empty for built-in default.",
								aliases: ["importer", "import template"],
								control: { type: "file", key: "importerTemplatePath", filter: (f) => f.extension === "md" },
							},
							{
								name: "Default import folder",
								desc: "Where imported recipes are saved. Leave empty to use the first recipe folder.",
								aliases: ["importer", "import folder"],
								control: { type: "folder", key: "importerDefaultFolder" },
							},
						],
					},
					{
						type: "group",
						heading: "Export",
						items: [
							{
								name: "Default export folder",
								desc: "Shared destination for exports saved into the vault. Choose the vault root to save at the top level.",
								aliases: ["export", "export folder"],
								control: { type: "folder", key: "exportFolder", includeRoot: true },
							},
							{
								name: "Default format",
								desc: "Default format used for recipe export.",
								aliases: ["export", "export format"],
								control: { type: "dropdown", key: "recipeExportDefaultFormat", options: EXPORT_FORMAT_OPTIONS },
							},
							{
								name: "Include cook history and sections by default",
								aliases: ["export", "cook history"],
								control: { type: "toggle", key: "recipeExportIncludeCookHistoryDefault" },
							},
							{
								name: "Include images by default",
								desc: "Image bundling is not implemented yet, so local images are still omitted for now.",
								aliases: ["export", "images"],
								control: { type: "toggle", key: "recipeExportIncludeImagesDefault" },
							},
						],
					},
					{
						type: "group",
						heading: "Sharing",
						items: [
							{
								name: "Share server URL",
								desc: "Server used for shared recipe links. Change only if you self-host the sharing worker.",
								aliases: ["sharing", "share server"],
								control: {
									type: "text",
									key: "shareServerUrl",
									validate: (value: string) => value.trim().length > 0 ? undefined : "Share server URL cannot be empty.",
								},
							},
						],
					},
				],
			},
		],
	};
}
