/**
 * Renders a standalone, self-contained HTML page for a shared recipe. The
 * exported HTML has no access to Obsidian's CSS variables, so this is a
 * standalone stylesheet that echoes the plugin's visual language (pill
 * badges, rounded corners, left-accented meta banner) rather than a literal
 * theme port. Dark mode follows the recipient's system preference via
 * prefers-color-scheme, no toggle.
 *
 * Image policy: the header image is always included when present, but
 * carries a visible "Photo originally from" attribution when its origin is
 * (or might be) a scraped third-party source -- see resolve-share-image.ts
 * for how isScraperOrigin is decided. This is a good-faith copyright
 * mitigation, not a legal shield.
 */
import { RecipeBoxSettings } from "../settings/settings-types";
import { stripObsidianMarkdown } from "../recipe-export/obsidian-markdown-strip";
import { formatMinutes } from "../parser/recipe-meta-read";
import { findSourceUrl } from "./find-source-url";
import { ResolvedShareImage } from "./resolve-share-image";
import { ShareableRecipeData } from "./share-export-data";
import { stringifyShareRecipeJsonLd } from "./share-json-ld";
import { stripListMarkers } from "../parser/ingredient-clean";
import { resolveShareAccentColors } from "./resolve-share-accent";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

interface MetaBadge {
	label: string;
	value: string;
}

function buildMetaBadges(data: ShareableRecipeData): MetaBadge[] {
	const badges: MetaBadge[] = [];
	if (data.servings !== null) badges.push({ label: "Servings", value: String(data.servings) });
	if (data.times.prep !== null) badges.push({ label: "Prep", value: formatMinutes(data.times.prep) });
	if (data.times.cook !== null) badges.push({ label: "Cook", value: formatMinutes(data.times.cook) });
	if (data.times.total !== null) badges.push({ label: "Total", value: formatMinutes(data.times.total) });
	return badges;
}

function renderBadgeRow(badges: MetaBadge[]): string {
	if (badges.length === 0) return "";
	const pills = badges
		.map((b) => `<span class="rbs-badge"><span class="rbs-badge-label">${escapeHtml(b.label)}</span><span class="rbs-badge-value">${escapeHtml(b.value)}</span></span>`)
		.join("");
	return `<div class="rbs-badge-row">${pills}</div>`;
}

function renderHeaderImage(image: ResolvedShareImage | null, title: string, sourceUrl: string | null): string {
	if (!image) return "";
	const caption = image.isScraperOrigin
		? `<div class="rbs-image-caption">Photo originally from ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a>` : "the original recipe source"}</div>`
		: "";
	return `<div class="rbs-header-image"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(title)}">${caption}</div>`;
}

function renderIngredients(data: ShareableRecipeData): string {
	return data.ingredientGroups
		.filter((g) => g.lines.length > 0)
		.map((group) => {
			const heading = group.heading ? `<h3>${escapeHtml(group.heading)}</h3>` : "";

			const items = group.lines
				.map((line) => `<li class="rbs-ingredient">${escapeHtml(stripObsidianMarkdown(stripListMarkers(line)))}</li>`)
				.join("");
			return `${heading}<ul class="rbs-ingredient-list">${items}</ul>`;
		})
		.join("");
}

function renderInstructions(data: ShareableRecipeData): string {
	return data.instructionGroups
		.map((group) => {
			const heading = group.heading ? `<h3>${escapeHtml(group.heading)}</h3>` : "";
			// A step written as "- [ ] Preheat oven" only has its "- " list marker
			// stripped upstream (buildStep() in recipe-instruction-groups.ts), so a
			// leading checkbox literal can still survive -- strip it here too.
			const items = group.steps.map((step) => `<li>${escapeHtml(stripObsidianMarkdown(stripListMarkers(step)))}</li>`).join("");
			return `${heading}<ol class="rbs-instruction-list">${items}</ol>`;
		})
		.join("");
}

function renderNutrition(data: ShareableRecipeData): string {
	const entries = Object.entries(data.nutrition);
	if (entries.length === 0) return "";
	const rows = entries
		.map(([label, value]) => `<span class="rbs-nutrition-label">${escapeHtml(label)}</span><span class="rbs-nutrition-value">${escapeHtml(value)}</span>`)
		.join("");
	return `<h2>Nutrition</h2><div class="rbs-nutrition-grid">${rows}</div>`;
}

