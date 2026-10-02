/**
 * Type definitions for structured recipe data produced by the importer pipeline.
 */
export interface ImportedGroup {
	name: string | null;
	items: string[];
	/**
	 * Heading level the group had in an existing note. Only set by the edit
	 * flow, so a rewritten section keeps its sub-heading depth; groups made in
	 * the editor leave it unset and get section level + 1.
	 */
	headingLevel?: number;
}

export interface ExtractedRecipe {
	title: string;
	description: string;
	heroImage: string | null;
	servings: string | null;
	prepTime: number | null;
	cookTime: number | null;
	totalTime: number | null;
	ingredientGroups: ImportedGroup[];
	instructionGroups: ImportedGroup[];
	notesGroups: ImportedGroup[];
	sourceUrl: string;
	calories: number | null;
	protein: number | null;
	fat: number | null;
	carbs: number | null;
}
