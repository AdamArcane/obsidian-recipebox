/** String case utilities: slug/deslugify for meal type tag segments and toTitleCase for display names. */
/** Converts a meal type string to a valid Obsidian tag segment: lowercase, spaces/punctuation → hyphens, leading/trailing hyphens stripped. */
export function slugifyMealType(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		|| "meal";
}

/** Reverse of slugifyMealType for display: hyphens → spaces, title-cased. Best-effort only. */
export function deslugifyMealType(slug: string): string {
	return toTitleCase(slug.replace(/-/g, " "));
}

export function toTitleCase(name: string): string {
	return name
		.split(/(\s+|-)/)
		.map((token) => {
			if (/\s|-/.test(token)) return token;
			return token.charAt(0).toUpperCase() + token.slice(1);
		})
		.join("");
}