export function buildShareHtml(
	data: ShareableRecipeData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
	image: ResolvedShareImage | null,
	sharerAccentColor: string | null,
): string {
	const title = escapeHtml(data.title);
	const intro = stripObsidianMarkdown(data.introContent).trim();
	const sourceUrl = findSourceUrl(frontmatter);
	const jsonLd = stringifyShareRecipeJsonLd(data, frontmatter, settings, image);
	const accent = resolveShareAccentColors(sharerAccentColor);

	// A second, low-emphasis mention in the footer only makes sense when the
	// image attribution above isn't already carrying that job (no image, or
	// no image shown at all) -- otherwise the same link would appear twice
	// right next to each other.
	const footerAttribution = image?.isScraperOrigin && sourceUrl
		? `<div class="rbs-footer-attribution">Recipe originally from <a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></div>`
		: "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="icon" href="https://cdn.arcanerecipes.com/rb-logo.png">

<script type="application/ld+json">${jsonLd}</script>
<style>
:root {
	--rb-bg: #ffffff;
	--rb-bg-secondary: #f5f5f5;
	--rb-text: #1a1a1a;
	--rb-text-muted: #6e6e6e;
	--rb-border: #e0e0e0;
	--rb-accent: ${accent.light};
}
@media (prefers-color-scheme: dark) {
	:root {
		--rb-bg: #1e1e1e;
		--rb-bg-secondary: #262626;
		--rb-text: #dcdcdc;
		--rb-text-muted: #9a9a9a;
		--rb-border: #3a3a3a;
		--rb-accent: ${accent.dark};
	}
}
* { box-sizing: border-box; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	background: var(--rb-bg);
	color: var(--rb-text);
	max-width: 640px;
	margin: 0 auto;
	padding: 0 1rem 3rem;
	line-height: 1.55;
}
.rbs-header-image { margin: 0 -1rem 1.5rem; position: relative; }
.rbs-header-image img { width: 100%; display: block; border-radius: 0 0 12px 12px; max-height: 360px; object-fit: cover; }
.rbs-image-caption {
	position: absolute; left: 0; right: 0; bottom: 0;
	background: linear-gradient(to top, rgba(0,0,0,0.65), transparent);
	color: #fff; font-size: 0.8rem; padding: 1.5rem 1rem 0.6rem; border-radius: 0 0 12px 12px;
}
.rbs-image-caption a { color: #fff; text-decoration: underline; }
h1.rbs-title { margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.rbs-badge-row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.5rem 0 1.25rem; }
.rbs-badge {
	display: inline-flex; align-items: center; gap: 0.3rem; height: 1.75rem; padding: 0 0.7rem;
	border-radius: 999px; font-size: 0.75rem; background: var(--rb-bg-secondary); border: 1px solid var(--rb-accent);
}
.rbs-badge-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--rb-text-muted); }
.rbs-badge-value { font-weight: 700; }
h2 { font-size: 1.15rem; margin: 1.75rem 0 0.6rem; color: var(--rb-accent) }
h3 { font-size: 0.95rem; margin: 1rem 0 0.4rem; color: var(--rb-text-muted); }
.rbs-ingredient-list { list-style: none; margin: 0; padding: 0; }
.rbs-ingredient { position: relative; padding: 0.3rem 0 0.3rem 1.6rem; }
.rbs-ingredient::before {
	content: ""; position: absolute; left: 0; top: 0.45rem; width: 0.9rem; height: 0.9rem;
	border: 1.5px solid var(--rb-border); border-radius: 3px;
}
.rbs-instruction-list { margin: 0; padding-left: 1.4rem; }
.rbs-instruction-list li { padding: 0.3rem 0; }
.rbs-nutrition-grid { display: grid; grid-template-columns: max-content max-content; gap: 0.3rem 1rem; align-items: baseline; }
.rbs-nutrition-label { font-size: 0.85rem; color: var(--rb-text-muted); }
.rbs-nutrition-value { font-size: 0.85rem; font-weight: 700; color: var(--rb-accent); }
a { color: var(--rb-accent); }
.rbs-footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--rb-border); color: var(--rb-text-muted); font-size: 0.85rem; }
.rbs-footer a { color: inherit; }
.rbs-footer-attribution { margin-bottom: 0.35rem; }
.rbs-logo { width: 50px; vertical-align: text-bottom; margin-right: 0.3em; }
</style>
</head>
<body>
${renderHeaderImage(image, data.title, sourceUrl)}
<h1 class="rbs-title">${title}</h1>
${renderBadgeRow(buildMetaBadges(data))}
${intro ? `<p>${escapeHtml(intro)}</p>` : ""}
<h2>${escapeHtml(settings.ingredientsHeading)}</h2>
${renderIngredients(data)}
<h2>${escapeHtml(settings.instructionsHeading)}</h2>
${renderInstructions(data)}
${renderNutrition(data)}
<div class="rbs-footer">
${footerAttribution}
<img src="https://cdn.arcanerecipes.com/rb-logo.png" class="rbs-logo" /> Made with <a href="https://obsidian.md" target="_blank">Obsidian</a> and <a href="https://community.obsidian.md/plugins/recipe-box" target="_blank">Recipe Box</a>
</div>
</body>
</html>
`;
}
