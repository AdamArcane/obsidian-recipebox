/** A locale's ingredient vocabulary, consumed by compileVocabulary. */
export interface RecipeLocale {
	id: string;
	label: string;
	/** Unit form (lowercase, unaccented, no periods) to the canonical unit shown to the user. */
	forms: Record<string, string>;
	/** Base-table unit forms this locale must not inherit, where the two languages disagree. */
	suppress?: string[];
	/**
	 * Size and preparation words moved from the name into the note, so the grocery
	 * list merges on what you buy while the recipe still shows how to prepare it.
	 * Variety words belong nowhere near this list: a red onion is not an onion.
	 */
	qualifiers?: string[];
	/** Spelled-out amounts, the locale counterpart of English "a"/"an". */
	numerals?: Record<string, number>;
	/** Words joining a unit to its ingredient, stripped like the English "of". */
	prepositions?: string[];
}
