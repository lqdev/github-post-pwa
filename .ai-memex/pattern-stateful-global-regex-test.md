---
title: "Pattern: Stateful lastIndex Bug When Reusing a Global Regex with .test()"
description: "Reusing a /g regex across repeated .test() calls returns alternating true/false because lastIndex advances; use a non-global regex for membership checks."
entry_type: pattern
published_date: "2026-06-17 09:33 -05:00"
last_updated_date: "2026-06-17 09:33 -05:00"
tags: "javascript, web, patterns"
related_skill: ""
source_project: "github-post-pwa"
---

## Discovery

While refactoring the share-target PWA's content parser (`share.html` → `share.js`), a
single global regex was declared once and reused for two different jobs:

```js
const urlRegex = /(https?:\/\/[^\s]+)/g;
const urls = sharedText.match(urlRegex) || [];   // extraction (fine)

for (const line of lines) {
  if (urlRegex.test(trimmed)) {                  // membership test (BUGGY)
    continue;                                    // intended: skip URL-only lines
  }
  // ...build post content from the remaining lines...
}
```

The loop was supposed to skip lines containing a URL when assembling the post body.
Instead it skipped the *wrong* lines: some URL lines slipped through into the content and
some plain-text lines were silently dropped. The bug was position-dependent and looked
non-deterministic across different shared payloads.

## Root Cause

A `RegExp` created with the `g` (global) or `y` (sticky) flag is **stateful**. Both
`.test()` and `.exec()` start matching at `regex.lastIndex` and, on a successful match,
advance `lastIndex` to the end of that match. The next call resumes from there; when no
further match is found, it returns `false` and resets `lastIndex` back to `0`.

So calling `globalRegex.test(str)` repeatedly does **not** answer "does this string match?"
— it walks through match positions and yields alternating results depending on prior calls.

`String.prototype.match(globalRegex)` is unaffected here because `match` with `/g` returns
all matches in one pass, which is why URL *extraction* worked while the per-line membership
test was subtly broken.

## Solution

Use a **non-global** regex for boolean membership tests, and keep the global one only where
you genuinely iterate every match:

```js
const URL_RE = /https?:\/\/[^\s]+/;          // membership tests (.test) — stateless
const URL_RE_GLOBAL = /https?:\/\/[^\s]+/g;  // extract all matches (.match)

const urls = sharedText.match(URL_RE_GLOBAL) || [];   // OK

for (const line of lines) {
  if (URL_RE.test(line)) continue;                    // OK — no lastIndex carryover
  // ...
}
```

Equivalent escape hatches if you must keep a single global regex:

- Reset before each test: `URL_RE_GLOBAL.lastIndex = 0; URL_RE_GLOBAL.test(line);`
- Use a stateless API: `line.search(/https?:\/\/[^\s]+/) !== -1`

The cleanest fix is simply: **don't put `g` on a regex you call `.test()` on.**

## Prevention

- Never share a `/g` or `/y` regex across independent `.test()`/`.exec()` calls.
- For "does this string contain X?", use a non-global regex (hoisted as a `const` without
  `g`, or a cheap inline literal).
- Reserve global regexes for `.match()`, `.matchAll()`, and `.replace(/…/g, …)` where
  iterating all matches is the actual intent.
- Code-review red flag: a global regex variable used inside a loop with `.test(` /
  `.exec(`. The `eslint` rule `no-misleading-character-class` won't catch this, but a
  manual heuristic ("global regex + `.test` = suspicious") will.
