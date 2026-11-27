/**
 * Settings page for the Pantry module: connection fields, house and list
 * pickers, test button and auto sync interval. Everything except the master
 * switch is hidden while the module is off.
 */
import { Notice, SecretComponent, Setting, SettingDefinitionPage } from "obsidian";
import { SettingsBuildContext, SettingsKey } from "../../ui/settings/settings-build-context";
import { PantryError } from "./pantryTypes";
import { pantryPickerClient } from "./pantryConfig";
import { t as translateUi } from "../../i18n"; // Путь может отличаться, посмотри, откуда импортируют translateUi другие файлы в src/ui/settings/

function friendly(err: unknown): string {
	if (err instanceof PantryError) return err.message;
	return translateUi("Something went wrong talking to Pantry.");;
}

export function buildPantryPage(ctx: SettingsBuildContext): SettingDefinitionPage<SettingsKey> {
	const { app, plugin } = ctx;
	const save = (): Promise<void> => plugin.saveSettings();
	const on = (): boolean => plugin.settings.pantryEnabled;
	// The checklist row is drawn once, so the house picker and the create button
	// call this to make it reload instead of waiting for the page to be reopened.
	let reloadLists: (() => Promise<void>) | null = null;

	return {
		type: "page",
		name: translateUi("Nextcloud Pantry"),
		desc: translateUi("Two-way sync between your grocery list and a checklist in the Nextcloud Pantry app."),
		items: [
			{
				name: translateUi("Enable Pantry sync"),
				desc: translateUi("Off by default. When off, Pantry code does not run and makes no network calls. When on, your grocery list stays plain markdown and is matched to Pantry by item name."),
				aliases: ["pantry", "nextcloud", "sync"],
				control: { type: "toggle", key: "pantryEnabled" },
			},
			{
				name: translateUi("Server address"),
				desc: translateUi("Your Nextcloud address, for example cloud.example.com."),
				visible: on,
				control: { type: "text", key: "pantryServerUrl", placeholder: "https://cloud.example.com" },
			},
			{
				name: translateUi("Username"),
				desc: translateUi("Your Nextcloud username."),
				visible: on,
				control: { type: "text", key: "pantryUsername" },
			},
			{
				name: translateUi("App password"),
				desc: translateUi("Create one in Nextcloud under Personal settings, Security. It is kept in Obsidian's secret storage, not in your notes."),
				visible: on,
				render: (setting) => {
					setting.addComponent((el) =>
						new SecretComponent(app, el)
							.setValue(plugin.settings.pantryAppPassword)
							.onChange((value) => {
								plugin.settings.pantryAppPassword = value;
								void save();
							})
					);
				},
			},
			{
				name: translateUi("Test connection"),
				desc: translateUi("Checks the address, username and password."),
				visible: on,
				render: (setting) => {
					setting.addButton((btn) =>
						btn.setButtonText(translateUi("Test connection")).onClick(() => {
							void (async () => {
								const client = pantryPickerClient(app, plugin.settings);
								if (!client) {
									new Notice(translateUi("Fill in the address, username and app password first."));
									return;
								}
								try {
									const houses = await client.listHouses();
									const houseWord = houses.length === 1 ? translateUi("house") : translateUi("houses");
									new Notice(translateUi("Connected. Found {0} {1}.", houses.length, houseWord));
								} catch (err) {
									new Notice(friendly(err));
								}
							})();
						})
					);
				},
			},
			{
				name: translateUi("House"),
				desc: translateUi("The Pantry house that holds your grocery checklist."),
				visible: on,
				render: (setting) => { renderPicker(setting, {
					current: () => plugin.settings.pantryHouseId,
					load: async () => {
						const client = pantryPickerClient(app, plugin.settings);
						return client ? (await client.listHouses()).map((h) => ({ id: h.id, name: h.name })) : [];
					},
					choose: async (id) => {
						plugin.settings.pantryHouseId = id;
						// A list belongs to one house, so the old choice no longer applies.
						plugin.settings.pantryListId = 0;
						await save();
						await reloadLists?.();
					},
				}); },
			},
			{
				name: translateUi("Checklist"),
				desc: translateUi("The Pantry checklist to sync with."),
				// Always shown while on. Hiding it until a house is chosen meant it never
				// appeared, because the row's visibility was only checked at first draw.
				visible: on,
				render: (setting) => {
					const picker = renderPicker(setting, {
						current: () => plugin.settings.pantryListId,
						load: async () => {
							if (plugin.settings.pantryHouseId <= 0) return [];
							const client = pantryPickerClient(app, plugin.settings, plugin.settings.pantryHouseId);
							return client ? (await client.listLists()).map((l) => ({ id: l.id, name: l.name })) : [];
						},
						choose: async (id) => { plugin.settings.pantryListId = id; await save(); },
					});
					reloadLists = picker.reload;
					setting.addButton((btn) =>
						btn.setButtonText(translateUi("Create new list")).onClick(() => {
							void (async () => {
								const client = pantryPickerClient(app, plugin.settings, plugin.settings.pantryHouseId);
								if (!client) return;
								try {
									const list = await client.createList(translateUi("Groceries"));
									plugin.settings.pantryListId = list.id;
									await save();
									await reloadLists?.();
									new Notice(translateUi("Created a new grocery list."));
								} catch (err) {
									new Notice(friendly(err));
								}
							})();
						})
					);
				},
			},
			{
				name: translateUi("Auto sync every (minutes)"),
				desc: translateUi("0 means manual only. Turn this on for one device only, so two devices do not push the same item twice."),
				visible: on,
				control: {
					type: "number",
					key: "pantryAutoSyncMinutes",
					validate: (value: number) => (value === 0 || value >= 1 ? undefined : "Use 0 for manual only, or 1 or more."),
				},
			},
		],
	};
}

