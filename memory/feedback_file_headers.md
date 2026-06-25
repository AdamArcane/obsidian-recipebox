---
name: file-header-convention
description: Every new .ts file under src/ must have a JSDoc header at the top (before imports) per cleanroom-specs section 32
metadata:
  type: feedback
---

Every `.ts` file under `src/` must begin with a JSDoc-style header comment placed before any imports.

**Format:**
```ts
/**
 * One or two sentences: what this file is responsible for.
 *
 * Optional second paragraph: constraints, gotchas, or what this file
 * deliberately does NOT do.
 */
```

**Rules:**
- 1–4 lines of actual content; one sentence is enough for simple files
- No dates, no author, no revision history — git owns those
- Mention sibling files when there's an adjacent responsibility split worth calling out

**Why:** cleanroom-specs.md section 32 — a deliberate project convention.

**How to apply:** Whenever creating a new `.ts` file in this project, add the header as the very first thing before imports. When editing an existing file that is missing the header, add it.
