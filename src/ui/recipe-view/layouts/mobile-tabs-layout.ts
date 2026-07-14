/**
 * Adapter that routes the mobile tab renderer through the shared layout
 * contract so RecipeView can resolve all layouts through one registry.
 */
import { renderMobileLayout } from "../mobile-layout";
import { RecipeLayoutRenderer } from "./types";

export const renderMobileTabsLayout: RecipeLayoutRenderer = async ({
    container,
    app,
    component,
    deps,
    context,
}) => {
    await renderMobileLayout(
        container,
        app,
        component,
        context.file,
        context.frontmatter,
        context.settings,
        context.multiplier,
        context.servings,
        context.inMealPlan,
        context.meta,
        context.ingredientGroups,
        context.instructionGroups,
        context.beforeContent,
        context.afterContent,
        context.groceryItems,
        deps,
        context.shareStatus,
    );
};