interface PickerOptions {
	current: () => number;
	load: () => Promise<Array<{ id: number; name: string }>>;
	choose: (id: number) => Promise<void>;
}

/**
 * Why the options reload on demand: the row is drawn as soon as the module is
 * switched on, usually before the address and password are filled in, so the
 * first load finds nothing. Loading once at render time left the dropdown
 * empty for good. Now it retries when opened while still empty, and a refresh
 * button forces a reload.
 */
function renderPicker(setting: Setting, opts: PickerOptions): { reload: () => Promise<void> } {
	let select: HTMLSelectElement | null = null;
	let loaded = false;

	const fill = async (reportErrors: boolean): Promise<void> => {
		if (!select) return;
		try {
			const rows = await opts.load();
			if (!select) return;
			// Keep the placeholder (value 0) and rebuild the rest.
			for (const o of Array.from(select.options)) if (o.value !== "0") o.remove();
			for (const row of rows) select.add(new Option(row.name, String(row.id)));
			// The placeholder names the current id, which goes stale when the choice is reset.
			const cur = opts.current();
			if (select.options[0]) select.options[0].text = cur > 0 ? translateUi("Selected (id {0})", cur) : translateUi("Not chosen");
			select.value = String(cur);
			loaded = rows.length > 0;
			if (reportErrors && rows.length === 0) {
				new Notice(translateUi("Nothing found. Check the address, username and app password then test the connection again."));
			}
		} catch (err) {
			if (reportErrors) new Notice(friendly(err));
		}
	};

	setting.addDropdown((dd) => {
		const cur = opts.current();
		dd.addOption("0", cur > 0 ? translateUi("Selected (id {0})", cur) : translateUi("Not chosen"));
		dd.setValue(String(cur));
		dd.onChange((value) => { void opts.choose(Number(value)); });
		select = dd.selectEl;
		// Retry on open so credentials typed after this row was drawn still work.
		dd.selectEl.addEventListener("mousedown", () => { if (!loaded) void fill(false); });
		dd.selectEl.addEventListener("focus", () => { if (!loaded) void fill(false); });
		// Options load after render so opening settings never blocks on the network.
		void fill(false);
	});
	setting.addExtraButton((btn) =>
		btn.setIcon("refresh-cw").setTooltip(translateUi("Reload the list")).onClick(() => { void fill(true); })
	);
	return { reload: () => fill(false) };
}
