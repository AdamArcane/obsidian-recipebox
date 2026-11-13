/**
 * "Library and data" top-level group: recipe library, property names, recipe
 * parser, and the merged import/export/sharing page.
 */
import { t as translateUi } from "../../i18n";
import { SettingsBuildContext, SettingsDefinition } from "./settings-build-context";
import { EXPORT_FORMAT_OPTIONS, IMAGE_STORAGE_OPTIONS } from "./settings-options";
import { sectionPage } from "./section-row-host";
import { renderSectionLibrary } from "./section-library";
import { renderSectionPropertyNames } from "./section-property-names";
import { renderSectionRecipeParser } from "./section-recipe-parser";

export function buildLibraryDataGroup(ctx: SettingsBuildContext): SettingsDefinition {
	const { app, plugin } = ctx;
	const save = (): Promise<void> => plugin.saveSettings();

	return {
		type: "group",
		heading: translateUi("Library and data"),
		items: [
			sectionPage(
				translateUi("Recipe library"),
				translateUi("Recipe folders, recipe type matching, dashboard toggle, and folder-click gallery behavior."),
				[translateUi("recipe folders"), translateUi("recipe type"), translateUi("folder click gallery"), "dashboard"],
				(el, rerender) => renderSectionLibrary(el, plugin.settings, save, rerender, app),
			),
			sectionPage(
				translateUi("Property names"),
				translateUi("Frontmatter key names used by Recipe Box."),
				["frontmatter", translateUi("property names"), translateUi("field names")],
				(el, rerender) => renderSectionPropertyNames(el, plugin.settings, save, rerender),
			),
			sectionPage(
				translateUi("Recipe parser"),
				translateUi("Localized ingredient unit mappings and filler-word parsing."),
				["units", "synonyms", translateUi("localized ingredients"), translateUi("filler word")],
				(el) => renderSectionRecipeParser(el, plugin.settings, save),
			),
			{
				type: "page",
				name: translateUi("Import, export and sharing"),
				desc: translateUi("Importer template and folder, export defaults, and the share server."),
				items: [
					{
						type: "group",
						heading: translateUi("Importer"),
						items: [
							{
								name: translateUi("Recipe template note path"),
								desc: translateUi("Path to a note used as an import template. Leave empty for built-in default."),
								aliases: ["importer", translateUi("import template")],
								control: { type: "file", key: "importerTemplatePath", filter: (f) => f.extension === "md" },
							},
							{
								name: translateUi("Default import folder"),
								desc: translateUi("Where imported recipes are saved. Leave empty to use the first recipe folder."),
								aliases: ["importer", translateUi("import folder")],
								control: { type: "folder", key: "importerDefaultFolder" },
							},
							{
								name: translateUi("Download recipe images on import"),
								desc: translateUi("When off, keep the source image URL in the recipe instead of downloading it. Images bundled with file imports are still saved to the vault."),
								aliases: ["importer", "images", translateUi("image urls")],
								control: { type: "toggle", key: "downloadImagesOnImport" },
							},
							{
								name: translateUi("Image storage location"),
								desc: translateUi("Choose where downloaded and bundled recipe images are saved."),
								aliases: ["importer", translateUi("image folder"), translateUi("image location")],
								control: { type: "dropdown", key: "imageStorageLocation", options: IMAGE_STORAGE_OPTIONS },
							},
							{
								name: translateUi("Custom image folder"),
								desc: translateUi("Choose the vault root to save at the top level."),
								aliases: ["importer", translateUi("custom image folder")],
								visible: () => plugin.settings.imageStorageLocation === "custom",
								searchable: () => plugin.settings.imageStorageLocation === "custom",
								control: { type: "folder", key: "customImageStorageFolder", includeRoot: true },
							},
						],
					},
					{
						type: "group",
						heading: translateUi("Export"),
						items: [
							{
								name: translateUi("Default export folder"),
								desc: translateUi("Shared destination for exports saved into the vault. Choose the vault root to save at the top level."),
								aliases: ["export", translateUi("export folder")],
								control: { type: "folder", key: "exportFolder", includeRoot: true },
							},
							{
								name: translateUi("Default format"),
								desc: translateUi("Default format used for recipe export."),
								aliases: ["export", translateUi("export format")],
								control: { type: "dropdown", key: "recipeExportDefaultFormat", options: EXPORT_FORMAT_OPTIONS },
							},
							{
								name: translateUi("Include cook history and sections by default"),
								aliases: ["export", translateUi("cook history")],
								control: { type: "toggle", key: "recipeExportIncludeCookHistoryDefault" },
							},
							{
								name: translateUi("Include images by default"),
								desc: translateUi("Image bundling is not implemented yet, so local images are still omitted for now."),
								aliases: ["export", "images"],
								control: { type: "toggle", key: "recipeExportIncludeImagesDefault" },
							},
						],
					},
					{
						type: "group",
						heading: translateUi("Sharing"),
						items: [
							{
								name: translateUi("Share server URL"),
								desc: translateUi("Server used for shared recipe links. Change only if you self-host the sharing worker."),
								aliases: ["sharing", translateUi("share server")],
								control: {
									type: "text",
									key: "shareServerUrl",
									validate: (value: string) => value.trim().length > 0 ? undefined : translateUi("Share server URL cannot be empty."),
								},
							},
						],
					},
				],
			},
		],
	};
}
