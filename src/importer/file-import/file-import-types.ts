/**
 * Shared types for the file import pipeline (read, group, detect, convert, write).
 * Pure type definitions; nothing here may import from obsidian.
 */
export type ImportFormat = "mealie" | "schema-org";

export interface FileEntry {
	/** Zip entries are prefixed with the zip's name so two zips never share a folder. */
	path: string;
	bytes: Uint8Array;
	/** True for entries expanded from a zip. Only these may pick up sibling images. */
	fromZip: boolean;
}

export interface ImageAsset {
	path: string;
	bytes: Uint8Array;
}

/** One recipe's worth of input: parsed JSON plus an optional bundled image. */
export interface ImportUnit {
	/** Display name for the summary: the file path, with "#n" when a file holds several recipes. */
	label: string;
	data: unknown;
	image: ImageAsset | null;
	format: ImportFormat | null;
}

/** Something that could not become an ImportUnit, reported with its reason. */
export interface ImportProblem {
	label: string;
	reason: string;
}

export type ConflictPolicy = "skip" | "keep-both";

export type ImportUnitStatus = "imported" | "skipped" | "failed";

export interface ImportUnitResult {
	label: string;
	status: ImportUnitStatus;
	title?: string;
	path?: string;
	reason?: string;
	warnings: string[];
}
