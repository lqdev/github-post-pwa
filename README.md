# GitHub Post Creator

A minimal, installable **Progressive Web App (PWA)** that turns your phone's (or
desktop's) **Share** button into a one-tap shortcut for posting to my website,
[luisquintanilla.me](https://github.com/lqdev/luisquintanilla.me).

Share any page → pick a post type → it opens a **pre-filled GitHub issue**. A GitHub
Action on the website repo then turns that issue into a published post via pull request.
No app store, no backend of its own — just a static PWA hosted on GitHub Pages.

> **Live app:** https://lqdev.github.io/github-post-pwa/

- **Quick Capture**: Post from any app via the native share sheet
- **Three post types**: 🔖 Bookmark, 💬 Response, 📖 Read It Later
- **Zero backend**: Static PWA → pre-filled GitHub issue → Action publishes it
- **Installable & offline-capable**: Service worker caches the app shell
- **No dependencies, no build step**: Pure HTML, CSS, and vanilla JavaScript

## How It Works

```
Share sheet (any app)
        │  title / text / url
        ▼
PWA  share.html  ──(parse + pick type)──►  github.com/lqdev/luisquintanilla.me
        │                                    /issues/new?template=<type>.yml&<prefilled fields>
        ▼
GitHub Action on the website repo ──► generates the post ──► opens a PR ──► merge ──► live
```

The PWA itself never talks to a server. It only constructs a GitHub "new issue" URL with
the right [issue-form template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
and query parameters pre-filled. All the publishing automation lives in the website repo.

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
   Installing is what registers the app as a **Windows share target** — see the desktop
   note under *Usage* below.

## Usage

1. While viewing any page (browser, reader app, etc.), tap **Share**
2. Choose **GitHub Post Creator** from the share sheet
3. Confirm the detected title/URL in the preview, then pick a post type:
   - **🔖 Bookmark** — save a link with optional commentary
   - **💬 Response** — reply to / comment on a link
   - **📖 Read It Later** — quickly stash a link to read later
4. GitHub opens a pre-filled issue form — review and **Submit**
5. The website's Action takes it from there (PR → merge → live)

> **Note (Android):** Web Share Target works once the app is **installed**. On iOS,
> Safari does not support the Web Share *Target* API, so the installed icon acts mainly
> as a launcher; the share-into-app flow is an Android/Chromium capability.

> **Note (Desktop / Windows + Brave):** Once **installed**, the app registers as a
> Windows share target and shows up in the **Windows share dialog** — this works in Brave
> (it's core Chromium PWA plumbing, not a Google service). The catch: Brave's desktop
> toolbar has no built-in "Share this page" button, so you need a way to open the share
> sheet. Brave *does* support the Web Share API, so the simplest trigger is a one-line
> bookmarklet — save this as a bookmark and click it on any page:
>
> ```js
> javascript:(function(){navigator.share({title:document.title,url:location.href}).catch(function(){})})()
> ```
>
> It opens the Windows share sheet; pick **GitHub Post Creator** and continue as usual.
> If the app doesn't appear, reinstall it, and don't use a **Tor/private** window (Brave
> disables `navigator.share()` there). For the most polished native Windows Share
> integration, **Edge** is the smoothest fallback. As a no-share-sheet option on any
> desktop browser, open `share.html` directly with query params:
> `…/share.html?title=Example&url=https://example.com&text=notes`.

## Post Types

| Action            | Issue template       | Issue title prefix | Pre-filled fields                | Notes                                                              |
|-------------------|----------------------|--------------------|----------------------------------|-------------------------------------------------------------------|
| 🔖 Bookmark       | `post-bookmark.yml`  | `[Bookmark]`       | `target_url`, `post_title`, `content` | Shared text becomes a Markdown blockquote in `content`       |
| 💬 Response       | `post-response.yml`  | `[Response]`       | `target_url`, `post_title`, `content` | Same fields as Bookmark                                       |
| 📖 Read It Later  | `add-read-later.yml` | `[Read Later]`     | `url`, `url_title`               | `url_title` left blank → the site auto-fetches the page title; entries auto-expire |

## Project Structure

```
/
├── index.html      # Install / landing page
├── share.html      # Share-target handler (Bookmark / Response / Read It Later)
├── app.js          # Install prompt + service worker registration
├── share.js        # Parses shared content, builds pre-filled issue URLs
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
> (e.g. `github-post-v4` → `github-post-v5`) so already-installed clients pick up the new
> version instead of serving the old cached shell.

## Configuration (personal setup notes)

This app is intentionally hardcoded to my setup. The things to know if I ever change it:

- **Target repo & templates** — `share.js`: `TARGET_REPO = 'lqdev/luisquintanilla.me'`
  and the three template filenames (`post-bookmark.yml`, `post-response.yml`,
  `add-read-later.yml`). These must match the issue-form templates in the website repo's
  `.github/ISSUE_TEMPLATE/`, including their field `id`s (`target_url`, `post_title`,
  `content`, `url`, `url_title`).
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
- **Response sub-type** selector (reply / like / repost / RSVP)
- Remember the last-used post type; optional offline queue for shares made while offline

## License

[MIT](LICENSE)
