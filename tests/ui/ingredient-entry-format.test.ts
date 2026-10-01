import { describe, it, expect } from "vitest";
import { composeIngredient, decomposeIngredient } from "../../src/ui/modals/ingredient-entry-format";

function roundTrip(line: string): string {
	return composeIngredient(decomposeIngredient(line, {}));
}

describe("ingredient entry editor with ranges and second measures", () => {
	it("keeps a range in the qty field", () => {
		expect(decomposeIngredient("2-3 bananas", {})).toMatchObject({ qty: "2-3", name: "bananas" });
		expect(roundTrip("2-3 bananas")).toBe("2-3 bananas");
		expect(roundTrip("1/2 to 3/4 cup milk")).toBe("0.5-0.75 cup milk");
	});

	it("moves a second measure into the unit field instead of the name", () => {
		expect(decomposeIngredient("1 cup/240 ml water", {})).toMatchObject({ qty: "1", unit: "cup / 240 ml", name: "water" });
		expect(roundTrip("125 g / 4 oz rice")).toBe("125 g / 4 oz rice");
		expect(roundTrip("125-150 g / 4-5 oz rice")).toBe("125-150 g / 4-5 oz rice");
	});

	it("leaves plain lines unchanged", () => {
		expect(roundTrip("2 cups flour (sifted)")).toBe("2 cup flour (sifted)");
	});
});
