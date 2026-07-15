import { describe, it, expect, vi } from "vitest";
import { getOrCreateUserIdentity } from "../../src/sharing/user-identity";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { RecipeBoxSettings } from "../../src/settings/settings-types";

describe("getOrCreateUserIdentity", () => {
	it("returns existing identity fields unchanged without saving", async () => {
		const settings: RecipeBoxSettings = { ...DEFAULT_SETTINGS, userGuid: "existing-guid", userShortId: "abc123" };
		const save = vi.fn().mockResolvedValue(undefined);
		const identity = await getOrCreateUserIdentity(settings, save);
		expect(identity).toEqual({ userGuid: "existing-guid", userShortId: "abc123" });
		expect(save).not.toHaveBeenCalled();
	});

	it("generates and persists a new identity when absent", async () => {
		const settings: RecipeBoxSettings = { ...DEFAULT_SETTINGS, userGuid: "", userShortId: "" };
		const save = vi.fn().mockResolvedValue(undefined);
		const identity = await getOrCreateUserIdentity(settings, save);
		expect(identity.userGuid).toBeTruthy();
		expect(identity.userShortId).toHaveLength(6);
		expect(save).toHaveBeenCalledOnce();
		expect(settings.userGuid).toBe(identity.userGuid);
	});

	it("generates a short ID using only lowercase letters and digits", async () => {
		const settings: RecipeBoxSettings = { ...DEFAULT_SETTINGS, userGuid: "", userShortId: "" };
		const save = vi.fn().mockResolvedValue(undefined);
		const identity = await getOrCreateUserIdentity(settings, save);
		expect(identity.userShortId).toMatch(/^[a-z0-9]{6}$/);
	});
});
