/**
 * Settings page for the Pantry module: connection fields, house and list
 * pickers, test button and auto sync interval. Everything except the master
 * switch is hidden while the module is off.
 */
import { Notice, SecretComponent, Setting, SettingDefinitionPage } from "obsidian";
import { SettingsBuildContext, SettingsKey } from "../../ui/settings/settings-build-context";
import { PantryError } from "./pantryTypes";
import { pantryPickerClient } from "./pantryConfig";

function friendly(err: unknown): string {
	if (err instanceof PantryError) return err.message;
	return "Something went wrong talking to Pantry.";
}

export function buildPantryPage(ctx: SettingsBuildContext): SettingDefinitionPage<SettingsKey> {
	const { app, plugin } = ctx;
	const save = (): Promise<void> => plugin.saveSettings();
	const on = (): boolean => plugin.settings.pantryEnabled;

	return {
		type: "page",
		name: "Pantry sync",
		desc: "Two-way sync between your grocery list and a checklist in the Nextcloud Pantry app.",
		items: [
			{
				name: "Enable Pantry sync",
				desc: "Off by default. When off, Pantry code does not run and makes no network calls. When on, your grocery list stays plain markdown and is matched to Pantry by item name.",
				aliases: ["pantry", "nextcloud", "sync"],
				control: { type: "toggle", key: "pantryEnabled" },
			},
			{
				name: "Server address",
				desc: "Your Nextcloud address, for example cloud.example.com.",
				visible: on,
				control: { type: "text", key: "pantryServerUrl", placeholder: "https://cloud.example.com" },
			},
			{
				name: "Username",
				desc: "Your Nextcloud username.",
				visible: on,
				control: { type: "text", key: "pantryUsername" },
			},
			{
				name: "App password",
				desc: "Create one in Nextcloud under Personal settings, Security. It is kept in Obsidian's secret storage, not in your notes.",
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
				name: "Test connection",
				desc: "Checks the address, username and password.",
				visible: on,
				render: (setting) => {
					setting.addButton((btn) =>
						btn.setButtonText("Test connection").onClick(() => {
							void (async () => {
								const client = pantryPickerClient(app, plugin.settings);
								if (!client) {
									new Notice("Fill in the address, username and app password first.");
									return;
								}
								try {
									const houses = await client.listHouses();
									new Notice(`Connected. Found ${houses.length} ${houses.length === 1 ? "house" : "houses"}.`);
								} catch (err) {
									new Notice(friendly(err));
								}
							})();
						})
					);
				},
			},
			{
				name: "House",
				desc: "The Pantry house that holds your grocery checklist.",
				visible: on,
				render: (setting) => renderPicker(setting, {
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
					},
				}),
			},
			{
				name: "Checklist",
				desc: "The Pantry checklist to sync with.",
				visible: () => on() && plugin.settings.pantryHouseId > 0,
				render: (setting) => {
					renderPicker(setting, {
						current: () => plugin.settings.pantryListId,
						load: async () => {
							const client = pantryPickerClient(app, plugin.settings, plugin.settings.pantryHouseId);
							return client ? (await client.listLists()).map((l) => ({ id: l.id, name: l.name })) : [];
						},
						choose: async (id) => { plugin.settings.pantryListId = id; await save(); },
					});
					setting.addButton((btn) =>
						btn.setButtonText("Create new list").onClick(() => {
							void (async () => {
								const client = pantryPickerClient(app, plugin.settings, plugin.settings.pantryHouseId);
								if (!client) return;
								try {
									const list = await client.createList("Groceries");
									plugin.settings.pantryListId = list.id;
									await save();
									// eslint-disable-next-line obsidianmd/ui/sentence-case -- Pantry is a product name
									new Notice("Created a Pantry list called Groceries. Reopen this page to see it.");
								} catch (err) {
									new Notice(friendly(err));
								}
							})();
						})
					);
				},
			},
			{
				name: "Auto sync every (minutes)",
				desc: "0 means manual only. Turn this on for one device only, so two devices do not push the same item twice.",
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

function renderPicker(setting: Setting, opts: PickerOptions): void {
	setting.addDropdown((dd) => {
		const cur = opts.current();
		dd.addOption("0", cur > 0 ? `Selected (id ${cur})` : "Not chosen");
		dd.setValue(String(cur));
		dd.onChange((value) => { void opts.choose(Number(value)); });
		// Options load after render so opening settings never blocks on the network.
		void opts.load().then((rows) => {
			for (const row of rows) dd.addOption(String(row.id), row.name);
			dd.setValue(String(opts.current()));
		}).catch(() => {
			// Leave the placeholder. The Test connection button explains what is wrong.
		});
	});
}
