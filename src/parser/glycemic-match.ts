/**
 * Tests an ingredient name against a pre-compiled set of high-GI patterns
 * produced by glycemic-dictionary.ts.
 */
import { CompiledPattern } from "./glycemic-dictionary";

export function isHighGi(name: string, patterns: CompiledPattern[]): boolean {
	return patterns.some((cp) => cp.pattern.test(name));
}
