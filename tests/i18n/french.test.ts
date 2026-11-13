/** Verifies fallback and placeholder safety for display-only localization. */
import { describe, it, expect, vi } from "vitest";
const language = vi.hoisted(() => ({ value: "en" }));
vi.mock("obsidian", () => ({ getLanguage: () => language.value }));
import { dayLabel, mealLabel, categoryLabel } from "../../src/ui/utils/localized-labels";
import { translate, t } from "../../src/i18n";
import { french } from "../../src/i18n/fr";

describe("French localization", () => {
    it("translates built-in display labels while keeping custom and English values", () => {
        language.value = "fr-CH";
        expect(dayLabel("Monday")).toBe("Lundi");
        expect(mealLabel("Dinner")).toBe("Dîner");
        expect(categoryLabel("Produce")).toBe("Fruits et légumes");
        expect(mealLabel("My custom meal")).toBe("My custom meal");
        language.value = "en";
        expect(dayLabel("monday")).toBe("monday");
        expect(mealLabel("Dinner")).toBe("Dinner");
    });
    it("preserves English and falls back for other languages and missing keys", () => {
        const key = Object.keys(french)[0];
        expect(translate("en", key)).toBe(key);
        expect(translate("de", key)).toBe(key);
        expect(translate("fr", "Untranslated message")).toBe("Untranslated message");
        expect(translate("fr", "toString")).toBe("toString");
    });
    it("supports French language variants", () => {
        const key = Object.keys(french)[0];
        for (const language of ["fr", "fr-FR", "fr-CH", "fr_CA"]) {
            expect(translate(language, key)).toBe(french[key]);
        }
    });
    it("keeps interpolation tokens and inserted user text intact", () => {
        for (const [key, value] of Object.entries(french)) {
            expect((value.match(/\{\d+\}/g) || []).sort()).toEqual((key.match(/\{\d+\}/g) || []).sort());
        }
        expect(translate("en", "{0} then {1}", "$&{1}", "<note>")).toBe("$&{1} then <note>");
        expect(t`Hello ${"{0}$&"}`).toBe("Hello {0}$&");
    });
});
