import { CompiledPattern } from "./glycemic-dictionary";

export function isHighGi(name: string, patterns: CompiledPattern[]): boolean {
	return patterns.some((cp) => cp.pattern.test(name));
}
