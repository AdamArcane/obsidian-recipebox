/**
 * Turns picked File objects into FileEntry lists, expanding zips with fflate
 * (Obsidian exposes no zip API). Whole files are held in memory, so a soft
 * size warning is raised for very large zips instead of streaming.
 */
import { unzipSync } from "fflate";
import type { FileEntry, ImportProblem } from "./file-import-types";

/** Above this, a zip is still read but the user is warned it may be slow on mobile. */
export const LARGE_ZIP_BYTES = 100 * 1024 * 1024;

export interface ReadResult {
	entries: FileEntry[];
	problems: ImportProblem[];
	warnings: string[];
}

// Mealie's full backup is a version-coupled database dump, not a stable import
// target, so it is rejected up front with a pointer to the supported export.
const FULL_BACKUP_MESSAGE =
	"This looks like a Mealie full backup, which can't be imported. Export individual recipes, or use Data Management > Export, instead.";

function isJunkEntry(path: string): boolean {
	return path.endsWith("/") || path.startsWith("__MACOSX/") || path.split("/").some(seg => seg.startsWith("."));
}

export function expandZip(zipName: string, bytes: Uint8Array): { entries: FileEntry[]; problem: string | null } {
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(bytes);
	} catch {
		return { entries: [], problem: "Could not read this zip file." };
	}
	const paths = Object.keys(files).filter(p => !isJunkEntry(p));
	if (paths.some(p => p.split("/").pop() === "database.json")) {
		return { entries: [], problem: FULL_BACKUP_MESSAGE };
	}
	return {
		entries: paths.map(p => ({ path: `${zipName}/${p}`, bytes: files[p], fromZip: true })),
		problem: null,
	};
}

export async function readPickedFiles(files: File[]): Promise<ReadResult> {
	const result: ReadResult = { entries: [], problems: [], warnings: [] };
	for (const file of files) {
		const lower = file.name.toLowerCase();
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			if (lower.endsWith(".zip")) {
				if (bytes.length > LARGE_ZIP_BYTES) {
					result.warnings.push(`${file.name} is large (over 100 MB). Reading it may be slow, especially on mobile.`);
				}
				const { entries, problem } = expandZip(file.name, bytes);
				if (problem) result.problems.push({ label: file.name, reason: problem });
				result.entries.push(...entries);
			} else if (lower.endsWith(".json")) {
				result.entries.push({ path: file.name, bytes, fromZip: false });
			} else {
				result.problems.push({ label: file.name, reason: "Only .json and .zip files are supported." });
			}
		} catch {
			result.problems.push({ label: file.name, reason: "Could not read this file." });
		}
	}
	return result;
}
