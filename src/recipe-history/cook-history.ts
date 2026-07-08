/**
 * Manages a recipe's cook history as structured frontmatter data.
 *
 * The frontmatter array (settings.cookHistoryFrontmatterProperty) is the
 * single source of truth for date and note. It is fully queryable by
 * Dataview today and by Bases once Bases supports nested array properties.
 *
 * The note-body section (## {settings.cookHistoryHeading}) is a disposable
 * render generated from that frontmatter array. It is rebuilt in full on
 * every add/edit/delete and must never be hand-edited by the user, since
 * any manual edit is silently overwritten on the next write.
 *
 * Each entry has a stable `id`, separate from its date, because the date is
 * itself an editable field. Matching entries by date would break (or worse,
 * silently collide with an unrelated entry) the moment a user edits an
 * entry's date to a value another entry already has. All lookups, edits, and
 * deletes are keyed by id.
 *
 * Photos are intentionally NOT stored in frontmatter. A plain path or
 * filename string in frontmatter is invisible to Obsidian's link engine,
 * so it would not get rename tracking and would falsely show up as an
 * orphaned attachment if the user renamed the image outside the plugin.
 * Instead, each entry's photo lives only as a real ![[filename]] embed in
 * the regenerated note body, where Obsidian's own link engine keeps it
 * correct across renames for free. The photo for a given entry is found
 * by reading the existing note body and matching on id (encoded as an
 * HTML comment marker on the entry's line, since markdown bullets have no
 * other place to carry a hidden identifier).
 */
import { App, TFile } from "obsidian";
import { findValue } from "../parser/frontmatter-lookup";
import { RecipeBoxSettings } from "../settings/settings-types";
import { RECIPE_FRONTMATTER } from "../settings/frontmatter-keys";
import { CookedImageResult } from "../ui/recipe-view/recipe-view-deps";
import { generateEntryId } from "../utils/date";

/** A single cook history entry as stored in frontmatter. Photo is deliberately excluded; see file header. */
export interface CookHistoryEntry {
	id: string;
	date: string;
	note: string;
}

/** A cook history entry enriched with the photo embed resolved from the note body, for display only. Never persisted as-is. */
export interface CookHistoryEntryWithPhoto extends CookHistoryEntry {
	/** Embed target (filename as written in the ![[...]] embed), or null if this entry has no photo. */
	photoEmbed: string | null;
}

const HISTORY_IMAGE_WIDTH = 200;

// Written immediately under the heading on every regeneration, so anyone
// opening the note in source mode sees a warning before they consider
// hand-editing this section. The exact wording isn't matched on read; this
// is purely informational and gets rewritten verbatim every time anyway.
const MANAGED_SECTION_NOTICE = "<!-- This section managed by the Recipe Box plugin. Manual edits will be overwritten. -->";

