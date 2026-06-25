/**
 * Lookup table and detection pattern for Unicode vulgar fraction characters
 * (¼, ½, ¾, etc.) used during quantity parsing.
 */
export const UNICODE_FRACTIONS: Record<string, number> = {
	"¼": 0.25,   // ¼
	"½": 0.5,    // ½
	"¾": 0.75,   // ¾
	"⅓": 1 / 3,  // ⅓
	"⅔": 2 / 3,  // ⅔
	"⅕": 0.2,    // ⅕
	"⅖": 0.4,    // ⅖
	"⅗": 0.6,    // ⅗
	"⅘": 0.8,    // ⅘
	"⅙": 1 / 6,  // ⅙
	"⅚": 5 / 6,  // ⅚
	"⅛": 0.125,  // ⅛
	"⅜": 0.375,  // ⅜
	"⅝": 0.625,  // ⅝
	"⅞": 0.875,  // ⅞
};

export const UNICODE_FRACTION_PATTERN = new RegExp(
	`[${Object.keys(UNICODE_FRACTIONS).join("")}]`
);
