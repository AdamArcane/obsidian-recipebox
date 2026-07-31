/** Shape of a locale's unit vocabulary, consumed by compileUnitTable. */
export interface LocaleUnits {
	id: string;
	label: string;
	/** Unit form (lowercase, unaccented, no periods) to the canonical unit shown to the user. */
	forms: Record<string, string>;
	/** Base-table forms this locale must not inherit, where the two languages disagree. */
	suppress?: string[];
}
