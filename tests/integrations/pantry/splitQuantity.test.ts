import { describe, expect, it } from "vitest";
import { splitQuantity } from "../../../src/integrations/pantry/splitQuantity";

describe("splitQuantity", () => {
	it("splits amount and unit from the name", () => {
		expect(splitQuantity("1 1/2 lb boneless chicken breasts or thighs")).toEqual({ quantity: "1 1/2 lb", name: "boneless chicken breasts or thighs" });
	});
	it("keeps a bare count as the quantity", () => {
		expect(splitQuantity("3 eggs")).toEqual({ quantity: "3", name: "eggs" });
	});
	it("drops the filler word from the quantity", () => {
		expect(splitQuantity("2 cups of flour")).toEqual({ quantity: "2 cups", name: "flour" });
	});
	it("keeps ranges as written", () => {
		expect(splitQuantity("2-3 tbsp olive oil")).toEqual({ quantity: "2-3 tbsp", name: "olive oil" });
	});
	it("leaves a line with no amount whole", () => {
		expect(splitQuantity("milk")).toEqual({ quantity: "", name: "milk" });
	});
	it("leaves an amount with no name whole", () => {
		expect(splitQuantity("2 cups")).toEqual({ quantity: "", name: "2 cups" });
	});
});
