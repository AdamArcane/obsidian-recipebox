/**
 * Derives UI display status from share frontmatter state alone -- no
 * network call, per spec ("Worker enforces expiry via KV TTL, not
 * plugin-side logic"). The plugin only needs a best-effort local read to
 * decide whether to show the share form or the "already shared" view.
 */
import { ShareData } from "./share-frontmatter";

export type ShareStatus =
	| { kind: "not-shared" }
	| { kind: "shared"; daysLeft: number }
	| { kind: "expired" };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getShareStatus(data: ShareData | null, now: Date = new Date()): ShareStatus {
	if (!data) return { kind: "not-shared" };
	const expiresAt = new Date(data.expires);
	if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
		return { kind: "expired" };
	}
	const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY);
	return { kind: "shared", daysLeft };
}
