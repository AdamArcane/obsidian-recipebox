import { describe, it, expect } from "vitest";
import { normalisePhrase } from "../../src/parser/phrase-normalise";

describe("normalisePhrase", () => {
	it("lowercases, strips accents and periods, and collapses whitespace", () => {
		expect(normalisePhrase("C. Sopa")).toBe("c sopa");
		expect(normalisePhrase("c.  sopa")).toBe("c sopa");
		expect(normalisePhrase("chávena")).toBe("chavena");
	});
});
