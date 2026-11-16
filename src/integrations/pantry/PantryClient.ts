/**
 * All Pantry HTTP lives here: auth headers, JSON negotiation, envelope
 * unwrapping, paging and error mapping. Uses Obsidian requestUrl (never fetch)
 * so it works on mobile. The transport is injectable for tests.
 */
import { requestUrl } from "obsidian";
import {
	PantryCategory,
	PantryError,
	PantryHouse,
	PantryItem,
	PantryList,
	extractArray,
	parseAll,
	parseCategory,
	parseHouse,
	parseItem,
	parseList,
	unwrapOcs,
} from "./pantryTypes";

export interface HttpRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: string;
	contentType?: string;
}

export interface HttpResponse {
	status: number;
	json: unknown;
}

export type HttpTransport = (req: HttpRequest) => Promise<HttpResponse>;

const PAGE_SIZE = 200;
/** One run never reads more than this many remote items. Beyond it the run reports a truncated list. */
export const MAX_REMOTE_ITEMS = 500;

export interface PantryClientConfig {
	serverUrl: string;
	username: string;
	appPassword: string;
	houseId?: number;
}

/** Adds https:// when missing and strips trailing slashes. */
export function normalizeServerUrl(input: string): string {
	let url = input.trim();
	if (!url) return "";
	if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
	return url.replace(/\/+$/, "");
}

function base64(text: string): string {
	// btoa only takes Latin-1, and app passwords or usernames may not be.
	const bytes = new TextEncoder().encode(text);
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin);
}

const defaultTransport: HttpTransport = async (req) => {
	// throw:false so we can map 401/403 ourselves instead of getting a generic rejection.
	const res = await requestUrl({ ...req, throw: false });
	let json: unknown = null;
	try {
		json = res.json as unknown;
	} catch {
		// Non-JSON body (XML default, HTML error page). The envelope check reports it.
	}
	return { status: res.status, json };
};

export class PantryClient {
	constructor(
		private config: PantryClientConfig,
		private transport: HttpTransport = defaultTransport,
	) {}

	private base(): string {
		return `${normalizeServerUrl(this.config.serverUrl)}/ocs/v2.php/apps/pantry/api`;
	}

	private housePath(): string {
		if (this.config.houseId === undefined) throw new PantryError("shape", "No Pantry house is selected.");
		return `/houses/${this.config.houseId}`;
	}

	private async call(method: string, path: string, query = "", body?: unknown): Promise<unknown> {
		// Accept header is the primary way to get JSON. format=json is the OCS
		// fallback in case a proxy strips Accept. Unverified against a real server.
		const url = `${this.base()}${path}?format=json${query}`;
		const headers: Record<string, string> = {
			"OCS-APIRequest": "true",
			Authorization: `Basic ${base64(`${this.config.username}:${this.config.appPassword}`)}`,
			Accept: "application/json",
		};
		const req: HttpRequest = { url, method, headers };
		if (body !== undefined) {
			req.body = JSON.stringify(body);
			req.contentType = "application/json";
		}

		let res: HttpResponse;
		try {
			res = await this.transport(req);
		} catch {
			throw new PantryError("network", "Could not reach the Pantry server.");
		}
		if (res.status === 401 || res.status === 403) {
			throw new PantryError("auth", "Pantry sign in failed. Check your app password.");
		}
		if (res.status < 200 || res.status >= 300) {
			throw new PantryError("http", `Pantry answered with an error (${res.status}).`);
		}
		return unwrapOcs(res.json);
	}

	async listHouses(): Promise<PantryHouse[]> {
		return parseAll(extractArray(await this.call("GET", "/houses"), "houses"), parseHouse);
	}

	async listLists(): Promise<PantryList[]> {
		return parseAll(extractArray(await this.call("GET", `${this.housePath()}/lists`), "lists"), parseList);
	}

	async createList(name: string): Promise<PantryList> {
		const data = await this.call("POST", `${this.housePath()}/lists`, "", { name });
		const list = parseList(data);
		if (!list) throw new PantryError("shape", "Pantry did not return the new list.");
		return list;
	}

	async listCategories(): Promise<PantryCategory[]> {
		return parseAll(extractArray(await this.call("GET", `${this.housePath()}/categories`), "categories"), parseCategory);
	}

	/** Pages until a short page, up to MAX_REMOTE_ITEMS. `truncated` means more existed than we read. */
	async listItems(listId: number): Promise<{ items: PantryItem[]; truncated: boolean }> {
		const items: PantryItem[] = [];
		for (let offset = 0; ; offset += PAGE_SIZE) {
			const data = await this.call("GET", `${this.housePath()}/lists/${listId}/items`, `&limit=${PAGE_SIZE}&offset=${offset}`);
			const page = parseAll(extractArray(data, "items"), parseItem);
			items.push(...page);
			if (items.length >= MAX_REMOTE_ITEMS) return { items: items.slice(0, MAX_REMOTE_ITEMS), truncated: page.length === PAGE_SIZE };
			if (page.length < PAGE_SIZE) return { items, truncated: false };
		}
	}

	async createItem(listId: number, name: string, categoryId: number | null): Promise<PantryItem> {
		// deleteOnDone:false is always explicit. A list default of true would make
		// checking an item in the store delete it, which we would read as a deletion.
		const body: Record<string, unknown> = { name, deleteOnDone: false };
		if (categoryId !== null) body.categoryId = categoryId;
		const data = await this.call("POST", `${this.housePath()}/lists/${listId}/items`, "", body);
		const item = parseItem(data) ?? parseItem((data as { item?: unknown } | null)?.item);
		if (!item) throw new PantryError("shape", "Pantry did not return the new item.");
		return item;
	}

	/** Explicit state, never null: idempotent, so a retried call cannot flip the item back. */
	async setDone(listId: number, itemId: number, done: boolean): Promise<void> {
		await this.call("POST", `${this.housePath()}/lists/${listId}/items/${itemId}/toggle`, "", { done });
	}

	/** Soft delete. The item stays recoverable from the Pantry trash. */
	async deleteItem(listId: number, itemId: number): Promise<void> {
		await this.call("DELETE", `${this.housePath()}/lists/${listId}/items/${itemId}`);
	}
}
