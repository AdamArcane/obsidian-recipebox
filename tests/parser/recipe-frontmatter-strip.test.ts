import { describe, it, expect } from "vitest";
import { stripFrontmatter } from "../../src/parser/recipe-frontmatter-strip";

describe("stripFrontmatter", () => {
	it("removes a YAML frontmatter block", () => {
		const contents = "---\ntitle: Test\n---\n\n# Body\n";
		expect(stripFrontmatter(contents)).toBe("\n# Body\n");
	});

	it("returns content unchanged when it doesn't start with ---", () => {
		expect(stripFrontmatter("# Body\n")).toBe("# Body\n");
	});

	it("returns content unchanged when there is no closing delimiter", () => {
		const contents = "---\ntitle: Test\n# Body\n";
		expect(stripFrontmatter(contents)).toBe(contents);
	});

	it("handles a frontmatter block with no trailing content", () => {
		expect(stripFrontmatter("---\ntitle: Test\n---")).toBe("");
	});
});
