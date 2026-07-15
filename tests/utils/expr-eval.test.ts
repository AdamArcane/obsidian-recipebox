import { describe, it, expect } from "vitest";
import { evaluateExpr, checkExprSyntax } from "../../src/utils/expr-eval";

describe("evaluateExpr", () => {
	it("evaluates basic arithmetic with correct precedence", () => {
		expect(evaluateExpr("2 + 3 * 4", {})).toBe(14);
		expect(evaluateExpr("(2 + 3) * 4", {})).toBe(20);
		expect(evaluateExpr("10 / 2 - 1", {})).toBe(4);
	});

	it("resolves variables from scope", () => {
		expect(evaluateExpr("prepTime + cookTime", { prepTime: 10, cookTime: 20 })).toBe(30);
	});

	it("treats a missing scope variable as null, not an error", () => {
		expect(evaluateExpr("prepTime", {})).toBeNull();
	});

	it("short-circuits || on truthiness without coercing the left side", () => {
		expect(evaluateExpr("prepTime || 0", {})).toBe(0);
		expect(evaluateExpr("prepTime || 5", { prepTime: 10 })).toBe(10);
		expect(evaluateExpr("zero || fallback", { zero: 0, fallback: 5 })).toBe(5);
	});

	it("supports unary minus", () => {
		expect(evaluateExpr("-5 + 10", {})).toBe(5);
	});

	it("parses literals null/true/false", () => {
		expect(evaluateExpr("null", {})).toBeNull();
	});

	it("returns null on a syntax error instead of throwing", () => {
		expect(evaluateExpr("2 +", {})).toBeNull();
		expect(evaluateExpr("(1 + 2", {})).toBeNull();
		expect(evaluateExpr("2 $ 3", {})).toBeNull();
	});

	it("returns null for trailing garbage after a valid expression", () => {
		expect(evaluateExpr("2 + 3) 4", {})).toBeNull();
	});
});

describe("checkExprSyntax", () => {
	it("returns null for syntactically valid expressions", () => {
		expect(checkExprSyntax("(prepTime || 0) + (cookTime || 0)")).toBeNull();
	});

	it("returns an error message for invalid expressions", () => {
		expect(checkExprSyntax("2 +")).not.toBeNull();
		expect(checkExprSyntax("(1 + 2")).not.toBeNull();
	});
});
