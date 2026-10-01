/**
 * Exhaustive synonym map from every known unit spelling and pluralisation to its
 * canonical abbreviated form, used during ingredient parsing to normalise units.
 */
// Maps every known spelling/pluralization to its canonical singular form.
// Filler words ("unit", "whole", "each") map to "" — consumed, contribute no unit.
export const UNIT_SYNONYMS: Record<string, string> = {
	// teaspoon
	tsp: "tsp", tsps: "tsp", teaspoon: "tsp", teaspoons: "tsp",
	// tablespoon
	tbsp: "tbsp", tbsps: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp", tbs: "tbsp",
	// cup
	cup: "cup", cups: "cup", c: "cup",
	// pint
	pt: "pt", pts: "pt", pint: "pt", pints: "pt",
	// quart
	qt: "qt", qts: "qt", quart: "qt", quarts: "qt",
	// gallon
	gal: "gal", gals: "gal", gallon: "gal", gallons: "gal",
	// milliliter
	ml: "ml", mls: "ml", milliliter: "ml", milliliters: "ml",
	millilitre: "ml", millilitres: "ml",
	// liter
	l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
	// fluid ounce (handled separately in consumeUnit as two-word)
	"fl oz": "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz",
	// ounce
	oz: "oz", ozs: "oz", ounce: "oz", ounces: "oz",
	// pound
	lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
	// gram
	g: "g", gram: "g", grams: "g",
	// kilogram
	kg: "kg", kilogram: "kg", kilograms: "kg",
	// milligram
	mg: "mg", milligram: "mg", milligrams: "mg",
	// piece
	piece: "piece", pieces: "piece",
	// can
	can: "can", cans: "can",
	// jar
	jar: "jar", jars: "jar",
	// bag
	bag: "bag", bags: "bag",
	// box
	box: "box", boxes: "box",
	// bottle
	bottle: "bottle", bottles: "bottle",
	// pack
	pack: "pack", packs: "pack", packet: "pack", packets: "pack",
	// bunch
	bunch: "bunch", bunches: "bunch",
	// head
	head: "head", heads: "head",
	// clove
	clove: "clove", cloves: "clove",
	// slice
	slice: "slice", slices: "slice",
	// stick
	stick: "stick", sticks: "stick",
	// pinch
	pinch: "pinch", pinches: "pinch",
	// dash
	dash: "dash", dashes: "dash",
	// sprig
	sprig: "sprig", sprigs: "sprig",
	// stalk
	stalk: "stalk", stalks: "stalk",
	// loaf
	loaf: "loaf", loaves: "loaf",
	// dozen
	dozen: "dozen", dozens: "dozen",
	// filler words
	unit: "", units: "", whole: "", each: "",
};

export interface IngredientUnitOptions {
	/** One mapping per line: aliases separated by commas, then `->` canonical unit. */
	customSynonyms?: string;
}

export function compileUnitSynonyms(customSynonyms = ""): Record<string, string> {
	const result = { ...UNIT_SYNONYMS };
	for (const line of customSynonyms.split("\n")) {
		// Split on the first arrow only, so "foo -> bar -> baz" maps to the
		// canonical "bar -> baz" rather than silently truncating to "bar".
		const arrow = line.indexOf("->");
		if (arrow === -1) continue;
		const aliasesText = line.slice(0, arrow).trim();
		const canonicalText = line.slice(arrow + 2).trim().normalize("NFC");
		if (!aliasesText) continue;
		// NFC so a decomposed "cuillère" typed in settings still matches
		// precomposed recipe text (consumeUnit normalizes the line the same way).
		for (const alias of aliasesText.normalize("NFC").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)) {
			result[alias] = canonicalText;
		}
	}
	return result;
}

export interface UnitLookup {
	synonyms: Record<string, string>;
	/** Aliases sorted longest first so multi-word and punctuated aliases win. */
	candidates: string[];
}

// consumeUnit runs once per ingredient line on every surface, but the
// mappings string only changes when the user edits settings, so keep the
// last compiled result instead of recompiling and re-sorting each call.
let cachedKey: string | null = null;
let cachedLookup: UnitLookup | null = null;

export function getUnitLookup(customSynonyms = ""): UnitLookup {
	if (cachedLookup && cachedKey === customSynonyms) return cachedLookup;
	const synonyms = compileUnitSynonyms(customSynonyms);
	cachedLookup = { synonyms, candidates: Object.keys(synonyms).sort((a, b) => b.length - a.length) };
	cachedKey = customSynonyms;
	return cachedLookup;
}
