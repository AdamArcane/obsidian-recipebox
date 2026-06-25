/**
 * Default high-GI food pattern list and the compiler that converts it to
 * pre-built RegExp objects for fast per-ingredient lookups.
 */
export const DEFAULT_GI_DICTIONARY = `
# High-glycemic foods (GI >= 70)
# One regex pattern per line. Lines starting with # are comments.

# Refined grains and rices
white rice
jasmine rice
short.grain rice
instant rice
rice flour

# White bread products
white bread
bagel
baguette
ciabatta
english muffin
white roll
white bun
white pita

# Crackers
rice cake
rice cracker
water cracker
cracker
pretzel

# Cereals
cornflakes
corn flakes
rice krispies
puffed rice
instant oat

# Sugars
\\bsugar\\b
brown sugar
powdered sugar
confectioner.s sugar
corn syrup
high.fructose corn syrup
\\bhfcs\\b
\\bglucose\\b
\\bdextrose\\b
\\bmaltose\\b
golden syrup
rice syrup

# Other high-GI foods
donut
doughnut
\\bsoda\\b
watermelon
\\bdates\\b
french fries
mashed potato
baked potato
`.trim();

export interface CompiledPattern {
	pattern: RegExp;
	source: string;
}

export function compileGiDictionary(text: string): {
	patterns: CompiledPattern[];
	errors: string[];
} {
	const patterns: CompiledPattern[] = [];
	const errors: string[] = [];

	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		try {
			patterns.push({ pattern: new RegExp(trimmed, "i"), source: trimmed });
		} catch {
			errors.push(`Invalid pattern: ${trimmed}`);
		}
	}

	return { patterns, errors };
}
