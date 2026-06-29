/**
 * The built-in suggester modes shipped with the plugin.
 * All are fully editable by the user but cannot be deleted (isBuiltin=true).
 * Field names reference the plugin defaults; if the user has renamed a property
 * in settings, they can edit the rule to match.
 */
import type { SuggesterMode } from "./strategy-types";

export const BUILTIN_MODE_IDS = {
	rediscover: "builtin-rediscover",
	goTo: "builtin-go-to",
	findNew: "builtin-find-new",
};

export const BUILTIN_MODES: SuggesterMode[] = [
	{
		id: BUILTIN_MODE_IDS.rediscover,
		name: "Rediscover favorite recipes",
		isBuiltin: true,
		isDefault: false,
		filters: [],
		rules: [
			// First (highest weight): long gap since last made — favor neglected recipes.
			{ field: "lastMade", direction: "favor-low" },
			// Second: favorites you've stopped making rise above plain neglected ones.
			{ field: "favorite", direction: "favor-high" },
			// Third (lowest weight): secondary boost for rarely-cooked recipes.
			{ field: "cookedCount", direction: "favor-low" },
		],
	},
	{
		id: BUILTIN_MODE_IDS.goTo,
		name: "My Go-to recipes",
		isBuiltin: true,
		isDefault: false,
		filters: [],
		rules: [
			// First (highest weight): favorites.
			{ field: "favorite", direction: "favor-high" },
			// Second: proven, often-made recipes.
			{ field: "cookedCount", direction: "favor-high" },
		],
	},
	{
		id: BUILTIN_MODE_IDS.findNew,
		name: "Find new recipes",
		isBuiltin: true,
		isDefault: true,
		filters: [],
		rules: [
			// First (highest weight): prefer recipes that have never been made at all.
			{ field: "lastMade", direction: "favor-none" },
			// Second: skip favorites, those belong in Go-to, not the discovery pile.
			{ field: "favorite", direction: "favor-low" },
			// Third: lowest cook count as a proxy for "recently added to the vault."
			{ field: "cookedCount", direction: "favor-none" },
		],
	},
];
