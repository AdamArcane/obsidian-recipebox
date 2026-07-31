/**
 * User-editable unit alias list and its compiler. Aliases take precedence over
 * the locale vocabulary and the built-in English one, so a household spelling
 * can be mapped without waiting on a locale to carry it.
 */
export const DEFAULT_UNIT_ALIASES = `# One "alias => unit" per line. Lines starting with # are comments.
# The alias is what appears in your recipes; the unit is what the grocery list shows.
# Aliases win over the selected locale and over the built-in English units.
#
# Examples:
#   saqueta => saqueta
#   c. sopa => tbsp
`;

export interface CompiledUnitAliases {
	forms: Record<string, string>;
	errors: string[];
}

export function compileUnitAliases(text: string): CompiledUnitAliases {
	const forms: Record<string, string> = {};
	const errors: string[] = [];

	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;

		const parts = line.split("=>");
		if (parts.length !== 2) {
			errors.push(line);
			continue;
		}

		const alias = parts[0].trim();
		const unit = parts[1].trim();
		// An empty unit is meaningful (it consumes the alias and contributes no
		// unit, matching how the built-in table treats filler words), an empty
		// alias is not.
		if (!alias) {
			errors.push(line);
			continue;
		}
		forms[alias] = unit;
	}

	return { forms, errors };
}
