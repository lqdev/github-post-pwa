// Share target logic: parse the shared payload, let the user edit it, and hand the post to
// GitHub as a ready-to-submit issue on the website repo (see issue-core.js).

const issueCore = window.IssueCore;

// Non-global regex for membership tests (`.test()` is stateless without the /g flag).
const URL_RE = /https?:\/\/[^\s]+/;
// Global regex for extracting every URL from a block of text.
const URL_RE_GLOBAL = /https?:\/\/[^\s]+/g;

const params = new URLSearchParams(window.location.search);
const sharedTitle = params.get('title') || '';
const sharedUrl = params.get('url') || '';
const sharedText = params.get('text') || '';

// Strip text-fragment noise (e.g. "#:~:text=...") that makes shared URLs messy.
function cleanUrl(url) {
    if (!url) return '';
    return url.includes('#:~:text=') ? url.split('#:~:text=')[0] : url;
}

// Parse the shared payload into { title, url, content }. The Web Share API is
// inconsistent across platforms: sometimes title/url are populated directly,
// other times everything arrives mashed together in `text`.
function parseSharedContent() {
    if (sharedTitle && sharedUrl) {
        return { title: sharedTitle, url: cleanUrl(sharedUrl), content: sharedText };
    }

    if (!sharedText) {
        return { title: sharedTitle, url: cleanUrl(sharedUrl), content: '' };
    }

    const lines = sharedText.split('\n').map(line => line.trim()).filter(Boolean);
    const urls = sharedText.match(URL_RE_GLOBAL) || [];
    const extractedUrl = urls.length ? cleanUrl(urls[0]) : '';

    let extractedTitle = '';
    const contentLines = [];

    for (const line of lines) {
        if (URL_RE.test(line)) continue; // skip lines that are/contain a URL

        if (line.startsWith('"') && line.endsWith('"')) {
            extractedTitle = line.slice(1, -1); // prefer quoted text as the title
        } else if (!extractedTitle) {
            extractedTitle = line; // otherwise use the first non-URL line
        }

        contentLines.push(line);
    }

    return {
        title: sharedTitle || extractedTitle,
        url: sharedUrl ? cleanUrl(sharedUrl) : extractedUrl,
        content: contentLines.join('\n'),
    };
}

const parsed = parseSharedContent();

// Format the captured content as a Markdown blockquote for bookmark/response posts.
const formattedContent = parsed.content
    ? parsed.content.split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .filter(line => !URL_RE.test(line))
        .map(line => '> ' + line)
        .join('\n')
    : '';

// --- Editable review screen (shared content is untrusted; never use innerHTML) ---

const pageInfo = document.getElementById('page-info');
const titleInput = document.getElementById('f-title');
const urlInput = document.getElementById('f-url');
const notesInput = document.getElementById('f-notes');
const tagsInput = document.getElementById('f-tags');

// Prefill the editable fields from the parsed share. The user finalises the values here,
// then just submits on GitHub — so GitHub's form re-seeding can't clobber their edits.
titleInput.value = parsed.title || '';
urlInput.value = parsed.url || '';
notesInput.value = formattedContent;

// Short, safe status line reflecting whether a URL was detected.
function renderStatus() {
    pageInfo.textContent = urlInput.value.trim()
        ? '✅ Review the fields above, then choose a post type.'
        : '⚠️ No URL detected — add one above before posting.';
}

renderStatus();

// --- Issue creation ---

// Open the "new issue" page on GitHub for one post. `params` comes from
// issueCore.buildIssue(): either a styled issue form (template=...) or a blank issue with
// the text and label already written. Returns false when the link would be too long.
function openIssue(params) {
    const url = issueCore.issueUrl(params);
    if (url.length > issueCore.MAX_URL_LENGTH) {
        pageInfo.textContent = '⚠️ That is too much text to send to GitHub in one link. Shorten the notes and try again.';
        return false;
    }
    window.location.href = url;
    return true;
}

// Read the current (possibly edited) field values.
function currentValues() {
    return {
        title: titleInput.value.trim(),
        url: urlInput.value.trim(),
        notes: notesInput.value,
        tags: issueCore.normalizeTags(tagsInput.value),
    };
}

// A target URL is required for every post type.
function requireUrl(url) {
    if (url) return true;
    urlInput.classList.add('invalid');
    urlInput.focus();
    return false;
}

urlInput.addEventListener('input', () => {
    urlInput.classList.remove('invalid');
    renderStatus();
});

document.getElementById('bookmark-btn').addEventListener('click', () => {
    const { title, url, notes, tags } = currentValues();
    if (!requireUrl(url)) return;
    openIssue(issueCore.buildIssue('bookmark', {
        title: title || 'Shared Content',
        url,
        notes,
        tags,
    }));
});

// The 💬 Response button opens the Response panel; see response.js.

document.getElementById('readlater-btn').addEventListener('click', () => {
    const { title, url } = currentValues();
    if (!requireUrl(url)) return;
    // url_title mirrors the editable Title field; if the user cleared it, the site
    // auto-fetches the real page title from the URL.
    openIssue(issueCore.buildIssue('readLater', {
        url,
        title,
        issueTitle: title || url,
    }));
});

window.shareFlow = {
    currentValues,
    openIssue,
    params,
    parsed,
    renderStatus,
    requireUrl,
};
