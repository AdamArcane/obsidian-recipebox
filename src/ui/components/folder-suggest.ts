/**
 * Autocomplete suggest widget for vault folder paths, used in settings text inputs.
 */
import { AbstractInputSuggest, App, TFolder } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, private readonly input: HTMLInputElement) {
		super(app, input);
	}

	getSuggestions(query: string): TFolder[] {
		const lower = query.toLowerCase();
		const folders: TFolder[] = [];
		this.app.vault.getAllFolders().forEach((f) => {
			if (f.path.toLowerCase().includes(lower)) folders.push(f);
		});
		return folders.slice(0, 20);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.createSpan({ text: folder.path || "/" });
	}

	selectSuggestion(folder: TFolder): void {
		this.input.value = folder.path;
		this.input.dispatchEvent(new Event("input"));
		this.close();
	}
}
