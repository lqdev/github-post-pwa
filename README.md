# GitHub Post Creator

A minimal, installable **Progressive Web App (PWA)** that turns your phone's (or
desktop's) **Share** button into a one-tap shortcut for posting to my website,
[luisquintanilla.me](https://github.com/lqdev/luisquintanilla.me).

Share any page → tweak the title/URL/notes if you like → pick a post type or follow the site → it opens a
**pre-filled GitHub issue**. Or open the app from your home screen and write a note. A GitHub
Action on the website repo then turns that issue into a published post via pull request. No
app store, no backend of its own — just a static PWA hosted on GitHub Pages.

> **Live app:** https://lqdev.github.io/github-post-pwa/

- **Quick Capture**: Post from any app via the native share sheet
- **Start from the app**: Open it from your home screen to write a note, post media, or post a link
- **Edit before you post**: Tweak the title, URL, notes, or tags in the app — your changes carry into the GitHub issue
- **Nothing to re-select on GitHub**: Response type, RSVP status, and Follow roll are picked in the app and written into the issue
- **Six post types**: 📝 Note, 📷 Media, 🔖 Bookmark, 💬 Response, ➕ Follow, 📖 Read It Later
- **Drafts**: A note or media post in progress is saved on the device, so an accidental close does not lose it
- **Mobile feed picker**: Select a discovered feed, enter one manually, or let the site's GitHub Action discover it
- **Zero backend**: Static PWA → pre-filled GitHub issue → Action publishes it
- **Installable & offline-capable**: Service worker caches the app shell
- **No dependencies, no build step**: Pure HTML, CSS, and vanilla JavaScript

## How It Works

```
Share sheet (any app)
        │  title / text / url
        ▼
PWA  share.html  ──(parse + edit + pick type)──►  github.com/lqdev/luisquintanilla.me
        │                                    /issues/new?template=<type>.yml&<prefilled fields>
        │                                 or /issues/new?title=…&labels=<type>&body=<issue text>
        ▼
GitHub Action on the website repo ──► generates the post ──► opens a PR ──► merge ──► live
```

The PWA has no backend of its own. For Follow, it may make a best-effort read of the
shared page when that site permits CORS, but all publishing and fallback discovery run in
the website repo. The handoff is a GitHub "new issue" URL: either the right
[issue-form template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
with its text fields pre-filled, or a blank issue with the text and label already written
(see [How posts reach GitHub](#how-posts-reach-github)).

## Installation

This is a PWA, so you install it from the browser (not an app store).

### iOS (Safari)

1. Open https://lqdev.github.io/github-post-pwa/ in **Safari**
2. Tap the **Share** button
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

### Android (Chrome)

1. Open https://lqdev.github.io/github-post-pwa/ in **Chrome**
2. Tap the **Install App** button on the page (or use the ⋮ menu → **Install app / Add to Home screen**)
3. Confirm the install

### Desktop (Windows — Brave / Chrome / Edge)

1. Open https://lqdev.github.io/github-post-pwa/
2. Click the **install icon** in the address bar (or the **Install App** button on the page).
   Installing registers the app as a **Windows share target** and gives you a launcher.

> On desktop you don't actually need to install — the recommended trigger is a
> **bookmarklet that opens `share.html` directly** (see the desktop note under *Usage*).

## Usage

1. While viewing any page (browser, reader app, etc.), tap **Share**
2. Choose **GitHub Post Creator** from the share sheet
3. **Edit the title, URL, notes, or tags** right in the app if you want, then pick a post type:
   - **🔖 Bookmark** — save a link with optional commentary
   - **💬 Response** — reshare, star, reply to, or RSVP to a link (pick which on the next screen)
   - **➕ Follow** — choose a feed and add the site to the blogroll or podroll
   - **📖 Read It Later** — quickly stash a link to read later
4. GitHub opens a ready-to-submit issue with your final values — just **Create** it
5. The website's Action takes it from there (PR → merge → live)

### Starting from the app

Open **GitHub Post Creator** from your home screen:

- **📝 Note** — write a title, the note, and optional tags, then **Create note issue**. GitHub
  opens the note form filled in. Your draft is kept on the device as you type; after sending,
  **Restore the last note I sent** brings it back if something went wrong on GitHub.
- **📷 Media** — enter a title, caption, and optional tags, then **Continue to
  GitHub**. A blank issue opens with all of that written in. Files can only be uploaded by
  GitHub's own editor, so the last step happens there: tap at the very end of the text, add
  your photo or video, wait for the upload to finish, then **Create**.
- **🔗 Link** — opens the same screen as sharing a page, with empty fields to paste a URL into.

**Shortcuts:** long-press the app icon on Android (or right-click it on the Windows taskbar)
for **New note**, **New media post**, and **Post a link**, which jump straight to that screen. They come from
`shortcuts` in `manifest.json`. After a release that changes them, an installed app can take
a day or so to pick them up; reinstalling updates them immediately. iOS does not show them.

A note travels to GitHub inside the link, and GitHub rejects very long links. If a note is
too long, the app offers **Copy content and open GitHub** instead: the form opens with the
title and tags filled, and you paste the content into its Content box.

> **Why edit in the app instead of on GitHub?** GitHub's issue *forms* re-seed their fields
> from the URL whenever the page re-renders, so edits typed *on GitHub* can snap back to the
> original values. The app sidesteps that: finalize the fields here, then just submit the
> pre-filled form on GitHub. The publishing Action is unchanged — it reads the issue body + label.
> (Response and Follow open a plain blank issue rather than a form, so their text *can* be
> edited on GitHub — just leave the `### Heading` lines alone.)

> **Note (Android):** Web Share Target works once the app is **installed**. On iOS,
> Safari does not support the Web Share *Target* API, so the installed icon acts mainly
> as a launcher; the share-into-app flow is an Android/Chromium capability.

> **Note (Desktop / Windows + Brave, Chrome):** On desktop the cleanest trigger is a
> **bookmarklet that opens `share.html` directly** — it skips the OS share sheet entirely,
> which is the unreliable part on desktop (Brave/Chrome often won't list an installed PWA
> as a share target; Edge is the exception). Save this as a bookmark and click it on any
> page — it passes the page title, URL, and any selected text straight into the app:
>
> ```js
> javascript:(function(){var s=window.getSelection?''+window.getSelection():'';window.open('https://lqdev.github.io/github-post-pwa/share.html?title='+encodeURIComponent(document.title)+'&url='+encodeURIComponent(location.href)+'&text='+encodeURIComponent(s),'_blank','noopener');})();
> ```
>
> **Optional — one bookmarklet for every device** (native share sheet on touch, direct
> `share.html` on desktop): it uses `navigator.share()` only on touch devices and falls
> back to opening `share.html` directly everywhere else (and on any non-cancel error):
>
> ```js
> javascript:(function(){var u='https://lqdev.github.io/github-post-pwa/share.html',t=document.title,l=location.href,s=window.getSelection?''+window.getSelection():'';function go(){window.open(u+'?title='+encodeURIComponent(t)+'&url='+encodeURIComponent(l)+'&text='+encodeURIComponent(s),'_blank','noopener');}if(matchMedia('(pointer:coarse)').matches&&navigator.share){navigator.share({title:t,url:l,text:s}).catch(function(e){if(e&&e.name!=='AbortError')go();});}else{go();}})();
> ```
>
> **Installing a bookmarklet:** you can't install it by clicking the code — create a new
> bookmark and paste the `javascript:…` line in as its **URL** (or drag a pre-made link to
> the bookmarks bar). Strict-CSP sites (e.g. GitHub, X) block `javascript:` bookmarklets,
> so it won't run on those pages.
>
> If you'd rather use the OS share sheet, install the app and share from the **Windows
> share dialog** — most reliable in **Edge**.

> **Optional — feed-aware mobile bookmarklet:** a browser bookmarklet can read feed links
> from the live page (including feeds injected by JavaScript) and open the Follow picker:
>
> ```js
> javascript:(function(){var p=new URL('https://lqdev.github.io/github-post-pwa/share.html');p.searchParams.set('intent','follow');p.searchParams.set('url',location.href);p.searchParams.set('title',document.title);document.querySelectorAll('link[rel~="alternate"][type],a[type]').forEach(function(e){var t=(e.getAttribute('type')||'').toLowerCase(),h=e.getAttribute('href');if(h&&h.trim()&&['application/rss+xml','application/atom+xml','application/feed+json'].includes(t)){try{var f=new URL(h,document.baseURI);p.searchParams.append('feed',f.href);p.searchParams.append('feed_title',e.getAttribute('title')||e.textContent.trim()||'Feed');}catch(_){}}});location.href=p.href;})();
> ```

## Post Types

| Action            | Issue template       | Issue title prefix | Handoff      | What the app fills in                          | Notes |
|-------------------|----------------------|--------------------|--------------|------------------------------------------------|-------|
| 🔖 Bookmark       | `post-bookmark.yml`  | `[Bookmark]`       | Styled form  | `target_url`, `post_title`, `content`, `tags`   | Shared text becomes a Markdown blockquote in `content` |
| 💬 Response       | `post-response.yml`  | `[Response]`       | Blank issue  | Response Type, RSVP Status, Target URL, Title, Content, Tags | Type and RSVP status are picked on the Response screen |
| ➕ Follow         | `follow.yml`         | `[Follow]`         | Blank issue  | Feed URL (optional), Site URL, Title, Roll      | A feed is mandatory; an empty Feed URL asks the site's Action to discover one |
| 📖 Read It Later  | `add-read-later.yml` | `[Read Later]`     | Styled form  | `url`, `url_title`                             | Clear the Title field → the site auto-fetches the page title; entries auto-expire |
| 📝 Note           | `post-note.yml`      | `[Note]`           | Styled form  | `post_title`, `content`, `tags`                 | Started from the home screen; needs a title and at least 3 characters of content |
| 📷 Media          | `post-media.yml`     | `[Media]`          | Blank issue  | Title, Tags, Content and Attachments (caption); Orientation is `None` | The file itself is added on GitHub; the site currently does not apply its Orientation field |

### How posts reach GitHub

GitHub can fill an issue form's **text boxes** from a link, but not its **dropdowns**. So
the app hands a post over in one of two ways, chosen per post type in `issue-core.js`:

- **Styled form** (`template=<type>.yml&<field id>=<value>`) — used when every field the app
  sends is a text box. GitHub shows the usual form, pre-filled.
- **Blank issue** (`title=…&labels=<type>&body=<issue text>`) — used when the form has
  dropdowns (Response Type, RSVP Status, Roll) or needs files (Media). The app
  writes the same text the form would have produced, one `### <Field label>` section per
  field, and pre-selects the label. There is nothing to choose on GitHub; just tap **Create**
  (for Media, after adding the file). Media writes its `Content and Attachments` section
  last, so a file added at the end of the text lands inside it.

The publishing Actions cannot tell the two apart: they only check the issue **label** and
read the `### <Field label>` sections of the issue text. The issue templates themselves are
untouched, so opening GitHub directly and picking a template works as before.

The Actions also stop reading a field when they see a blank line followed by `###` or `---`.
The PWA blocks those sequences in post content and shows an inline message instead of
silently handing GitHub text that would publish truncated (and could leave a media
attachment outside the field).

Because the app mirrors the templates' field ids, labels, and dropdown choices, a change to
a template in the website repo can break a handoff. `node scripts/check-templates.js`
compares the two, and the **Checks** workflow runs it weekly.

### Follow feed selection

The PWA shows feed candidates only from explicit handoff parameters or a best-effort
CORS fetch of the shared page. It does not infer feed URLs from a site's hostname,
platform-specific URL conventions, or a feed-looking path. Candidates are displayed
with 44px touch targets, and a user can always enter a feed manually.

If the browser cannot inspect the page, choose **Let GitHub find the feed**. The website
Action then performs server-side autodiscovery. One feed creates the roll PR; multiple
feeds are added as a checklist to the issue body, where exactly one must be selected
(`/follow N` is also available as a comment fallback). If the Action
cannot find any feed, it explains the failure and closes the issue as not planned. No
blogroll/podroll entry is written without a feed.

## Project Structure

```
/
├── index.html      # Home: post-type tiles, plus install instructions when not installed
├── share.html      # Editable review screen + post-type buttons, Response and Follow panels
├── note.html       # Note screen
├── media.html      # Media screen
├── app.js          # Install prompt + service worker registration
├── issue-core.js   # Post-type registry: turns the entered values into a GitHub "new issue" link
├── drafts.js       # Saves a draft on the device while typing
├── share.js        # Parses the share, prefills editable fields, opens Bookmark / Read It Later
├── response.js     # Response panel: response type and RSVP status
├── note.js         # Note screen: validation, drafts, long-note fallback
├── media.js        # Media screen: validation, drafts, blank-issue handoff
├── follow-core.js  # Pure URL, handoff, and feed-discovery helpers
├── follow.js       # Mobile follow panel and best-effort feed picker
├── scripts/
│   └── check-templates.js  # Compares issue-core.js with the website repo's issue templates
├── tests/
│   ├── check-templates.test.js # Node tests for the template comparison
│   ├── drafts.test.js          # Node tests for draft storage
│   ├── follow-core.test.js     # Node tests for the follow helpers
│   └── issue-core.test.js      # Node tests for the issue text and links
├── .github/workflows/
│   └── checks.yml  # Runs the tests on push/PR and the template comparison weekly
├── styles.css      # Shared styles for both pages
├── manifest.json   # PWA manifest (name, icons, share_target)
├── sw.js           # Service worker (offline app-shell cache)
├── icon.webp       # App icon
├── icon-192.webp   # 192×192 icon
├── icon-512.webp   # 512×512 icon
├── shortcut-*.png  # Icons for the long-press shortcuts (one per shortcut)
├── LICENSE         # MIT
└── README.md       # This file
```

## Technical Details

- **Type**: Installable, offline-capable Progressive Web App
- **Share integration**: [Web Share Target API](https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target)
  via `manifest.json` (`GET` → `share.html` with `title` / `text` / `url`)
- **Service worker**: network-first, with the cached app shell as the offline fallback (`sw.js`)
- **Hosting**: GitHub Pages (`main` branch, root), served over HTTPS
- **Dependencies**: none — no frameworks, no build tooling
- **Target repo**: `lqdev/luisquintanilla.me` (consumes its issue-form templates)

### Follow handoff contract

Desktop extensions or bookmarklets can open the Follow panel directly:

```text
https://lqdev.github.io/github-post-pwa/share.html
  ?intent=follow
  &url=https%3A%2F%2Fexample.com%2Fpost
  &title=Example+Blog
  &feed=https%3A%2F%2Fexample.com%2Ffeed.xml
```

`feed` and `feed_title` may be repeated in parallel to provide several choices. `roll`
accepts `blogroll` or `podroll`; other values default to `blogroll`. Only absolute
`http(s)` URLs without credentials are accepted. The user has final control in the PWA
before the GitHub issue is opened.

## Local Development

Everything is static, but service workers and the PWA install flow require `http(s)`
(not `file://`). Serve the folder from any static server:

```bash
# Python
python -m http.server 8080

# or Node
npx serve
```

Then open http://localhost:8080.

Run the dependency-free tests with:

```bash
node --test
```

Check that the app still matches the website repo's issue templates (needs network):

```bash
node scripts/check-templates.js
```

**Testing the share flow without installing:** the share handler reads `title`, `url`, and
`text` from the query string, so you can exercise it directly:

```
http://localhost:8080/share.html?title=Example&url=https://example.com&text=Some+notes
```

> **Heads-up:** `sw.js` caches absolute paths under the `/github-post-pwa/` Pages subpath.
> When serving at a local root those paths won't resolve, so the service worker may log
> install errors locally — the share/parsing logic still works. To mirror production
> exactly, serve the app under a `/github-post-pwa/` path.

## Deployment

Hosted on **GitHub Pages** (Settings → Pages → Source: `main` / root). Pushing to `main`
publishes to https://lqdev.github.io/github-post-pwa/.

> **When you change cached assets** (HTML/CSS/JS/icons), bump `CACHE_NAME` in `sw.js`
> (e.g. `github-post-v7` → `github-post-v8`) and add any new files to `urlsToCache`. The app
> loads from the network whenever it is online, so a release shows up right away; the bump
> refreshes the copy kept for offline use.

## Configuration (personal setup notes)

This app is intentionally hardcoded to my setup. The things to know if I ever change it:

- **Target repo & templates** — `issue-core.js`: `TARGET_REPO = 'lqdev/luisquintanilla.me'`
  and the `FORMS` registry (one entry per post type: template filename, label, and either the
  template field `id`s it pre-fills or the field **labels** and dropdown choices it writes).
  These must match the issue-form templates in the website repo's `.github/ISSUE_TEMPLATE/`;
  run `node scripts/check-templates.js` after changing either side.
- **Blank issues must stay enabled** on the website repo (no `blank_issues_enabled: false` in
  `.github/ISSUE_TEMPLATE/config.yml`) — Response and Follow rely on them.
- **Pages subpath** — `manifest.json` (`start_url`, `scope`, `id`, `share_target.action`)
  and `sw.js` cache paths assume the repo is served at `/github-post-pwa/`.

## Troubleshooting

- **App doesn't appear in the share sheet** → It must be **installed** first, and the
  platform must support Web Share Target (Android/Chromium). iOS Safari doesn't support it.
- **My changes aren't showing up** → GitHub Pages can take a few minutes to publish. If the
  app is offline it shows its saved copy; bump `CACHE_NAME` in `sw.js` to refresh that copy.
- **Install option doesn't show** → PWAs require HTTPS (GitHub Pages provides it) or
  `localhost`. Make sure you're not on `file://`.
- **Issue form fields are empty** → A template field `id` likely changed in the website
  repo; run `node scripts/check-templates.js` and update `FORMS` in `issue-core.js` to match.
- **A Response or Follow issue was created but nothing happened** → Check the issue has its
  label (`response` / `follow`) and that its `### Heading` lines were not edited on GitHub;
  the Action comments on the issue when it cannot read a field.

## Roadmap

- Additional post types already templated on the site: **Playlist** and **Reviews**
  (book / movie / music / product / business) — each is a new entry in `issue-core.js`'s
  `FORMS` plus a small screen
- Share a photo straight into the app (needs a way to upload files without GitHub's editor)
- Remember the last-used post type; optional offline queue for shares made while offline

## License

[MIT](LICENSE)
