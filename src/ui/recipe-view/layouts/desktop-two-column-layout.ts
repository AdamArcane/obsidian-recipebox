/**
 * Responsive desktop layout that keeps ingredients and instructions in a
 * two-column split while preserving existing section helpers and interactions.
 */
import { MarkdownRenderer } from "obsidian";
import { findOrOpenLeaf } from "../../../utils/open-leaf";
import { renderMetaBanner } from "../meta-banner";
import { renderMealPlanStatus } from "../meal-plan-status";
import { renderIngredientsSection } from "../ingredients-section";
import { renderInstructionsSection } from "../instructions-section";
import { renderImageCard } from "../image-resolve";
import { openRecipeInEditorAtSectionHeading, renderExtraSectionsButtons as renderExtraSections } from "../section-extra-content";
import { RECIPE_VIEW_TYPE } from "../recipe-view";
import { RecipeLayoutRenderer } from "./types";

const MIN_SPLIT_RATIO = 0.25;
const MAX_SPLIT_RATIO = 0.75;

function clampSplitRatio(value: number): number {
    if (value < MIN_SPLIT_RATIO) return MIN_SPLIT_RATIO;
    if (value > MAX_SPLIT_RATIO) return MAX_SPLIT_RATIO;
    return value;
}

function applySplitRatio(main: HTMLElement, ratio: number): void {
    main.setCssProps({ "--rb-two-col-split": `${(ratio * 100).toFixed(2)}%` });
}

export const renderDesktopTwoColumnLayout: RecipeLayoutRenderer = async ({
    container,
    app,
    component,
    deps,
    context,
}) => {

    const topContainer = container.createDiv({ cls: "rb-desktop-two-col-top" });
    const topMain = topContainer.createDiv({ cls: "rb-desktop-two-col-top-main" });

    renderMetaBanner(
        topMain,
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

    renderMealPlanStatus(topMain, app, context.file, context.mealPlanEntries, deps);

    if (context.beforeContent.trim()) {
        await MarkdownRenderer.render(app, context.beforeContent, topMain, context.file.path, component);
    }

    const topJumpNav = topMain.createDiv({ cls: "rb-desktop-two-col-top-jump-nav" });

    // Right aside for image
    const aside = topContainer.createDiv({ cls: "rb-desktop-two-col-aside" });
    if (context.imageValue) {
        renderImageCard(aside, app, context.imageValue);
    }

    // Ingredients and instructions split
    const hasIngredients = context.ingredientGroups.some(group => group.lines.length > 0);
    const hasInstructions = context.instructionGroups.length > 0;
    if (hasIngredients || hasInstructions || context.beforeInstructionsContent.trim()) {
        const main = container.createDiv({ cls: "rb-desktop-two-col-main" });
        let splitRatio = clampSplitRatio(context.settings.desktopTwoColumnSplitRatio);
        applySplitRatio(main, splitRatio);

        const leftCol = main.createDiv({ cls: "rb-desktop-two-col-col" });
        const divider = main.createDiv({ cls: "rb-desktop-two-col-divider" });
        const rightCol = main.createDiv({ cls: "rb-desktop-two-col-col" });

        divider.setAttribute("role", "separator");
        divider.setAttribute("aria-label", "Resize recipe columns");
        divider.setAttribute("aria-orientation", "vertical");
        divider.tabIndex = 0;

        const persistSplitRatio = (ratio: number): void => {
            const normalized = Number(ratio.toFixed(3));
            if (Math.abs(context.settings.desktopTwoColumnSplitRatio - normalized) < 0.001) return;
            context.settings.desktopTwoColumnSplitRatio = normalized;
            void deps.saveSettings();
        };

        const updateDividerValue = (ratio: number): void => {
            divider.setAttribute("aria-valuemin", String(MIN_SPLIT_RATIO * 100));
            divider.setAttribute("aria-valuemax", String(MAX_SPLIT_RATIO * 100));
            divider.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
        };

        updateDividerValue(splitRatio);

        const onPointerDown = (event: PointerEvent): void => {
            if (event.button !== 0) return;
            const mainRect = main.getBoundingClientRect();
            if (mainRect.width <= 0) return;

            event.preventDefault();
            const startX = event.clientX;
            const startRatio = splitRatio;
            const activeWindow = main.ownerDocument.defaultView;
            if (!activeWindow) return;

            main.addClass("is-resizing");
            divider.addClass("is-active");

            const onPointerMove = (moveEvent: PointerEvent): void => {
                const deltaRatio = (moveEvent.clientX - startX) / mainRect.width;
                splitRatio = clampSplitRatio(startRatio + deltaRatio);
                applySplitRatio(main, splitRatio);
                updateDividerValue(splitRatio);
            };

            const onPointerUp = (): void => {
                main.removeClass("is-resizing");
                divider.removeClass("is-active");
                activeWindow.removeEventListener("pointermove", onPointerMove);
                activeWindow.removeEventListener("pointerup", onPointerUp);
                activeWindow.removeEventListener("pointercancel", onPointerUp);
                persistSplitRatio(splitRatio);
            };

            activeWindow.addEventListener("pointermove", onPointerMove);
            activeWindow.addEventListener("pointerup", onPointerUp);
            activeWindow.addEventListener("pointercancel", onPointerUp);
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const step = event.shiftKey ? 0.05 : 0.02;
            splitRatio = clampSplitRatio(splitRatio + (event.key === "ArrowRight" ? step : -step));
            applySplitRatio(main, splitRatio);
            updateDividerValue(splitRatio);
            persistSplitRatio(splitRatio);
        };

        component.registerDomEvent(divider, "pointerdown", onPointerDown);
        component.registerDomEvent(divider, "keydown", onKeyDown);

        if (hasIngredients) {
            void renderIngredientsSection(
                leftCol,
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

        if (context.beforeInstructionsContent.trim()) {
            await MarkdownRenderer.render(app, context.beforeInstructionsContent, rightCol, context.file.path, component);
        }

        if (hasInstructions) {
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
                rightCol,
                app,
                component,
                context.file.path,
                context.instructionGroups,
                context.settings,
                timerOpts,
            );
        }
    }

    if (context.hasExtraSections) {
        renderExtraSections(
            topJumpNav, // buttons container
            topJumpNav,
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
