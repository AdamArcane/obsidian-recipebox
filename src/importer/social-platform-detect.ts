/**
 * Detects whether a URL belongs to a known social video platform so the importer
 * can choose the appropriate extraction strategy.
 */
export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "unknown";

export function detectPlatform(url: string): SocialPlatform {
	try {
		const { hostname } = new URL(url);
		if (hostname === "youtube.com" || hostname === "www.youtube.com" || hostname === "youtu.be") {
			return "youtube";
		}
		if (hostname.includes("tiktok.com")) return "tiktok";
		if (hostname.includes("instagram.com")) return "instagram";
		return "unknown";
	} catch {
		return "unknown";
	}
}
