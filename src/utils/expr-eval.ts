/**
 * Tiny arithmetic expression evaluator supporting +, -, *, /, ||, parentheses,
 * and named variables from a scope object; used for badge formula evaluation.
 *
 * Values stay untyped (unknown) until an arithmetic operator forces numeric
 * coercion. This lets `||` short-circuit on JS-style truthiness rather than
 * on a pre-coerced number, so formulas like `(prepTime || 0) + (cookTime || 0)`
 * work even when a frontmatter property is absent from the note's scope.
 */

type Scope = Record<string, unknown>;

function toNum(v: unknown): number {
	return typeof v === "number" ? v : Number(v);
}

function isTruthy(v: unknown): boolean {
	if (v === null || v === undefined) return false;
	if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
	if (typeof v === "string") return v.length > 0;
	if (typeof v === "boolean") return v;
	return true;
}

class Parser {
	private pos = 0;
	constructor(private readonly src: string) {}

	parse(): unknown {
		const v = this.parseOr();
		this.skipWs();
		if (this.pos < this.src.length) throw new SyntaxError(`Unexpected token at ${this.pos}`);
		return v;
	}

	private skipWs(): void { while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++; }
	private peek(): string { this.skipWs(); return this.src[this.pos] ?? ""; }

	private consume(ch: string): void {
		this.skipWs();
		if (this.src[this.pos] !== ch) throw new SyntaxError(`Expected '${ch}' at ${this.pos}`);
		this.pos++;
	}

	private peekOr(): boolean {
		this.skipWs();
		return this.src[this.pos] === "|" && this.src[this.pos + 1] === "|";
	}

	private parseOr(): unknown {
		let v = this.parseAddSub();
		while (this.peekOr()) {
			this.pos += 2;
			const r = this.parseAddSub();
			// Short-circuit like JS `||`: keep the left value if it's truthy,
			// otherwise fall back to the right without coercing either side.
			v = isTruthy(v) ? v : r;
		}
		return v;
	}

	private parseAddSub(): unknown {
		let v = this.parseMulDiv();
		while (this.peek() === "+" || this.peek() === "-") {
			const op = this.src[this.pos++];
			const r = this.parseMulDiv();
			v = op === "+" ? toNum(v) + toNum(r) : toNum(v) - toNum(r);
		}
		return v;
	}

	private parseMulDiv(): unknown {
		let v = this.parseUnary();
		while (this.peek() === "*" || this.peek() === "/") {
			const op = this.src[this.pos++];
			const r = this.parseUnary();
			v = op === "*" ? toNum(v) * toNum(r) : toNum(v) / toNum(r);
		}
		return v;
	}

	private parseUnary(): unknown {
		if (this.peek() === "-") { this.pos++; return -toNum(this.parsePrimary()); }
		return this.parsePrimary();
	}

	private parsePrimary(): unknown {
		this.skipWs();
		if (this.peek() === "(") {
			this.consume("(");
			const v = this.parseOr();
			this.consume(")");
			return v;
		}
		if (/[0-9.]/.test(this.peek())) return this.parseNumber();
		if (/[a-zA-Z_]/.test(this.peek())) return this.parseIdent();
		throw new SyntaxError(`Unexpected character '${this.peek()}' at ${this.pos}`);
	}

	private parseNumber(): number {
		const start = this.pos;
		while (this.pos < this.src.length && /[0-9.]/.test(this.src[this.pos])) this.pos++;
		return parseFloat(this.src.slice(start, this.pos));
	}

	private parseIdent(): unknown {
		const start = this.pos;
		while (this.pos < this.src.length && /[a-zA-Z0-9_]/.test(this.src[this.pos])) this.pos++;
		const name = this.src.slice(start, this.pos);
		if (name === "null") return null;
		if (name === "true") return true;
		if (name === "false") return false;
		// A frontmatter property missing from this note's scope is treated as
		// absent (null) rather than a reference error, so `prop || fallback`
		// works for optional properties instead of failing the whole formula.
		if (!(name in this.scope)) return null;
		return this.scope[name];
	}

	scope: Scope = {};
}

export function evaluateExpr(expr: string, scope: Record<string, unknown>): unknown {
	try {
		const p = new Parser(expr);
		p.scope = scope;
		return p.parse() ?? null;
	} catch {
		return null;
	}
}

export function checkExprSyntax(expr: string): string | null {
	try {
		const p = new Parser(expr);
		p.scope = new Proxy<Scope>({}, { has: () => true, get: () => 0 });
		p.parse();
		return null;
	} catch (e) {
		return (e as Error).message;
	}
}
