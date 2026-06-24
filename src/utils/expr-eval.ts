// Tiny arithmetic expression evaluator supporting +, -, *, /, parens, and
// named variables from a scope object. Used for badge formula evaluation.

type Scope = Record<string, unknown>;

function toNum(v: unknown): number {
	return typeof v === "number" ? v : Number(v);
}

class Parser {
	private pos = 0;
	constructor(private readonly src: string) {}

	parse(): number | null {
		const v = this.parseExpr();
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

	private parseExpr(): number { return this.parseAddSub(); }

	private parseAddSub(): number {
		let v = this.parseMulDiv();
		while (this.peek() === "+" || this.peek() === "-") {
			const op = this.src[this.pos++];
			const r = this.parseMulDiv();
			v = op === "+" ? v + r : v - r;
		}
		return v;
	}

	private parseMulDiv(): number {
		let v = this.parseUnary();
		while (this.peek() === "*" || this.peek() === "/") {
			const op = this.src[this.pos++];
			const r = this.parseUnary();
			v = op === "*" ? v * r : v / r;
		}
		return v;
	}

	private parseUnary(): number {
		if (this.peek() === "-") { this.pos++; return -this.parsePrimary(); }
		return this.parsePrimary();
	}

	private parsePrimary(): number {
		this.skipWs();
		if (this.peek() === "(") {
			this.consume("(");
			const v = this.parseExpr();
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

	private parseIdent(): number {
		const start = this.pos;
		while (this.pos < this.src.length && /[a-zA-Z0-9_]/.test(this.src[this.pos])) this.pos++;
		const name = this.src.slice(start, this.pos);
		if (!(name in this.scope)) throw new ReferenceError(`Unknown variable '${name}'`);
		return toNum(this.scope[name]);
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
