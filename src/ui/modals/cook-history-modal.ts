/**
 * Modal that reads and displays a recipe's cook history entries from the note
 * body, rendering dates, notes, and embedded photos with lightbox support.
 */
import { App, Component, MarkdownRenderer, Modal, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { attachLightboxToImages } from "../components/lightbox";

interface NoteEntry {
	date: string;
	notes: string;
	imageEmbed: string | null;
}

const ENTRY_RE = /^\s*-\s+\*\*([^*]+)\*\*:?\s*(.*)/;
const EMBED_RE = /!\[\[([^\]]+)\]\]/;
const HEADING_RE = /^(#{1,6})\s+(.+)/;

function parseNoteSection(content: string, heading: string): NoteEntry[] {
	const lines = content.split("\n");
	const target = heading.trim().toLowerCase();
	let inSection = false;
	let sectionLevel = 0;
	const entries: NoteEntry[] = [];
	let current: NoteEntry | null = null;

	for (const line of lines) {
		const hMatch = line.match(HEADING_RE);
		if (hMatch) {
			const level = hMatch[1].length;
			const name = hMatch[2].trim().toLowerCase();
			if (!inSection && name === target) {
				inSection = true;
				sectionLevel = level;
				continue;
			}
			if (inSection && level <= sectionLevel) break;
		}

		if (!inSection) continue;

		const entryMatch = line.match(ENTRY_RE);
		if (entryMatch) {
			if (current) entries.push(current);
			const rest = entryMatch[2].trim();
			const embedMatch = rest.match(EMBED_RE);
			current = {
				date: entryMatch[1].trim(),
				notes: embedMatch ? rest.replace(EMBED_RE, "").trim() : rest,
				imageEmbed: embedMatch ? embedMatch[1] : null,
			};
		} else if (current && line.trim()) {
			const embedMatch = line.match(EMBED_RE);
			if (embedMatch && !current.imageEmbed) {
				current.imageEmbed = embedMatch[1];
			}
		}
	}

	if (current) entries.push(current);
	return entries;
}

export class CookHistoryModal extends Modal {
	private recipeFile: TFile;
	private settings: RecipeBoxSettings;
	private editAsMarkdown: (path: string) => void;

	constructor(app: App, recipeFile: TFile, settings: RecipeBoxSettings, editAsMarkdown: (path: string) => void) {
		super(app);
		this.recipeFile = recipeFile;
		this.settings = settings;
		this.editAsMarkdown = editAsMarkdown;
	}

	onOpen(): void {
		this.titleEl.setText(`Cook history — ${this.recipeFile.basename}`);
		this.contentEl.addClass("rb-ch-modal");
		this.contentEl.createDiv({ cls: "rb-ch-loading", text: "Loading…" });
		void this.loadContent();
	}

	private async loadContent(): Promise<void> {
		const storage = this.settings.cookHistoryStorage ?? "note";
		const content = storage !== "frontmatter" ? await this.app.vault.read(this.recipeFile) : null;
		const fm = this.app.metadataCache.getFileCache(this.recipeFile)?.frontmatter ?? {};

		const noteEntries: NoteEntry[] = content
			? parseNoteSection(content, this.settings.cookHistoryHeading)
			: [];

		const fmProp = this.settings.cookHistoryFrontmatterProperty;
		const fmDates: string[] = storage !== "note" && Array.isArray(fm[fmProp])
			? (fm[fmProp] as string[])
			: [];

		const noteDateSet = new Set(noteEntries.map(e => e.date));
		const fmOnlyDates = fmDates.filter(d => !noteDateSet.has(d));

		this.contentEl.empty();
		this.contentEl.addClass("rb-ch-modal");

		if (noteEntries.length === 0 && fmDates.length === 0) {
			this.contentEl.createDiv({ cls: "rb-ch-empty", text: "No cook history entries yet." });
		} else {
			const list = this.contentEl.createDiv({ cls: "rb-ch-entry-list" });
			for (const entry of noteEntries) {
				await this.renderEntry(list, entry);
			}

			if (fmOnlyDates.length > 0) {
				const fmSection = this.contentEl.createDiv({ cls: "rb-ch-fm-section" });
				fmSection.createDiv({ cls: "rb-ch-fm-title", text: "Additional frontmatter dates" });
				const chips = fmSection.createDiv({ cls: "rb-ch-fm-chips" });
				for (const d of fmOnlyDates) {
					chips.createSpan({ cls: "rb-ch-fm-chip", text: d });
				}
			}
		}

		const footer = this.contentEl.createDiv({ cls: "rb-ch-footer" });
		const editBtn = footer.createEl("button", { cls: "rb-ch-edit-btn" });
		const iconSpan = editBtn.createSpan({ cls: "rb-ch-edit-icon" });
		setIcon(iconSpan, "pencil");
		editBtn.createSpan({ text: "Edit in note" });
		editBtn.addEventListener("click", () => {
			this.close();
			this.editAsMarkdown(this.recipeFile.path);
		});
	}

	private async renderEntry(container: HTMLElement, entry: NoteEntry): Promise<void> {
		const el = container.createDiv({ cls: "rb-ch-entry" });
		el.createDiv({ cls: "rb-ch-entry-date", text: entry.date });
		let markdown = entry.notes ?? "";
		if (entry.imageEmbed) markdown += `\n\n![[${entry.imageEmbed}]]`;
		if (markdown.trim()) {
			const body = el.createDiv({ cls: "rb-ch-entry-body" });
			await MarkdownRenderer.render(this.app, markdown.trim(), body, this.recipeFile.path, this as unknown as Component);
			attachLightboxToImages(body);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
