# GitHub Post Creator

A minimal, installable **Progressive Web App (PWA)** that turns your phone's (or
desktop's) **Share** button into a one-tap shortcut for posting to my website,
[luisquintanilla.me](https://github.com/lqdev/luisquintanilla.me).

Share any page → tweak the title/URL/notes if you like → pick a post type or follow the site → it opens a
**pre-filled GitHub issue**. A GitHub Action on the website repo then turns that issue into
a published post via pull request. No app store, no backend of its own — just a static PWA
hosted on GitHub Pages.

> **Live app:** https://lqdev.github.io/github-post-pwa/

- **Quick Capture**: Post from any app via the native share sheet
- **Edit before you post**: Tweak the title, URL, or notes in the app — your changes carry into the GitHub issue
- **Four post types**: 🔖 Bookmark, 💬 Response, ➕ Follow, 📖 Read It Later
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
        ▼
GitHub Action on the website repo ──► generates the post ──► opens a PR ──► merge ──► live
```

The PWA has no backend of its own. For Follow, it may make a best-effort read of the
shared page when that site permits CORS, but all publishing and fallback discovery run in
the website repo. The handoff is a GitHub "new issue" URL with the right
[issue-form template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
and query parameters pre-filled.

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
3. **Edit the title, URL, or notes** right in the app if you want, then pick a post type:
   - **🔖 Bookmark** — save a link with optional commentary
   - **💬 Response** — reply to / comment on a link (choose a response type)
   - **➕ Follow** — choose a feed and add the site to the blogroll or podroll
   - **📖 Read It Later** — quickly stash a link to read later
4. GitHub opens a pre-filled issue form with your final values — just **Submit**
5. The website's Action takes it from there (PR → merge → live)

> **Why edit in the app instead of on GitHub?** GitHub's issue *forms* re-seed their fields
> from the URL whenever the page re-renders, so edits typed *on GitHub* can snap back to the
> original values. The app sidesteps that: finalize the fields here, then just submit the
> pre-filled form on GitHub. The publishing Action is unchanged — it reads the issue body + label.

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
> javascript:(function(){var p=new URL('https://lqdev.github.io/github-post-pwa/share.html');p.searchParams.set('intent','follow');p.searchParams.set('url',location.href);p.searchParams.set('title',document.title);document.querySelectorAll('link[rel~="alternate"][type],a[type]').forEach(function(e){var t=(e.getAttribute('type')||'').toLowerCase();if(['application/rss+xml','application/atom+xml','application/feed+json'].includes(t)){try{var f=new URL(e.getAttribute('href')||'',location.href);p.searchParams.append('feed',f.href);p.searchParams.append('feed_title',e.getAttribute('title')||e.textContent.trim()||'Feed');}catch(_){}}});location.href=p.href;})();
> ```

## Post Types

| Action            | Issue template       | Issue title prefix | Pre-filled fields                              | Notes |
|-------------------|----------------------|--------------------|------------------------------------------------|-------|
| 🔖 Bookmark       | `post-bookmark.yml`  | `[Bookmark]`       | `target_url`, `post_title`, `content`           | Shared text becomes a Markdown blockquote in `content` |
| 💬 Response       | `post-response.yml`  | `[Response]`       | `target_url`, `post_title`, `content`           | Same fields as Bookmark |
| ➕ Follow         | `follow.yml`         | `[Follow]`         | `feed_url` (optional), `site_url`, `site_title`, `roll` | A feed is mandatory; a missing `feed_url` asks the site's Action to discover one |
| 📖 Read It Later  | `add-read-later.yml` | `[Read Later]`     | `url`, `url_title`                             | Clear the Title field → the site auto-fetches the page title; entries auto-expire |

### Follow feed selection

The PWA merges feed candidates only from explicit handoff parameters, a URL that is
already a feed, or a best-effort CORS fetch of the shared page. It does not infer feed
URLs from a site's hostname or platform-specific URL conventions. Candidates are displayed
with 44px touch targets, and a user can always enter a feed manually.

If the browser cannot inspect the page, choose **Let GitHub find the feed**. The website
Action then performs server-side autodiscovery. One feed creates the roll PR; multiple
feeds are shown in an issue comment where exactly one must be selected. If the Action
cannot find any feed, it explains the failure and closes the issue as not planned. No
blogroll/podroll entry is written without a feed.

## Project Structure

```
/
├── index.html      # Install / landing page
├── share.html      # Editable review screen + post-type buttons (including Follow)
├── app.js          # Install prompt + service worker registration
├── share.js        # Parses the share, prefills editable fields, builds pre-filled issue URLs
├── follow-core.js  # Pure URL, handoff, and feed-discovery helpers
├── follow.js       # Mobile follow panel and best-effort feed picker
├── tests/
│   └── follow-core.test.js # Node tests for the follow helpers
├── styles.css      # Shared styles for both pages
├── manifest.json   # PWA manifest (name, icons, share_target)
├── sw.js           # Service worker (offline app-shell cache)
├── icon.webp       # App icon
├── icon-192.webp   # 192×192 icon
├── icon-512.webp   # 512×512 icon
├── LICENSE         # MIT
└── README.md       # This file
```

## Technical Details

- **Type**: Installable, offline-capable Progressive Web App
- **Share integration**: [Web Share Target API](https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target)
  via `manifest.json` (`GET` → `share.html` with `title` / `text` / `url`)
- **Service worker**: cache-first app shell (`sw.js`)
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

Run the dependency-free follow helper tests with:

```bash
node --test tests/follow-core.test.js
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
> (e.g. `github-post-v5` → `github-post-v6`) so already-installed clients pick up the new
> version instead of serving the old cached shell.

## Configuration (personal setup notes)

This app is intentionally hardcoded to my setup. The things to know if I ever change it:

- **Target repo & templates** — `share.js`: `TARGET_REPO = 'lqdev/luisquintanilla.me'`
  and the template filenames (`post-bookmark.yml`, `post-response.yml`, `follow.yml`,
  `add-read-later.yml`). These must match the issue-form templates in the website repo's
  `.github/ISSUE_TEMPLATE/`, including their field `id`s (`target_url`, `post_title`,
  `content`, `response_type`, `feed_url`, `site_url`, `site_title`, `roll`, `url`, `url_title`).
- **Pages subpath** — `manifest.json` (`start_url`, `scope`, `id`, `share_target.action`)
  and `sw.js` cache paths assume the repo is served at `/github-post-pwa/`.

## Troubleshooting

- **App doesn't appear in the share sheet** → It must be **installed** first, and the
  platform must support Web Share Target (Android/Chromium). iOS Safari doesn't support it.
- **My changes aren't showing up** → Bump `CACHE_NAME` in `sw.js`, or uninstall/reinstall
  the app and hard-refresh.
- **Install option doesn't show** → PWAs require HTTPS (GitHub Pages provides it) or
  `localhost`. Make sure you're not on `file://`.
- **Issue form fields are empty** → A template field `id` likely changed in the website
  repo; update the field names in `share.js` to match.

## Roadmap

- Additional post types already templated on the site: **Note**, **Media**, **Playlist**,
  and **Reviews** (book / movie / music / product / business)
- Remember the last-used post type; optional offline queue for shares made while offline

## License

[MIT](LICENSE)
