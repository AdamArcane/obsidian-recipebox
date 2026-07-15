import { describe, it, expect } from "vitest";
import { getShareStatus } from "../../src/sharing/share-status";
import type { ShareData } from "../../src/sharing/share-frontmatter";

function shareData(overrides: Partial<ShareData> = {}): ShareData {
	return { slug: "abc", token: "tok", created: "2024-01-01T00:00:00.000Z", expires: "2024-02-01T00:00:00.000Z", ...overrides };
}

describe("getShareStatus", () => {
	it("returns 'not-shared' when there is no share data", () => {
		expect(getShareStatus(null)).toEqual({ kind: "not-shared" });
	});

	it("returns 'shared' with days-left when expiry is in the future", () => {
		const now = new Date("2024-01-30T00:00:00.000Z");
		const data = shareData({ expires: "2024-02-01T00:00:00.000Z" });
		expect(getShareStatus(data, now)).toEqual({ kind: "shared", daysLeft: 2 });
	});

	it("returns 'expired' when the expiry date has passed", () => {
		const now = new Date("2024-03-01T00:00:00.000Z");
		const data = shareData({ expires: "2024-02-01T00:00:00.000Z" });
		expect(getShareStatus(data, now)).toEqual({ kind: "expired" });
	});

	it("returns 'expired' when the expiry is exactly now", () => {
		const now = new Date("2024-02-01T00:00:00.000Z");
		const data = shareData({ expires: "2024-02-01T00:00:00.000Z" });
		expect(getShareStatus(data, now)).toEqual({ kind: "expired" });
	});

	it("returns 'expired' for an unparseable expiry date", () => {
		const data = shareData({ expires: "not-a-date" });
		expect(getShareStatus(data)).toEqual({ kind: "expired" });
	});
});
