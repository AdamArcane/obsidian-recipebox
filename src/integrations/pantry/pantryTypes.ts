/**
 * Pantry API shapes and the only place that knows how to read them. Every
 * parser returns null (or throws PantryError) on a shape we do not expect, so
 * a change in the young Pantry API fails a sync run instead of corrupting the note.
 */

export interface PantryHouse {
	id: number;
	name: string;
}

export interface PantryList {
	id: number;
	name: string;
}

export interface PantryCategory {
	id: number;
	name: string;
}

export interface PantryItem {
	id: number;
	name: string;
	/** Free text in Pantry. Treated as opaque. Empty string when unset. */
	quantity: string;
	done: boolean;
	categoryId: number | null;
	/** Soft deleted (in the Pantry trash). Treated as gone. */
	deleted: boolean;
	/** Archived items are ignored entirely by sync. */
	archived: boolean;
}

export type PantryErrorKind = "auth" | "network" | "shape" | "http" | "note";

export class PantryError extends Error {
	constructor(public kind: PantryErrorKind, message: string) {
		super(message);
		this.name = "PantryError";
	}
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSet(v: unknown): boolean {
	// Pantry timestamps are null when unset. Anything else non-empty counts as set.
	return v !== null && v !== undefined && v !== "" && v !== 0 && v !== false;
}

/**
 * OCS wraps payloads as { ocs: { meta, data } }. Throws a "shape" error when the
 * envelope is missing, which is what an XML or HTML error page looks like.
 */
export function unwrapOcs(body: unknown): unknown {
	if (!isRecord(body) || !isRecord(body.ocs) || !("data" in body.ocs)) {
		throw new PantryError("shape", "Pantry sent a reply this plugin does not understand.");
	}
	return body.ocs.data;
}

/**
 * Collection endpoints may return a bare array or an object holding one. The
 * real shape is unconfirmed until the server spike, so accept both.
 */
export function extractArray(data: unknown, ...keys: string[]): unknown[] {
	if (Array.isArray(data)) return data;
	if (isRecord(data)) {
		for (const key of keys) {
			const inner = data[key];
			if (Array.isArray(inner)) return inner;
		}
	}
	throw new PantryError("shape", "Pantry sent a list in a shape this plugin does not understand.");
}

function parseIdName(raw: unknown): { id: number; name: string } | null {
	if (!isRecord(raw)) return null;
	if (typeof raw.id !== "number" || typeof raw.name !== "string") return null;
	return { id: raw.id, name: raw.name };
}

export function parseHouse(raw: unknown): PantryHouse | null {
	return parseIdName(raw);
}

export function parseList(raw: unknown): PantryList | null {
	return parseIdName(raw);
}

export function parseCategory(raw: unknown): PantryCategory | null {
	return parseIdName(raw);
}

export function parseItem(raw: unknown): PantryItem | null {
	if (!isRecord(raw)) return null;
	if (typeof raw.id !== "number" || typeof raw.name !== "string") return null;
	return {
		id: raw.id,
		name: raw.name,
		quantity: typeof raw.quantity === "string" ? raw.quantity : "",
		done: raw.done === true,
		categoryId: typeof raw.categoryId === "number" ? raw.categoryId : null,
		deleted: isSet(raw.deletedAt),
		archived: isSet(raw.archivedAt),
	};
}

/** Parses a whole collection and fails the run if any element is malformed. */
export function parseAll<T>(rows: unknown[], parse: (raw: unknown) => T | null): T[] {
	return rows.map((row) => {
		const parsed = parse(row);
		if (!parsed) throw new PantryError("shape", "Pantry sent an entry this plugin does not understand.");
		return parsed;
	});
}
