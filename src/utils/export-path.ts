/**
 * Builds vault paths under the shared export folder. Blank and "/" both mean
 * the vault root, because the native folder picker may save either for root.
 */
export function normalizeExportFolder(folder: string): string {
	return folder.trim().replace(/^\/+|\/+$/g, "");
}

export function joinExportPath(folder: string, name: string): string {
	const dir = normalizeExportFolder(folder);
	return dir ? `${dir}/${name}` : name;
}
