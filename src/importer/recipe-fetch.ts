/**
 * Fetches the HTML of a recipe URL via Obsidian's requestUrl, spoofing a
 * desktop browser User-Agent to improve compatibility with recipe sites.
 */
import { requestUrl } from "obsidian";

const REQUEST_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.5",
};

export async function fetchHtml(url: string): Promise<string | null> {
	try {
		const response = await requestUrl({ url, headers: REQUEST_HEADERS });
		const contentType = response.headers?.["content-type"] ?? "";
		if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
			return null;
		}
		return response.text;
	} catch {
		return null;
	}
}
