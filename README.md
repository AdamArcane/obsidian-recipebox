# Recipe Box

Plan meals, build grocery lists, and view recipes as interactive cards, all stored as plain markdown in your vault.

Recipe Box treats recipes the same way Obsidian treats everything else: as notes you own. Meal plans and grocery lists are markdown files too, so you can edit them by hand, query them with Dataview or Bases, and sync them with whatever sync solution you already use.

<img width="800"  alt="device-mockup" src="https://github.com/user-attachments/assets/f71bde46-511a-41e9-9a60-3bde915a4748" />

## Feature Highlights

### Recipe view

Open any recipe note and Recipe Box renders it as an interactive card with a scalable ingredient list, step-by-step instructions with inline timers, and nutrition at a glance. The header is fully configurable, allowing you to surface any frontmatter property as a badge, write custom formula expressions, or stick with the defaults. Scale a recipe up or down and every ingredient amount updates automatically.

### Meal planning

Drag recipes onto a weekly planner, drop files straight from the file explorer, or add custom meals without a recipe note attached. A queue holds anything unscheduled. The plan lives in a plain markdown note you can read and edit directly, there's no hidden database.

### Meal suggester

The suggester does more than shuffle your recipe list. Build named modes with custom filters (cuisine, prep time, allergens, any frontmatter field) and scoring rules (favor highest rated, least recently cooked, never made, or any combination). Run a mode for dinner, run another for lunch. Select results and schedule them across the week in one step.

### Grocery list

Ingredients from your meal plan are consolidated automatically... quantities summed, duplicates merged... and then grouped by category, recipe, or source. Add ad-hoc items easily, check things off as you shop, and export in multiple formats. The list is a markdown note, editable by hand or through the plugin.

### Cook history

Mark a recipe as cooked and Recipe Box logs the date, optional notes, and a photo. History is stored as a structured array in frontmatter, making it queryable with Dataview or Obsidian Bases. Find every recipe you cooked last month, your most-made meals, or anything you haven't made in over a month -- all from a standard Dataview query.

### Recipe import

Paste a URL from most recipe sites and Recipe Box extracts ingredients, instructions, and metadata into a new note using the built in recipe template, or you can set your own template to use. Plain text and pasted captions work too, for recipes that don't come from a structured page.

### Mobile

A tab-based layout with swipe navigation keeps the recipe view clean on small screens. Cook History gets its own tab. Long-press to drag recipes on the meal plan. A cook mode toggle keeps your screen awake while you're at the stove.

### Timers

Duration phrases in your instructions ("bake for 30 minutes") become tappable timer buttons. Run several at once, drag them anywhere on screen, and get an audio alert when they finish.

## Installation

### Obsidian Community Direcotry
Recipe Box is available in the Obsidian community plugin directory and can be installed through the in-app browser.

You can also view the plugin directory listing by visiting https://community.obsidian.md/plugins/recipe-box

### BRAT (for beta releases)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from the Obsidian community plugins directory and enable it.
2. Open BRAT settings and click **Add Beta Plugin**.
3. Enter `AdamArcane/obsidian-recipebox` and click **Add Plugin**.
4. Enable Recipe Box in Settings → Community plugins.

BRAT will notify you when new beta releases are available and can update the plugin automatically.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/AdamArcane/obsidian-recipebox/releases/latest).
2. Create the folder `<your vault>/.obsidian/plugins/recipe-box/` if it does not exist.
3. Copy the three files into that folder.
4. Reload Obsidian and enable Recipe Box in Settings → Community plugins.

## Getting started

Drop a note into the `Recipes` folder (created automatically the first time you enable the plugin), structure ingredients and instructions under headings of your choice, and open it. Recipe Box detects any note in that folder as a recipe and offers to switch into recipe view, no frontmatter required.

Want recipes somewhere else, or mixed in with other notes? Change the recipe folder, or set a recipe type value (`recipe`, for example, matched against a frontmatter property) to narrow detection further, under **Settings → Recipe Box → Recipe library**.

## License

GPL-3.0-or-later
