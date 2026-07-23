---
title: "Pattern: GitHub Issue-Form URL Prefill Re-Seeds on Turbo Re-Render"
description: "Fields in a GitHub YAML issue *form* prefilled via URL query params snap back to the URL values when edited; finalise edits in the referrer app before handoff, or use a classic ?body= issue."
entry_type: pattern
published_date: "2026-07-23 16:10 -05:00"
last_updated_date: "2026-07-23 16:10 -05:00"
tags: "javascript, web, github, patterns"
related_skill: ""
source_project: "github-post-pwa"
---

## Discovery

`github-post-pwa` is a share-target PWA that turns a browser share / bookmarklet into a
pre-filled GitHub issue on my website repo (`lqdev/luisquintanilla.me`). It deep-links into
a **GitHub YAML issue _form_** with the values encoded as URL query params:

```
https://github.com/lqdev/luisquintanilla.me/issues/new
  ?template=post-bookmark.yml
  &title=[Bookmark]%20Some%20Page
  &target_url=https://example.com
  &content=A%20quote%20I%20wanted%20to%20save
```

The form opened perfectly pre-filled — but the moment I tried to **edit a pre-filled field
on GitHub's form** (fix a typo in the title, trim the quote), it would *revert to the value
from the URL*. In the reporter's words: "when I try to edit the title in the template, it
gets populated again with whatever it was originally populated with." Editing before submit
was effectively impossible.

## Root Cause

GitHub's issue-form UI is a **Turbo / React application**, and query-param prefill is
implemented by **seeding the field values from the URL on (re-)render** — not as a one-time
initial value. The seeding re-runs on ordinary re-render triggers:

- Tab blur/refocus
- Turbo navigation + **bfcache** (back/forward cache) restore
- Draft reconciliation / hydration

Every re-seed **re-asserts the URL values over whatever you just typed**, so in-progress
edits get clobbered. Crucially:

- It happens on **github.com**, a different origin from the PWA — so there is **no
  cross-origin, client-side fix** the referring app can apply to stop it.
- The user's own symptom ("it repopulates with the original") is proof the **URL value
  reliably wins** over a stale draft. That's the key insight that makes the fix below safe.

Not all GitHub prefill behaves this way — know the difference:

| Mechanism | Prefills | Editable on GitHub? |
| --- | --- | --- |
| **Classic** issue template `?title=&body=&labels=` | a plain `<textarea>`, once | ✅ freely editable, no re-seed |
| **YAML issue _form_** `?template=x.yml&<field_id>=…` | structured form fields, on every render | ⚠️ edits can revert (re-seed) |

## Solution

**Edit in the referrer you control, not on the form you don't.** Move all editing into the
PWA, let the user finalise the values there, then hand off the finished values and only
**Submit** on GitHub. Because the user never edits on GitHub, the re-seed is harmless — it
just re-asserts the values you already finalised.

`share.html` became a small editable review screen (Title / URL / Notes / Response type).
Each post-type button builds the issue-form URL from the **live edited** field values at
click time:

```js
function currentValues() {
    return {
        title: titleInput.value.trim(),
        url: urlInput.value.trim(),
        notes: notesInput.value,
        responseType: responseTypeInput.value,
    };
}

// Keeping template= means GitHub still renders the styled form; the values are the
// user's finalised edits, so the re-seed can only re-assert them.
function openIssue(fields) {
    const query = new URLSearchParams(fields).toString();
    window.location.href = `https://github.com/${TARGET_REPO}/issues/new?${query}`;
}

document.getElementById('bookmark-btn').addEventListener('click', () => {
    const { title, url, notes } = currentValues();
    if (!requireUrl(url)) return;
    const postTitle = title || 'Shared Content';
    openIssue({
        template: 'post-bookmark.yml',
        title: `[Bookmark] ${postTitle}`,
        target_url: url,
        post_title: postTitle,
        content: notes,
    });
});
```

This keeps the **styled form** the user wanted *and* required **zero changes downstream**:
the repo's GitHub Actions parse the submitted issue **body markdown** (regex on `### Label`
sections) and gate on the issue **label** — they are agnostic to how the fields got filled,
so the produced body is identical.

### Field-id → label contract (must stay exact)

GitHub builds each `### Heading` in the issue body from the form field's **label**, and the
Action regexes match those headings, so the query-param **field `id`s** must line up:

`target_url`→"Target URL", `post_title`→"Title", `content`→"Content (Optional)",
`response_type`→"Response Type", `url`→"URL", `url_title`→"URL Title (Optional)".

Dropdowns (e.g. `response_type`) prefill by the **exact option text** (case-sensitive) via
the field id — `response_type=reshare`, not an index. Multi-selects repeat the param.

## Prevention

- **Assume on-form edits revert** whenever you deep-link into a GitHub issue **form** with
  prefilled values. Design the flow so the user **finalises values before handoff** and only
  submits on GitHub.
- **There is no fix from the referring origin** — it's cross-origin GitHub behaviour. Don't
  waste time trying `postMessage`, focus hacks, or re-writing the URL after load.
- **Alternative when you don't need the styled form:** use a **classic** issue via
  `?title=&body=&labels=`. It fills a plain textarea once and is freely editable on GitHub —
  but requires blank/classic issues to be enabled (no `blank_issues_enabled: false` in
  `.github/ISSUE_TEMPLATE/config.yml`) and you lose the structured form UI and its validation.
- **Bump the service-worker `CACHE_NAME`** on any change to the PWA's cached assets
  (`share.html`/`share.js`/`styles.css`) or installed clients keep serving the old flow.
- **Code-review red flag:** "prefilled GitHub form fields revert when the user edits them."
  The answer is almost always *edit upstream, submit downstream*.
