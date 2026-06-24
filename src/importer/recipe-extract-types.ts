export interface ImportedGroup {
	name: string | null;
	items: string[];
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
	sourceUrl: string;
	calories: number | null;
	protein: number | null;
	fat: number | null;
	carbs: number | null;
}
