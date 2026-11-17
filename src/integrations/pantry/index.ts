/**
 * Lazy entry for the opt-in Pantry module. main.ts only imports this when
 * pantryEnabled is true, so disabled users get no command, timer, listener,
 * status bar item or network call. Obsidian cannot unregister a command, so a
 * command registered before the user switched the module off hides itself.
 */
import { Notice, TFile } from "obsidian";
import type RecipeBoxPlugin from "../../main";
import { ingredientParserOptions, parseIngredientLine } from "../../parser/ingredient-parse";
import { ingredientKey } from "../../parser/ingredient-clean";
import { debounce } from "../../utils/debounce";
import { resolveNotePath } from "../../utils/vault-notes";
import { PantryError } from "./pantryTypes";
import { runSync } from "./syncRunner";
import { splitQuantity } from "./splitQuantity";
import { describeSources } from "./recipeDescription";
import { SyncScheduler } from "./syncScheduler";
import { pantryClientFromSettings } from "./pantryConfig";

const COMMAND_ID = "sync-grocery-list-with-pantry";

export class PantryModule {
	private scheduler = new SyncScheduler(() => this.runOnce());
	private statusEl: HTMLElement | null = null;
	private intervalId: number | null = null;
	private statusTimerId: number | null = null;
	private lastSyncAt: number | null = null;
	private failed = false;
	/** After a 401/403 auto sync stays off until a manual run succeeds. */
	private authBlocked = false;
	private commandRegistered = false;
	private enabled = false;
	private lastManual = false;

	constructor(private plugin: RecipeBoxPlugin) {}

	/** Called on load and after every settings change. Idempotent. */
	apply(): void {
		const s = this.plugin.settings;
		if (!s.pantryEnabled) {
			this.stop();
			return;
		}
		this.enabled = true;
		this.registerCommandOnce();
		this.ensureStatusBar();
		this.resetInterval();
	}

	stop(): void {
		this.enabled = false;
		if (this.intervalId !== null) window.clearInterval(this.intervalId);
		if (this.statusTimerId !== null) window.clearInterval(this.statusTimerId);
		this.intervalId = null;
		this.statusTimerId = null;
		this.statusEl?.remove();
		this.statusEl = null;
	}

	private registerCommandOnce(): void {
		if (this.commandRegistered) return;
		this.commandRegistered = true;
		this.plugin.addCommand({
			id: COMMAND_ID,
			name: "Sync grocery list",
			checkCallback: (checking) => {
				if (!this.enabled) return false;
				if (!checking) void this.syncNow();
				return true;
			},
		});
		// The modify listener is registered once and checks the live setting, so
		// switching auto sync on or off needs no re-registration.
		const push = debounce(() => { void this.onNoteEdited(); }, 5000);
		this.plugin.registerEvent(
			this.plugin.app.vault.on("modify", (file) => {
				if (!this.enabled || this.plugin.settings.pantryAutoSyncMinutes <= 0 || this.authBlocked) return;
				if (file instanceof TFile && file.path === resolveNotePath(this.plugin.settings.groceryListPath)) push();
			})
		);
	}

	private async onNoteEdited(): Promise<void> {
		const file = this.plugin.app.vault.getFileByPath(resolveNotePath(this.plugin.settings.groceryListPath));
		if (!file) return;
		// Our own write comes back as a modify event. Comparing content (rather
		// than a flag) survives the event arriving after the write has returned.
		if (this.scheduler.isOwnWrite(await this.plugin.app.vault.read(file))) return;
		await this.scheduler.trigger("edit");
	}

	private resetInterval(): void {
		if (this.intervalId !== null) window.clearInterval(this.intervalId);
		this.intervalId = null;
		const minutes = this.plugin.settings.pantryAutoSyncMinutes;
		if (minutes <= 0) return;
		this.intervalId = window.setInterval(() => {
			if (this.authBlocked) return;
			void this.scheduler.trigger("interval");
		}, Math.max(1, minutes) * 60_000);
		this.plugin.registerInterval(this.intervalId);
	}

