# Recipe Box

Plan meals, build grocery lists, and view recipes as interactive cards, all stored as plain markdown in your vault.

Recipe Box treats recipes the same way Obsidian treats everything else: as notes you own. Meal plans and grocery lists are markdown files too, so you can edit them by hand, query them with Dataview or Bases, and sync them with whatever sync solution you already use.

<img width="800"  alt="device-mockup" src="https://github.com/user-attachments/assets/f71bde46-511a-41e9-9a60-3bde915a4748" />

## Features

### Recipe view
Open any recipe note and Recipe Box renders it as an interactive card: a scalable ingredient list, step-by-step instructions, nutrition info, and configurable header badges (prep time, cook time, diet tags, or any frontmatter property you want surfaced). Scale a recipe up or down and every ingredient amount updates automatically.

### Meal planning
Drag recipes onto a weekly planner, including straight from the file explorer. A queue holds anything you haven't scheduled yet. Mark a day as leftovers without attaching a recipe. The plan itself lives in a single markdown note you can read and edit directly.

### Grocery list
Ingredients from your meal plan are automatically consolidated into a grocery list, grouped by category, recipe, or source. Add one-off items, check things off as you shop, and export the list in a few formats. The list is a markdown note, so it's just as editable by hand as it is through the plugin.

### Recipe import
Paste a URL from most recipe sites and Recipe Box extracts the ingredients, instructions, and metadata into a new note. Plain text and pasted captions work too, for recipes that don't come from a structured webpage.

### Cook history
Mark a recipe as cooked and Recipe Box can log the date, notes, and a photo to the note, store a queryable date array in frontmatter (for Dataview or Bases), or both.

### Timers
Step instructions with a duration ("bake for 30 minutes") get a tappable timer inline, with support for running several at once.

## Settings

Recipe Box is built to adapt to how you already organize your vault rather than imposing its own structure:

- Recipe detection works off folder location, a frontmatter property, or both
- Frontmatter property names are configurable throughout (ratings, allergens, nutrition, cook history, and more)
- Category rules for the grocery list can be based on a dictionary, tags, or your own overrides
- Meal-type notation can be written as nested tags, a Dataview inline field, or plain text, so it works whether or not you use Dataview

## Browsing and organizing recipes

Recipe Box doesn't include its own collection or index view. Obsidian's Bases and the Dataview plugin already do this well, so a tag or frontmatter property (`collection: weeknight`, for example) combined with a Base or Dataview query gives you sorting, filtering, and grouping without Recipe Box reinventing it. A starter Base is will be soon included if you want a working recipe browser without building one yourself.

## Installation

Recipe Box is not yet listed in the Obsidian community plugin directory. Install via BRAT (recommended for beta testing) or manually.

### BRAT (recommended)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from the Obsidian community plugins directory and enable it.
2. Open BRAT settings and click **Add Beta Plugin**.
3. Enter `AdamArcane/obsidian-recipebox` and click **Add Plugin**.
4. Enable Recipe Box in Settings → Community plugins.

BRAT will notify you when new releases are available and can update the plugin automatically.

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
