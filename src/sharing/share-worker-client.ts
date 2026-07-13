/**
 * Thin client for the recipe-box-share-worker HTTP API (POST /share,
 * DELETE /:userShortId/:recipeSlug). Uses Obsidian's requestUrl rather than
 * fetch, matching recipe-fetch.ts -- avoids CORS restrictions that apply to
 * fetch from within Obsidian's renderer.
 *
 * No GET client: that endpoint is hit directly by the recipient's browser,
 * never by the plugin.
 */
import { requestUrl } from "obsidian";

export interface CreateShareRequest {
	userShortId: string;
	name: string;
	html: string;
	expiresInDays: 7 | 30 | 90;
}

export interface CreateShareResponse {
	recipeSlug: string;
	token: string;
	url: string;
	expiresAt: string;
}

export async function createShare(
	serverUrl: string,
	request: CreateShareRequest,
): Promise<CreateShareResponse> {
	const response = await requestUrl({
		url: `${serverUrl.replace(/\/$/, "")}/share`,
		method: "POST",
		contentType: "application/json",
		body: JSON.stringify(request),
	});
	return response.json as CreateShareResponse;
}

export class ShareNotFoundError extends Error {}
export class ShareTokenMismatchError extends Error {}

export async function deleteShare(
	serverUrl: string,
	userShortId: string,
	recipeSlug: string,
	token: string,
): Promise<void> {
	try {
		await requestUrl({
			url: `${serverUrl.replace(/\/$/, "")}/${userShortId}/${recipeSlug}`,
			method: "DELETE",
			contentType: "application/json",
			body: JSON.stringify({ token }),
		});
	} catch (err) {
		// requestUrl throws on non-2xx; distinguish the two documented failure
		// modes so callers (unshare-recipe.ts) can treat "already gone" as success.
		const status = (err as { status?: number }).status;
		if (status === 404) throw new ShareNotFoundError("Share not found");
		if (status === 403) throw new ShareTokenMismatchError("Delete token mismatch");
		throw err;
	}
}
