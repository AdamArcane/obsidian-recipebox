/**
 * Triggers a browser/OS download for text content that isn't vault content
 * (JSON, JSON-LD, eventually PDF/zip bundles). Obsidian's plugin API has no
 * native save-file dialog and Electron's dialog.showSaveDialog() is off the
 * table since the manifest supports mobile -- Blob + object URL + a
 * programmatic <a download> click is the standard web-platform fallback that
 * works in Obsidian's Electron desktop shell.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = activeDocument.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
