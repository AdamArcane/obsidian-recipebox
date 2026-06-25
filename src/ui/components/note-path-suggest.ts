/**
 * Autocomplete suggest widget for vault Markdown file paths, used in settings
 * text inputs where a note path is required.
 */
import { AbstractInputSuggest, App, TFile } from "obsidian";

export class NotePathSuggest extends AbstractInputSuggest<TFile> {
	constructor(app: App, private readonly input: HTMLInputElement) {
		super(app, input);
	}

	getSuggestions(query: string): TFile[] {
		const lower = query.toLowerCase();
		return this.app.vault.getMarkdownFiles().filter((f) =>
			f.path.toLowerCase().includes(lower)
		).slice(0, 20);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createSpan({ text: file.path });
	}

	selectSuggestion(file: TFile): void {
		this.input.value = file.path;
		this.input.dispatchEvent(new Event("input"));
		this.close();
	}
}
