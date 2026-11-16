import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

import { HttpRequest, HttpResponse, PantryClient, normalizeServerUrl } from "../../../src/integrations/pantry/PantryClient";
import { PantryError } from "../../../src/integrations/pantry/pantryTypes";

const ok = (data: unknown): HttpResponse => ({ status: 200, json: { ocs: { meta: {}, data } } });
const item = (id: number, extra: Record<string, unknown> = {}) => ({ id, name: `i${id}`, done: false, ...extra });
const make = (fn: (r: HttpRequest) => Promise<HttpResponse>) =>
	new PantryClient({ serverUrl: "cloud.example.com/", username: "ann", appPassword: "pw", houseId: 3 }, fn);

describe("normalizeServerUrl", () => {
	it("adds https and strips trailing slashes", () => {
		expect(normalizeServerUrl("cloud.example.com//")).toBe("https://cloud.example.com");
		expect(normalizeServerUrl("http://10.0.0.1/")).toBe("http://10.0.0.1");
		expect(normalizeServerUrl("  ")).toBe("");
	});
});

describe("PantryClient", () => {
	it("sends the required headers and unwraps the envelope", async () => {
		const seen: HttpRequest[] = [];
		const c = make(async (r) => { seen.push(r); return ok([{ id: 1, name: "Home" }]); });
		expect(await c.listHouses()).toEqual([{ id: 1, name: "Home" }]);
		expect(seen[0].url).toBe("https://cloud.example.com/ocs/v2.php/apps/pantry/api/houses?format=json");
		expect(seen[0].headers["OCS-APIRequest"]).toBe("true");
		expect(seen[0].headers.Accept).toBe("application/json");
		expect(seen[0].headers.Authorization).toBe(`Basic ${btoa("ann:pw")}`);
	});
	it("pages until a short page", async () => {
		const pages = [Array.from({ length: 200 }, (_, i) => item(i)), [item(900)]];
		const urls: string[] = [];
		const c = make(async (r) => { urls.push(r.url); return ok(pages.shift()); });
		const { items, truncated } = await c.listItems(5);
		expect(items).toHaveLength(201);
		expect(truncated).toBe(false);
		expect(urls[1]).toContain("offset=200");
	});
	it("caps at 500 items and reports truncation", async () => {
		const c = make(async (r) => ok(Array.from({ length: 200 }, (_, i) => item(Number(/offset=(\d+)/.exec(r.url)?.[1]) + i))));
		const { items, truncated } = await c.listItems(5);
		expect(items).toHaveLength(500);
		expect(truncated).toBe(true);
	});
	it("create sends deleteOnDone:false and the category", async () => {
		let body: unknown;
		const c = make(async (r) => { body = JSON.parse(r.body ?? "{}"); return ok(item(11)); });
		await c.createItem(5, "milk", 2);
		expect(body).toEqual({ name: "milk", deleteOnDone: false, categoryId: 2 });
	});
	it("toggle always sends an explicit done value", async () => {
		let body: unknown;
		const c = make(async (r) => { body = JSON.parse(r.body ?? "{}"); return ok(null); });
		await c.setDone(5, 11, false);
		expect(body).toEqual({ done: false });
	});
	it("maps 401 and 403 to an auth error", async () => {
		for (const status of [401, 403]) {
			const c = make(async () => ({ status, json: null }));
			await expect(c.listHouses()).rejects.toMatchObject({ kind: "auth" });
		}
	});
	it("maps transport failure to a network error and other statuses to http", async () => {
		await expect(make(async () => { throw new Error("offline"); }).listHouses()).rejects.toMatchObject({ kind: "network" });
		await expect(make(async () => ({ status: 500, json: null })).listHouses()).rejects.toMatchObject({ kind: "http" });
	});
	it("fails safely on a malformed reply", async () => {
		await expect(make(async () => ({ status: 200, json: "<xml/>" })).listHouses()).rejects.toBeInstanceOf(PantryError);
		await expect(make(async () => ok([{ id: "x" }])).listHouses()).rejects.toMatchObject({ kind: "shape" });
	});
	it("treats archived and deleted timestamps as flags", async () => {
		const c = make(async () => ok([item(1, { deletedAt: "2026-01-01", archivedAt: null })]));
		const { items } = await c.listItems(5);
		expect(items[0]).toMatchObject({ deleted: true, archived: false });
	});
});
