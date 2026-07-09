/**
 * Original desktop recipe layout implementation extracted from RecipeView so
 * it can coexist with alternate desktop layouts via a shared registry.
 */
import { MarkdownRenderer } from "obsidian";
import { findOrOpenLeaf } from "../../../utils/open-leaf";
import { renderMetaBanner } from "../meta-banner";
import { renderMealPlanStatus } from "../meal-plan-status";
import { renderIngredientsSection } from "../ingredients-section";
import { renderImageCard } from "../image-resolve";
import { renderInstructionsSection } from "../instructions-section";
import { openRecipeInEditorAtSectionHeading, renderExtraSectionsButtons } from "../section-extra-content";
import { RECIPE_VIEW_TYPE } from "../recipe-view";
import { RecipeLayoutRenderer } from "./types";

export const renderDesktopClassicLayout: RecipeLayoutRenderer = async ({
    container,
    app,
    component,
    deps,
    context,
}) => {
    renderMetaBanner(
        container,
        app,
        context.file,
        context.frontmatter,
        context.settings,
        context.multiplier,
        context.servings,
        context.inMealPlan,
        context.mealPlanEntries,
        deps,
    );

    renderMealPlanStatus(container, app, context.file, context.mealPlanEntries, deps);

    if (context.beforeContent.trim()) {
        await MarkdownRenderer.render(app, context.beforeContent, container, context.file.path, component);
    }

    const hasIngredients = context.ingredientGroups.some(group => group.lines.length > 0);
    const hasImage = !!context.imageValue;
    const hasRightCol = hasImage || context.hasExtraSections;

    let rightCol: HTMLElement | null = null;

    if (hasIngredients || hasRightCol) {
        const bodyRow = container.createDiv({ cls: "rb-body-row" });
        if (hasIngredients) {
            void renderIngredientsSection(
                bodyRow,
                app,
                context.file,
                context.ingredientGroups,
                context.settings,
                context.groceryItems,
                context.multiplier,
                (key) => { void deps.removeGroceryByKey(key); },
                () => { deps.openAddToGroceryModal(context.file); },
                component,
            );
        }
        if (hasRightCol) {
            rightCol = bodyRow.createDiv({ cls: "rb-right-col" });
            if (hasImage && context.imageValue) {
                renderImageCard(rightCol, app, context.imageValue);
            }
        }
    }

    if (context.beforeInstructionsContent.trim()) {
        await MarkdownRenderer.render(app, context.beforeInstructionsContent, container, context.file.path, component);
    }

    if (context.instructionGroups.length > 0) {
        const timerOpts = context.settings.timersEnabled
            ? {
                autoStart: context.settings.timerAutoStart,
                compactByDefault: context.settings.timerCompactDisplay,
                rangeDefault: context.settings.timerRangeDefault,
                recipeName: context.file.basename,
                onNavigate: () => {
                    void findOrOpenLeaf(app, RECIPE_VIEW_TYPE, context.file.path);
                },
            }
            : undefined;
        await renderInstructionsSection(
            container,
            app,
            component,
            context.file.path,
            context.instructionGroups,
            context.settings,
            timerOpts,
        );
    }

    // Keep the classic desktop behavior: section buttons live under the image while
    // trailing sections open in a modal from these buttons.
    if (context.hasExtraSections && rightCol) {
        renderExtraSectionsButtons(
            rightCol,
            rightCol,
            context.trailingSections,
            app,
            component,
            context.file,
            context.settings,
            context.meta.cookedCount,
            (heading) => {
                void openRecipeInEditorAtSectionHeading(app, context.file, heading, deps.editAsMarkdown);
            },
        );
    }
};