// Matches a heading line of 1-6 #'s, used to find the cook history section
// and to detect where it ends (the next heading at any level).
const HEADING_RE = /^(#{1,6})\s+(.+)/;

// Matches one rendered entry line, e.g.
// "- **2026-06-29:** Added extra garlic <!--rb-id:abc123-->"
// Group 1 is the date, group 2 is the note text, group 3 is the entry id.
const ENTRY_LINE_RE = /^\s*-\s+\*\*([^*]+)\*\*:?\s*(.*?)\s*<!--rb-id:([a-zA-Z0-9-]+)-->\s*$/;

// Matches an embed anywhere on a line, used to recover the photo for an entry
// when re-reading the previously-rendered section. Captures only the link
// target, not any |size or |alt-text suffix Obsidian allows after a pipe
// (e.g. ![[file.png|200]] must resolve to "file.png", not "file.png|200",
// or getFirstLinkpathDest fails to find the file).
const EMBED_RE = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/;

/** Reads the cookHistory array from frontmatter, in stored order (writer keeps newest-first; sort explicitly if a specific order matters). */
export function readCookHistory(app: App, file: TFile, settings: RecipeBoxSettings): CookHistoryEntry[] {
	const fm = (app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
	const prop = settings.cookHistoryFrontmatterProperty;
	const raw = findValue(fm, [prop]);
	if (!Array.isArray(raw)) return [];

	const entries: CookHistoryEntry[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const rec = item as Record<string, unknown>;
		const date = typeof rec.date === "string" ? rec.date : null;
		if (!date) continue;
		const id = typeof rec.id === "string" && rec.id ? rec.id : generateEntryId();
		const note = typeof rec.note === "string" ? rec.note : "";
		entries.push({ id, date, note });
	}
	return entries;
}

/** Reads the existing note-body section and extracts the photo embed for a given entry id, if one exists. Used when editing an entry, so the edit modal can pre-fill "this entry already has a photo." */
export async function getExistingPhotoForId(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	id: string,
): Promise<string | null> {
	const withPhotos = await readNoteBodyEntriesWithPhotos(app, file, settings);
	return withPhotos.find(e => e.id === id)?.photoEmbed ?? null;
}

/**
 * Parses the existing ## Cook History section out of the note body and
 * returns each entry with its photo embed, matched by the hidden id marker
 * written into each line. This is the one place the plugin still reads
 * note-body markdown as data rather than treating it as pure display output,
 * because the photo embed has nowhere else to live (see file header).
 *
 * Entries with no recognizable id marker (e.g. a user manually added a line,
 * which is unsupported but shouldn't crash anything) are skipped here; they
 * are simply overwritten on the next regeneration along with everything else
 * in the section.
 */
export async function readNoteBodyEntriesWithPhotos(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
): Promise<CookHistoryEntryWithPhoto[]> {
	const content = await app.vault.read(file);
	const lines = content.split("\n");
	const heading = `## ${settings.cookHistoryHeading}`.trim().toLowerCase();

	let inSection = false;
	let sectionLevel = 0;
	const results: CookHistoryEntryWithPhoto[] = [];
	let current: CookHistoryEntryWithPhoto | null = null;

	for (const line of lines) {
		const hMatch = line.match(HEADING_RE);
		if (hMatch) {
			const level = hMatch[1].length;
			const name = `${"#".repeat(level)} ${hMatch[2].trim()}`.toLowerCase();
			if (!inSection && name === heading) {
				inSection = true;
				sectionLevel = level;
				continue;
			}
			if (inSection && level <= sectionLevel) break;
		}

		if (!inSection) continue;

		const entryMatch = line.match(ENTRY_LINE_RE);
		if (entryMatch) {
			if (current) results.push(current);
			current = { id: entryMatch[3], date: entryMatch[1].trim(), note: entryMatch[2].trim(), photoEmbed: null };
			continue;
		}

		if (current) {
			const embedMatch = line.match(EMBED_RE);
			if (embedMatch && !current.photoEmbed) current.photoEmbed = embedMatch[1];
		}
	}
	if (current) results.push(current);
	return results;
}

async function saveUploadedImage(app: App, recipeFile: TFile, filename: string, data: ArrayBuffer): Promise<TFile | null> {
	try {
		const attachPath = await (app.fileManager as unknown as {
			getAvailablePathForAttachment: (name: string, sourcePath: string) => Promise<string>;
		}).getAvailablePathForAttachment(filename, recipeFile.path);
		return await app.vault.createBinary(attachPath, data);
	} catch {
		// Fallback: write alongside the recipe file if attachment path resolution fails
		const dir = recipeFile.parent?.path ?? "";
		const fallbackPath = dir ? `${dir}/${filename}` : filename;
		try {
			return await app.vault.createBinary(fallbackPath, data);
		} catch {
			return null;
		}
	}
}

async function resolveImage(app: App, recipeFile: TFile, image: CookedImageResult): Promise<TFile | null> {
	if (image.kind === "vault-file") return image.file;
	return saveUploadedImage(app, recipeFile, image.filename, image.data);
}

/**
 * Renders the full note-body section markdown from the frontmatter entries
 * plus each entry's photo embed (read separately, since photo is not in
 * frontmatter). Entries are rendered in the order given by `entries`, so
 * callers control sort order by sorting before calling this. Each line
 * carries a hidden id marker so a future read can match it back to its
 * frontmatter entry.
 */
function renderSection(entries: CookHistoryEntry[], photosById: Map<string, string | null>): string {
	const lines: string[] = [];
	for (const entry of entries) {
		const noteText = entry.note.trim();
		const marker = `<!--rb-id:${entry.id}-->`;
		const firstLine = noteText
			? `- **${entry.date}:** ${noteText} ${marker}`
			: `- **${entry.date}:** ${marker}`;
		const photo = photosById.get(entry.id) ?? null;
		lines.push(firstLine);
		if (photo) lines.push(`  ![[${photo}|${HISTORY_IMAGE_WIDTH}]]`);
	}
	return lines.join("\n");
}

/** Replaces the entire ## Cook History section in the note body with freshly rendered content, or appends the heading if it doesn't exist yet. The managed-section notice is written unconditionally, even when renderedBody is empty, so the warning is visible as soon as the section exists. */
async function replaceNoteBodySection(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	renderedBody: string,
): Promise<void> {
	const heading = `## ${settings.cookHistoryHeading}`;
	const sectionContent = renderedBody ? `${MANAGED_SECTION_NOTICE}\n${renderedBody}` : MANAGED_SECTION_NOTICE;
	await app.vault.process(file, (content) => {
		const lines = content.split("\n");
		const headingIdx = lines.findIndex((l) => l.trim() === heading);

		if (headingIdx < 0) {
			const trimmed = content.trimEnd();
			return `${trimmed}\n\n${heading}\n${sectionContent}\n`;
		}

		let endIdx = headingIdx + 1;
		while (endIdx < lines.length && !HEADING_RE.test(lines[endIdx])) endIdx++;

		const before = lines.slice(0, headingIdx + 1);
		const after = lines.slice(endIdx);
		return [...before, sectionContent, ...after].join("\n");
	});
}

/**
 * Writes the cookHistory array to frontmatter, replacing it entirely, and
 * also derives and writes lastMade/cookedCount from that same array, so the
 * two summary fields never go stale when entries are added, edited, or
 * deleted directly through the cook history modal rather than through the
 * "Mark as cooked" button. 
 */
async function writeFrontmatterEntries(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	entries: CookHistoryEntry[],
): Promise<void> {
	if (!settings.cookHistoryEnabled) return;

	const prop = settings.cookHistoryFrontmatterProperty;
	await app.fileManager.processFrontMatter(file, (fm) => {
		const f = fm as Record<string, unknown>;
		f[prop] = entries.map(e => ({ id: e.id, date: e.date, note: e.note }));

		// Entries are already sorted newest-first by the caller, but derive
		// defensively by max rather than assuming index 0, in case that changes.
		const latest = entries.reduce<string | null>(
			(max, e) => (max === null || e.date > max ? e.date : max),
			null,
		);
		if (latest !== null) f[settings.lastMadeProperty] = latest;
		else delete f[settings.lastMadeProperty];

		if (entries.length > 0) f[RECIPE_FRONTMATTER.cookedCount] = entries.length;
		else delete f[RECIPE_FRONTMATTER.cookedCount];

	});
}

/**
 * Core sync operation: given the full desired list of entries and a map of
 * photo embeds by entry id, writes frontmatter (cookHistory plus derived
 * lastMade/cookedCount) and regenerates the note body section together so
 * they can never drift, since there is exactly one write path for all of it.
 *
 * Returns the sorted entries that were written, so callers can render
 * immediately from this known-correct value instead of re-reading
 * app.metadataCache, which updates asynchronously after processFrontMatter
 * resolves and is not guaranteed to reflect this write yet on the very next
 * tick (this was the cause of the cook history modal briefly showing "no
 * history" right after an add/edit before the cache caught up).
 */
async function syncHistory(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	entries: CookHistoryEntry[],
	photosById: Map<string, string | null>,
): Promise<CookHistoryEntry[]> {
	// Newest-first, matching the previous flat-array behavior.
	const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
	await writeFrontmatterEntries(app, file, settings, sorted);
	const rendered = renderSection(sorted, photosById);
	await replaceNoteBodySection(app, file, settings, rendered);
	return sorted;
}

/** Adds a new cook history entry. Resolves/saves the image if provided, then rewrites frontmatter and the note body together. Returns the full, newly-sorted entry list as written, so callers can render immediately without re-reading the metadata cache. */
export async function addCookHistoryEntry(
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	date: string,
	note: string,
	image: CookedImageResult | null,
): Promise<CookHistoryEntry[]> {
	const existing = readCookHistory(app, recipeFile, settings);
	const existingWithPhotos = await readNoteBodyEntriesWithPhotos(app, recipeFile, settings);
	const photosById = new Map(existingWithPhotos.map(e => [e.id, e.photoEmbed]));

	const newEntry: CookHistoryEntry = { id: generateEntryId(), date, note: note.trim() };
	const imageFile = image ? await resolveImage(app, recipeFile, image) : null;
	if (imageFile) photosById.set(newEntry.id, imageFile.name);

	return syncHistory(app, recipeFile, settings, [...existing, newEntry], photosById);
}

/**
 * Edits an existing entry identified by its stable id. If image is
 * undefined, the existing photo (if any) is preserved; pass null explicitly
 * to remove it, or a CookedImageResult to replace it. Returns the full,
 * newly-sorted entry list as written.
 */
export async function editCookHistoryEntry(
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	id: string,
	date: string,
	note: string,
	image: CookedImageResult | null | undefined,
): Promise<CookHistoryEntry[]> {
	const existing = readCookHistory(app, recipeFile, settings);
	const existingWithPhotos = await readNoteBodyEntriesWithPhotos(app, recipeFile, settings);
	const photosById = new Map(existingWithPhotos.map(e => [e.id, e.photoEmbed]));

	let resolvedPhoto = photosById.get(id) ?? null;
	if (image === null) {
		resolvedPhoto = null;
	} else if (image) {
		const imageFile = await resolveImage(app, recipeFile, image);
		if (imageFile) resolvedPhoto = imageFile.name;
	}
	photosById.set(id, resolvedPhoto);

	const updated = existing.map(e => (e.id === id ? { id, date, note: note.trim() } : e));
	return syncHistory(app, recipeFile, settings, updated, photosById);
}

/** Removes a single entry by id. The corresponding photo embed, if any, is simply not re-rendered; the image file itself is left untouched in the vault. Returns the full, newly-sorted entry list as written (without the deleted entry). */
export async function deleteCookHistoryEntry(
	app: App,
	recipeFile: TFile,
	settings: RecipeBoxSettings,
	id: string,
): Promise<CookHistoryEntry[]> {
	const existing = readCookHistory(app, recipeFile, settings).filter(e => e.id !== id);
	const existingWithPhotos = await readNoteBodyEntriesWithPhotos(app, recipeFile, settings);
	const photosById = new Map(
		existingWithPhotos.filter(e => e.id !== id).map(e => [e.id, e.photoEmbed]),
	);
	return syncHistory(app, recipeFile, settings, existing, photosById);
}
