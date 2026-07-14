/**
 * Decides the accent color pair (light-mode, dark-mode) for a shared page.
 * The sharer's captured theme accent is used as-is for both modes -- only
 * the accent is personalized, background/text stay the fixed recipient-side
 * light/dark pair (see build-share-html.ts). But an arbitrary theme accent
 * is not guaranteed to read against the fixed dark background: a pale
 * pastel accent that looks fine on a theme's own (often non-white) light
 * background can wash out to near-invisible on our #1e1e1e. Rather than
 * trust every theme's accent blindly, fall back to the plugin's own default
 * purple whenever the captured color fails a basic contrast check or can't
 * be parsed at all (Obsidian accent variables are normally hex, but a theme
 * could in principle set something else).
 */
export interface ShareAccentColors {
	light: string;
	dark: string;
}

const DEFAULT_ACCENT: ShareAccentColors = { light: "#7c5cff", dark: "#a48fff" };
const DARK_BG_RGB: [number, number, number] = [0x1e, 0x1e, 0x1e];

// Not a strict WCAG AA text threshold (4.5) -- the accent here is used for
// links, badge values, and borders rather than body copy, so a lower bar
// (roughly WCAG's "large text"/non-text UI threshold) is enough to catch a
// genuinely unreadable pairing without rejecting every accent that isn't
// maximally high-contrast.
const MIN_DARK_CONTRAST = 3;

function hexToRgb(hex: string): [number, number, number] | null {
	const match = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (!match) return null;
	let h = match[1];
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	const num = parseInt(h, 16);
	return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function srgbChannelToLinear(channel: number): number {
	const v = channel / 255;
	return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
	return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
	const lA = relativeLuminance(a);
	const lB = relativeLuminance(b);
	const lighter = Math.max(lA, lB);
	const darker = Math.min(lA, lB);
	return (lighter + 0.05) / (darker + 0.05);
}

export function resolveShareAccentColors(capturedAccent: string | null): ShareAccentColors {
	if (!capturedAccent) return DEFAULT_ACCENT;
	const rgb = hexToRgb(capturedAccent);
	if (!rgb) return DEFAULT_ACCENT;
	if (contrastRatio(rgb, DARK_BG_RGB) < MIN_DARK_CONTRAST) return DEFAULT_ACCENT;
	return { light: capturedAccent, dark: capturedAccent };
}
