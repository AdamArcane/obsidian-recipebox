/**
 * Reads a recipe note into the shape the edit form works on: per-section
 * groups plus eligibility, original list style and a raw-text snapshot (for
 * conflict detection at save), and raw frontmatter values as strings.
 * Works from the RAW body (frontmatter stripped only), never the cleaned body
 * the view renders, because line positions must match the file on disk.
 */
import { ImportedGroup } from "../importer/recipe-extract-types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { stripFrontmatter } from "../parser/recipe-frontmatter-strip";
import { splitBodyAroundIngredients } from "../parser/recipe-ingredient-groups";
import { findValue } from "../parser/frontmatter-lookup";
import { getRecipeMetaAliases } from "../parser/recipe-meta-aliases";
import { resolveHeroImageValue } from "../parser/resolve-hero-image";
import { NUTRITION_FIELDS } from "../ui/recipe-view/nutrition-fields";
import { fmNutrient } from "../ui/recipe-view/frontmatter-read-helpers";
import { HEADING_RE, locateSection, sectionText, SectionSpan } from "./section-locate";
import { isListItem, isSectionEligible } from "./section-eligibility";
import { DEFAULT_STYLE, SectionStyle, stripMarker } from "./section-render";

export type SectionStatus = "eligible" | "ineligible" | "missing";

export interface LoadedSection {
	status: SectionStatus;
	groups: ImportedGroup[];
	style: SectionStyle;
	/** Exact section text at load; null when the section did not exist. */
	snapshot: string | null;
}

export interface LoadedNotes {
	present: boolean;
	/** Section content below the heading, verbatim, outer blank lines trimmed. */
	text: string;
	snapshot: string | null;
}

export interface EditableRecipe {
	isRecipeMd: boolean;
	ingredients: LoadedSection;
	steps: LoadedSection;
	notes: LoadedNotes;
	image: { value: string; /** False when the hero image comes from a body embed. */ editable: boolean };
	prepTime: string;
	cookTime: string;
	totalTime: string;
	servings: string;
	/** Raw stored values keyed by settingsKey (e.g. "caloriesProperty"). */
	nutrition: Record<string, string>;
}

const ORDERED_RE = /^\d+\.\s/;
const BULLET_RE = /^([-*+])\s/;

function rawString(fm: Record<string, unknown>, keys: string[]): string {
	const v = findValue(fm, keys);
	if (typeof v === "string") return v;
	if (typeof v === "number" && isFinite(v)) return String(v);
	return "";
}

// A section created from scratch takes the plugin's own conventions: steps
// numbered, ingredients bulleted.
function missingSection(ordered: boolean): LoadedSection {
	return { status: "missing", groups: [], style: { ...DEFAULT_STYLE, ordered }, snapshot: null };
}

function parseGroups(lines: string[], span: SectionSpan): ImportedGroup[] {
	const groups: ImportedGroup[] = [];
	let current: ImportedGroup = { name: null, items: [] };
	for (let i = span.headingIdx + 1; i < span.end; i++) {
		const heading = lines[i].match(HEADING_RE);
		if (heading) {
			if (current.name !== null || current.items.length > 0) groups.push(current);
			current = { name: heading[2].trim(), items: [], headingLevel: heading[1].length };
		} else if (isListItem(lines[i])) {
			current.items.push(stripMarker(lines[i]));
		}
	}
	if (current.name !== null || current.items.length > 0) groups.push(current);
	return groups;
}

function detectStyle(lines: string[], span: SectionSpan): SectionStyle {
	let bullet = "-";
	let bulletSeen = false;
	let ordered = false;
	for (let i = span.headingIdx + 1; i < span.end; i++) {
		if (ORDERED_RE.test(lines[i])) ordered = true;
		const b = lines[i].match(BULLET_RE);
		if (b && !bulletSeen) { bullet = b[1]; bulletSeen = true; }
	}
	return { bullet, ordered };
}

function loadListSection(lines: string[], heading: string, forceIneligible: boolean, orderedByDefault: boolean): LoadedSection {
	const span = locateSection(lines, heading);
	if (!span) return forceIneligible ? { ...missingSection(orderedByDefault), status: "ineligible" } : missingSection(orderedByDefault);
	const eligible = !forceIneligible && isSectionEligible(lines, span);
	return {
		status: eligible ? "eligible" : "ineligible",
		groups: eligible ? parseGroups(lines, span) : [],
		style: detectStyle(lines, span),
		snapshot: sectionText(lines, span),
	};
}

function loadNotes(lines: string[], heading: string): LoadedNotes {
	const span = locateSection(lines, heading);
	if (!span) return { present: false, text: "", snapshot: null };
	const content = lines.slice(span.headingIdx + 1, span.end);
	while (content.length > 0 && content[0].trim() === "") content.shift();
	while (content.length > 0 && content[content.length - 1].trim() === "") content.pop();
	return { present: true, text: content.join("\n"), snapshot: sectionText(lines, span) };
}

export function loadRecipeForEdit(
	raw: string,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
): EditableRecipe {
	// Same eol normalization apply-section-edits uses, so snapshots taken here
	// compare equal to what it sees inside vault.process.
	const body = stripFrontmatter(raw.replace(/\r\n/g, "\n"));
	const lines = body.split("\n");
	const aliases = getRecipeMetaAliases(settings);

	// RecipeMD keeps ingredients between thematic breaks and the method after;
	// neither maps onto heading spans, so both sections are off limits.
	const { isRecipeMd } = splitBodyAroundIngredients(body, settings.ingredientsHeading);

	const fmImage = findValue(frontmatter, aliases.image);
	const hasFmImage = typeof fmImage === "string" && fmImage.trim() !== "";
	const resolved = resolveHeroImageValue(frontmatter, body, settings);
	const image = hasFmImage
		? { value: fmImage.trim(), editable: true }
		// A body embed is the hero image: writing a frontmatter image too would
		// leave two competing sources, so the field is read-only in that case.
		: { value: resolved ?? "", editable: resolved === null };

	const nutrition: Record<string, string> = {};
	for (const field of NUTRITION_FIELDS) {
		const configuredKey = settings[field.settingsKey] as string;
		const lookupKeys = [configuredKey, ...field.aliases.filter((a) => a !== configuredKey)];
		const value = fmNutrient(frontmatter, lookupKeys);
		nutrition[field.settingsKey] = value === null ? "" : String(value);
	}

	return {
		isRecipeMd,
		ingredients: loadListSection(lines, settings.ingredientsHeading, isRecipeMd, false),
		steps: loadListSection(lines, settings.instructionsHeading, isRecipeMd, true),
		notes: loadNotes(lines, settings.notesHeading),
		image,
		prepTime: rawString(frontmatter, aliases.prepTime),
		cookTime: rawString(frontmatter, aliases.cookTime),
		totalTime: rawString(frontmatter, aliases.totalTime),
		servings: rawString(frontmatter, aliases.servings),
		nutrition,
	};
}
