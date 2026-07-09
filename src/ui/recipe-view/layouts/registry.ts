/**
 * Registry and resolver for recipe view layouts.
 *
 * The resolver keeps policy separate from renderers so we can add user or
 * width-based layout selection later without rewriting layout modules.
 */
import { Platform } from "obsidian";
import { RecipeBoxSettings } from "../../../settings/settings-types";
import { renderDesktopClassicLayout } from "./desktop-classic-layout";
import { renderDesktopTwoColumnLayout } from "./desktop-two-column-layout";
import { renderMobileTabsLayout } from "./mobile-tabs-layout";
import { RecipeLayoutId, RecipeLayoutRenderer } from "./types";

const RECIPE_LAYOUT_REGISTRY: Record<RecipeLayoutId, RecipeLayoutRenderer> = {
    "mobile-tabs": renderMobileTabsLayout,
    "desktop-classic": renderDesktopClassicLayout,
    "desktop-two-column": renderDesktopTwoColumnLayout,
};

function resolveDesktopLayoutId(settings: RecipeBoxSettings): RecipeLayoutId {
    return settings.desktopRecipeLayout === "classic" ? "desktop-classic" : "desktop-two-column";
}

export function resolveRecipeLayoutId(settings: RecipeBoxSettings): RecipeLayoutId {
    if (Platform.isMobile) return "mobile-tabs";
    return resolveDesktopLayoutId(settings);
}

export function getRecipeLayoutRenderer(layoutId: string): RecipeLayoutRenderer {
    return RECIPE_LAYOUT_REGISTRY[layoutId as RecipeLayoutId] ?? RECIPE_LAYOUT_REGISTRY["desktop-classic"];
}
