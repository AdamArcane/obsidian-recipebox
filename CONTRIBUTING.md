# Contributing to Recipe Box

Recipe Box is currently maintained by a single developer. This document
covers the practical basics for filing issues or pull requests.

## Before filing an issue

Check [Discussions](../../discussions) first if you have a usage question
rather than a bug report or concrete feature idea. Issues are for bugs and
well-scoped feature requests only.

## Filing a bug report

Use the Bug Report template. A reproduction from a clean vault is the
single most useful thing you can include. Include your Recipe Box
version, Obsidian version, and platform.

## Filing a feature request

Use the Feature Request template. Describe the problem or workflow gap,
not just the feature you have in mind. Recipe Box favors static
solutions and existing ecosystem tools (Dataview, Bases) over new
built-in features where those already cover the use case, so explain
what you tried first.

## Pull requests

This project uses a specific git workflow. If you'd like to contribute
code:

1. Fork the repo and branch off `development`, not `main`.
2. Branch naming: `type/short-description`, e.g. `fix/grocery-list-dedup`
   or `feature/export-json-ld`. Valid types: `feature`, `fix`, `chore`,
   `refactor`.
3. Open your PR against `development`. PRs are squash-merged.
4. Keep PRs small and single-purpose. Match the existing code style —
   see the "Code conventions" section below.
5. `main` only gets updated via release scripts, not direct merges.
   Don't target `main` in a PR.

Before opening a PR for anything nontrivial, please open an issue or
discussion first to confirm the approach. This saves you rework if the
direction doesn't fit the plugin's scope.

## Code conventions

* Small, single-purpose files. One responsibility per file.
* Comment for reasoning, not mechanics. Explain why, not what.
* No em dashes in comments, docs, or user-facing text.
* Frontmatter access goes through typed helpers (`getFrontmatter()` or
  `findValue()`), never raw `cache?.frontmatter?.[x]` casts.
* Frontmatter property names are configurable settings, never hardcoded
  string literals.
* No `console.log` in shipped code.
* No `innerHTML`/`outerHTML` — use `createEl`/`createSpan`/`.textContent`.
* No direct `element.style.x = ...` — use CSS classes or `setCssProps()`.

## License

Recipe Box is licensed GPL-3.0-or-later. By contributing, you agree your
contribution is licensed under the same terms.