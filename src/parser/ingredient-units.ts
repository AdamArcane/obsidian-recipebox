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
	// centiliter
	cl: "cl", centiliter: "cl", centiliters: "cl", centilitre: "cl", centilitres: "cl",
	// deciliter. Metric volumes below a litre are common in European recipes and
	// were missing entirely, so "2 dl de leite" parsed as an ingredient named
	// "dl de leite". They sit here with the other metric units even though they
	// are not English, which is the mixing the base table still needs untangling.
	dl: "dl", deciliter: "dl", deciliters: "dl", decilitre: "dl", decilitres: "dl",
	// liter
	l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
	// fluid ounce. Matched by the ordinary longest-phrase-first pass in consumeUnit
	// like any other multi-word form, not by the special case this used to need.
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
