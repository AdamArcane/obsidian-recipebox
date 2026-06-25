# Recipe Box - working notes for Claude Code

Obsidian plugin (TypeScript, esbuild). Plan meals, manage a grocery list,
and view recipes as interactive cards — all backed by plain markdown
notes in the user's vault.

This is a clean-room implementation. Do not reference, port, or compare
against any other plugin's source. Build everything here from first
principles and the specs/instructions given in-session.

## Build

- `npm run dev` — watch build
- `npm run build` — typecheck + production build + lint
- `npm run lint` / `npm run lint:fix`

License: GPL-3.0-or-later. Recipe extraction uses the `recipe-scrapers`
dependency rather than hand-rolled parsing — don't reimplement that.

## Code conventions

- **Small, single-purpose files.** Prefer many small files over a few
  large ones with multiple responsibilities. If a file is doing more than
  one job, split it.
- **File headers.** Every `.ts` file gets a short JSDoc comment at the
  top: 1-4 lines, what the file is responsible for and any non-obvious
  constraints. No created-date, no revision history — git already owns
  that. Don't pad simple files out to match a template.
- **No em dashes** in comments, docs, or any user-facing text.
- **Frontmatter access goes through typed helpers, never raw casts.**
  `cache?.frontmatter` is `any` — always route through a typed
  `getFrontmatter(cache)`-style helper (or the existing
  `frontmatter-lookup.ts` `findValue`) rather than accessing
  `cache?.frontmatter?.[x]` directly at call sites.
- **Frontmatter property names are always configurable settings**, never
  a hardcoded string literal in logic. If a feature reads a frontmatter
  property, there's a settings field for its name (with a sensible
  default), even if that field is small and easy to overlook.
- **Promise handling:** async callbacks passed to DOM event listeners or
  Obsidian `Setting`/button `onClick` handlers must not be passed as bare
  `async () => {...}`. Either make the callback sync and `void` the async
  call inside it, or explicitly `void` the call at the call site. Never
  leave a floating, unawaited promise.
- **Don't reach for `getMostRecentLeaf()`** when reacting to a specific
  file-open/file-menu event — it's unreliable for fast tab-creation
  sequences. Use the leaf the event actually gives you, or derive it from
  the workspace's current active view, not a second independent guess.
- **Styling:** no direct `element.style.x = ...` assignment. Use CSS
  classes toggled via `addClass`/`removeClass`/`toggleClass` for
  binary states, or Obsidian's `setCssProps()` for genuinely dynamic
  runtime values (drag positions, computed popover coordinates).
- **No `console.log`** left in shipped code — Obsidian's review flags
  this directly.
- **No `innerHTML`/`outerHTML`** — build DOM with `createEl`/`createSpan`/
  `empty()`, or use `.textContent` for plain text.
- **Settings that always travel together get one toggle, not several.**
  If two fields are never meaningfully used independently, merge them
  rather than exposing both as separate switches.

## Architecture notes

- Recipe folders (where to scan) and recipe type (what counts as a
  recipe) combine with AND, not OR — folders narrow scope, type filters
  within that scope.
- Meal plan entries are weekday-based (Monday/Tuesday/...), not dated —
  this is deliberate, not a placeholder. Don't introduce real dates into
  that model without a real design conversation first.
- The meal plan note and grocery note are markdown — always the source
  of truth. Plugin state mirrors them; never let state and note content
  drift without an explicit sync path.
- Mobile and desktop deliberately diverge in a few places (the mobile
  scale modal, mobile's fixed-position Prep/Cook/Total badges, mobile's
  Info-tab cook-history preview vs desktop's sidebar). These are
  intentional, documented divergences — don't "fix" one platform to match
  the other without checking whether it's deliberate first.

## When unsure

Ask before guessing on anything touching: settings shape/naming, how two
features should relate (e.g. does X depend on Y being enabled), or
whether something is a bug vs. intentional platform-specific behavior.
