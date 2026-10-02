/**
 * Shared recipe view layout contracts so multiple layout modules can reuse the
 * same render context without duplicating recipe parsing and state lookups.
 */
import { App, Component, TFile } from "obsidian";
import { GroceryItem, IngredientGroup, InstructionGroup, MealPlanEntry } from "../../../types";
import { RecipeMeta } from "../../../parser/recipe-meta-read";
import { RecipeBoxSettings } from "../../../settings/settings-types";
import { RecipeViewDeps } from "../recipe-view-deps";
import { TrailingSection } from "../section-extra-content";
import { ShareStatus } from "../../../sharing/share-status";
import type { EditSectionTarget } from "../../modals/edit-recipe-form";

export type RecipeLayoutId = "mobile-tabs" | "desktop-classic" | "desktop-two-column";

export interface RecipeLayoutContext {
    file: TFile;
    settings: RecipeBoxSettings;
    frontmatter: Record<string, unknown>;
    multiplier: number;
    servings: number | null;
    inMealPlan: boolean;
    mealPlanEntries: MealPlanEntry[];
    meta: RecipeMeta;
    groceryItems: GroceryItem[];
    beforeContent: string;
    beforeInstructionsContent: string;
    afterContent: string;
    ingredientGroups: IngredientGroup[];
    instructionGroups: InstructionGroup[];
    imageValue: string | null;
    trailingSections: TrailingSection[];
    hasExtraSections: boolean;
    shareStatus: ShareStatus;
}

export interface RecipeLayoutRenderArgs {
    container: HTMLElement;
    app: App;
    component: Component;
    deps: RecipeViewDeps;
    context: RecipeLayoutContext;
    /** Opens the Edit Recipe modal at a section; omitted for read-only renders. */
    onEditSection?: (section: EditSectionTarget) => void;
}

export type RecipeLayoutRenderer = (args: RecipeLayoutRenderArgs) => Promise<void>;