	private ensureStatusBar(): void {
		if (this.statusEl) return;
		this.statusEl = this.plugin.addStatusBarItem();
		this.statusEl.addClass("mod-clickable");
		this.statusEl.addEventListener("click", () => { void this.syncNow(); });
		// Keeps "synced 2 min ago" honest without a sync happening.
		this.statusTimerId = window.setInterval(() => this.renderStatus(), 60_000);
		this.plugin.registerInterval(this.statusTimerId);
		this.renderStatus();
	}

	private renderStatus(): void {
		if (!this.statusEl) return;
		if (this.failed) {
			this.statusEl.setText("Pantry: error");
		} else if (this.lastSyncAt === null) {
			this.statusEl.setText("Pantry: not synced yet");
		} else {
			const mins = Math.floor((Date.now() - this.lastSyncAt) / 60_000);
			this.statusEl.setText(mins < 1 ? "Pantry: synced just now" : `Pantry: synced ${mins} min ago`);
		}
	}

	async syncNow(): Promise<void> {
		this.lastManual = true;
		const ran = await this.scheduler.trigger("manual");
		if (!ran) new Notice("A sync is already running.");
	}

	private async runOnce(): Promise<void> {
		const manual = this.lastManual;
		this.lastManual = false;
		const { plugin } = this;
		const settings = plugin.settings;
		const config = pantryClientFromSettings(plugin.app, settings);
		if (!config) {
			this.failed = true;
			this.renderStatus();
			if (manual) new Notice("Sync is not set up yet. Fill in the integration settings first.");
			return;
		}

		const path = resolveNotePath(settings.groceryListPath);
		const stored = settings.state.pantryLinks;
		// A different list means different item ids, so old links would be wrong.
		const links = stored && stored.listId === settings.pantryListId ? stored.items : {};
		const parserOptions = ingredientParserOptions(settings);

		try {
			const result = await runSync({
				client: config.client,
				listId: settings.pantryListId,
				keyOf: (text) => {
					const parsed = parseIngredientLine(text, parserOptions);
					return parsed?.name ? ingredientKey(parsed.name, parsed.unit) : null;
				},
				splitText: (line) => splitQuantity(line, parserOptions),
				describe: (key) => describeSources(settings.state.groceryContributions[key]),
				links,
				note: {
					exists: () => plugin.app.vault.getFileByPath(path) !== null,
					read: async () => {
						const file = plugin.app.vault.getFileByPath(path);
						return file ? plugin.app.vault.read(file) : "";
					},
					process: async (fn) => {
						const file = plugin.app.vault.getFileByPath(path);
						if (!file) return;
						await plugin.app.vault.process(file, (current) => {
							const next = fn(current);
							this.scheduler.noteOwnWrite(next);
							return next;
						});
					},
				},
			});
			settings.state.pantryLinks = { listId: settings.pantryListId, items: result.links };
			await plugin.saveSettings();
			this.failed = false;
			this.authBlocked = false;
			this.lastSyncAt = Date.now();
			this.renderStatus();
			if (manual || result.failed > 0 || result.truncated) this.reportResult(result);
		} catch (err) {
			this.failed = true;
			this.renderStatus();
			if (err instanceof PantryError && err.kind === "auth") {
				this.authBlocked = true;
				new Notice("Pantry sign in failed. Check your app password.");
			} else if (manual && err instanceof PantryError) {
				new Notice(err.message);
			} else if (manual) {
				new Notice("Pantry sync failed. Nothing was changed.");
			}
		}
	}

	private reportResult(r: { created: number; updated: number; removed: number; failed: number; truncated: boolean }): void {
		const parts = [`${r.created} added`, `${r.updated} updated`, `${r.removed} removed`];
		let msg = `Pantry synced: ${parts.join(", ")}.`;
		if (r.failed > 0) msg += ` ${r.failed} could not be synced and will be tried again.`;
		if (r.truncated) msg += " Your Pantry list has more than 500 items, so only the first 500 were read.";
		new Notice(msg);
	}
}

