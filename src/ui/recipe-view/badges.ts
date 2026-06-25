/**
 * Renders the configurable header badge row in the recipe view, evaluating
 * badge formulas, formatting values, and supporting separator/newline badge types.
 */
import { setIcon } from "obsidian";
import { CustomBadge, BadgeType } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { stripWikilink } from "../../utils/wikilink-strip";
import { formatMinutes } from "../../parser/recipe-meta-read";
import { findValue } from "../../parser/frontmatter-lookup";
import { ALIASES } from "../../parser/recipe-meta-aliases";
import { evaluateExpr } from "../../utils/expr-eval";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeValue(raw: unknown, valueType: string): string | null {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === "boolean") return raw ? "" : null;
	if (valueType === "minutes" && typeof raw === "number") return formatMinutes(raw);
	if (typeof raw !== "string" && typeof raw !== "number") return null;
	const str = String(raw);
	if (DATE_RE.test(str.trim())) {
		const d = new Date(str.trim() + "T00:00:00");
		return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { dateStyle: "medium" });
	}
	return stripWikilink(str);
}

function resolvePropertyValue(property: string, fm: Record<string, unknown>): unknown {
	const aliasEntry = Object.entries(ALIASES).find(
		([canonical, variants]) =>
			canonical.toLowerCase() === property.toLowerCase() ||
			variants.some((v) => v.toLowerCase() === property.toLowerCase()),
	);
	if (aliasEntry) return findValue(fm, [aliasEntry[0], ...aliasEntry[1]]);
	return findValue(fm, [property]);
}

function resolveBadgeValues(badge: CustomBadge, fm: Record<string, unknown>): string[] {
	if (badge.formula) {
		try {
			const result = evaluateExpr(badge.formula, fm);
			if (result === null || result === undefined) return [];
			const normalized = normalizeValue(result, badge.valueType);
			return normalized !== null ? [normalized] : [];
		} catch {
			return [];
		}
	}
	const raw = resolvePropertyValue(badge.property, fm);
	if (raw === null || raw === undefined) return [];
	if (typeof raw === "boolean") return raw ? [""] : [];

	if (Array.isArray(raw)) {
		if (badge.splitArray) {
			return raw.map(v => normalizeValue(v, badge.valueType)).filter((v): v is string => v !== null);
		}
		const joined = raw.map(v => normalizeValue(v, badge.valueType)).filter((v): v is string => v !== null).join(", ");
		return joined ? [joined] : [];
	}

	const v = normalizeValue(raw, badge.valueType);
	return v !== null ? [v] : [];
}

function renderBadgeChip(container: HTMLElement, badge: CustomBadge, value: string): void {
	const chip = container.createSpan({ cls: [`rb-badge`, `rb-badge-${badge.color}`] });
	if (badge.icon) { const iconEl = chip.createSpan({ cls: "rb-badge-icon" }); setIcon(iconEl, badge.icon); }
	if (!badge.hideLabel && badge.label) chip.createSpan({ cls: "rb-badge-label", text: badge.label });
	if (value) {
		if (badge.prefix) chip.createSpan({ cls: "rb-badge-prefix", text: badge.prefix });
		chip.createSpan({ cls: "rb-badge-value", text: value });
		if (badge.suffix) chip.createSpan({ cls: "rb-badge-suffix", text: badge.suffix });
	}
}

export function renderBadgeRow(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	fm: Record<string, unknown>,
	skipBadge?: (badge: CustomBadge) => boolean,
): void {
	const badges = settings.headerBadges.filter(b => b.enabled && !skipBadge?.(b));
	const chips: Array<{ badge: CustomBadge; type: BadgeType; values: string[] }> = [];

	for (const badge of badges) {
		const type = badge.type ?? "badge";
		if (type === "separator" || type === "newline") {
			chips.push({ badge, type, values: [] });
			continue;
		}
		if (!badge.formula && !badge.property) continue;
		const values = resolveBadgeValues(badge, fm);
		if (values.length === 0) continue;
		chips.push({ badge, type, values });
	}

	const hasContent = chips.some(c => c.type !== "separator" && c.type !== "newline" && c.values.length > 0);
	if (!hasContent) return;

	const row = container.createDiv({ cls: "rb-badge-row" });
	for (const { badge, type, values } of chips) {
		if (type === "separator") {
			row.createSpan({ cls: "rb-badge-separator" });
		} else if (type === "newline") {
			row.createEl("br");
		} else {
			for (const value of values) renderBadgeChip(row, badge, value);
		}
	}
}
