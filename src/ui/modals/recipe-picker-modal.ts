/**
 * Modal for picking a recipe from the vault or entering a custom meal name.
 * Shows a search input; results include an optional custom-meal row at position 0
 * (when input is non-empty) followed by up to 7 fuzzy-matched recipe rows.
 */
import { App, TFile, prepareFuzzySearch, setIcon } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { isRecipeFile } from "../../lifecycle/recipe-file-detection";
import { BaseModal } from "./modal-shell";
import { findValue } from "../../parser/frontmatter-lookup";
import { getRecipeMetaAliases } from "../../parser/recipe-meta-aliases";

const MAX_RESULTS = 7;

function getThumbnailSrc(app: App, file: TFile, settings: RecipeBoxSettings): string | null {
	const fm = (app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
	const imageValue = findValue(fm, getRecipeMetaAliases(settings).image);
	if (typeof imageValue !== "string" || !imageValue) return null;

	if (/^https?:\/\//i.test(imageValue)) return imageValue;

	const bare = imageValue.replace(/^!?\[\[(.+?)(?:\|.*)?\]\]$/, "$1").trim();
	const resolved = app.metadataCache.getFirstLinkpathDest(bare, "");
	if (resolved instanceof TFile) return app.vault.getResourcePath(resolved);

	const byPath = app.vault.getFileByPath(bare);
	if (byPath instanceof TFile) return app.vault.getResourcePath(byPath);

	return null;
}

export class RecipePickerModal extends BaseModal {
	private query = "";
	private resultsEl!: HTMLElement;
	private highlighted = -1;
	// rows[0] is the custom meal row when visible; recipe rows follow
	private rows: HTMLElement[] = [];
	private filteredFiles: TFile[] = [];

	constructor(
		app: App,
		private readonly settings: RecipeBoxSettings,
		private readonly day: string | undefined,
		private readonly onSelectRecipe: (file: TFile, day: string | undefined) => void,
		private readonly onSelectCustom: (label: string, day: string | undefined) => void,
	) {
		super(app);
	}

	getTitle(): string { return `Add to ${this.day ?? "Queue"}`; }
	getIcon(): string { return "calendar-plus"; }
	getContentClasses(): string[] { return ["rb-recipe-picker-modal"]; }

	renderBody(bodyEl: HTMLElement): void {
		const input = bodyEl.createEl("input", {
			cls: "rb-recipe-picker-input",
			attr: { type: "text", placeholder: "Search recipes or enter a meal name..." },
		});

		this.resultsEl = bodyEl.createDiv({ cls: "rb-recipe-picker-results" });

		input.addEventListener("input", () => {
			this.query = input.value;
			this.renderResults();
		});

		input.addEventListener("keydown", (e) => {
			if (e.key === "ArrowDown") { e.preventDefault(); this.moveHighlight(1); }
			else if (e.key === "ArrowUp") { e.preventDefault(); this.moveHighlight(-1); }
			else if (e.key === "Enter") { e.preventDefault(); this.selectHighlighted(); }
		});

		this.renderResults();
		window.requestAnimationFrame(() => input.focus());
	}

	renderFooter(footerEl: HTMLElement): void {
		footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
			.addEventListener("click", () => this.close());
	}

	private renderResults(): void {
		this.resultsEl.empty();
		this.rows = [];
		this.highlighted = -1;

		const allFiles = this.app.vault.getMarkdownFiles().filter(
			(f) => isRecipeFile(this.app, f, this.settings)
		);

		if (this.query.trim()) {
			const fuzzy = prepareFuzzySearch(this.query.trim());
			this.filteredFiles = allFiles.filter((f) => fuzzy(f.basename) !== null).slice(0, MAX_RESULTS);
		} else {
			this.filteredFiles = allFiles.slice(0, MAX_RESULTS);
		}

		// Custom meal row — only when input is non-empty
		if (this.query.trim()) {
			const customRow = this.resultsEl.createDiv({ cls: "rb-recipe-picker-item rb-recipe-picker-item--custom" });
			const thumb = customRow.createDiv({ cls: "rb-recipe-picker-thumb rb-recipe-picker-thumb--custom" });
			setIcon(thumb, "utensils");
			const text = customRow.createDiv({ cls: "rb-recipe-picker-text" });
			text.createDiv({ cls: "rb-recipe-picker-name", text: `Add "${this.query}" as a custom meal` });
			customRow.addEventListener("mouseenter", () => this.setHighlight(0));
			customRow.addEventListener("click", () => this.selectCustom());
			this.rows.push(customRow);
		}

		for (let i = 0; i < this.filteredFiles.length; i++) {
			const file = this.filteredFiles[i];
			const row = this.resultsEl.createDiv({ cls: "rb-recipe-picker-item" });

			const thumb = row.createDiv({ cls: "rb-recipe-picker-thumb" });
			const src = getThumbnailSrc(this.app, file, this.settings);
			if (src) {
				const img = thumb.createEl("img", { attr: { src, loading: "lazy" } });
				img.onerror = () => { img.remove(); thumb.addClass("rb-recipe-picker-thumb--empty"); };
			} else {
				thumb.addClass("rb-recipe-picker-thumb--empty");
			}

			const text = row.createDiv({ cls: "rb-recipe-picker-text" });
			text.createDiv({ cls: "rb-recipe-picker-name", text: file.basename });
			const folder = file.parent?.path ?? "";
			if (folder && folder !== "/") {
				text.createDiv({ cls: "rb-recipe-picker-folder", text: folder });
			}

			const rowIdx = this.rows.length;
			row.addEventListener("mouseenter", () => this.setHighlight(rowIdx));
			row.addEventListener("click", () => this.selectRecipe(file));
			this.rows.push(row);
		}
	}

	private setHighlight(idx: number): void {
		this.rows[this.highlighted]?.removeClass("rb-recipe-picker-item--highlighted");
		this.highlighted = idx;
		this.rows[this.highlighted]?.addClass("rb-recipe-picker-item--highlighted");
		this.rows[this.highlighted]?.scrollIntoView({ block: "nearest" });
	}

	private moveHighlight(delta: number): void {
		const next = Math.max(0, Math.min(this.rows.length - 1, this.highlighted + delta));
		this.setHighlight(next);
	}

	private selectHighlighted(): void {
		if (this.highlighted < 0 || this.rows.length === 0) return;
		// Row 0 is custom when query is non-empty; otherwise all rows are recipe rows
		if (this.query.trim() && this.highlighted === 0) {
			this.selectCustom();
		} else {
			const fileIdx = this.query.trim() ? this.highlighted - 1 : this.highlighted;
			const file = this.filteredFiles[fileIdx];
			if (file) this.selectRecipe(file);
		}
	}

	private selectRecipe(file: TFile): void {
		this.onSelectRecipe(file, this.day);
		this.close();
	}

	private selectCustom(): void {
		this.onSelectCustom(this.query.trim(), this.day);
		this.close();
	}
}
