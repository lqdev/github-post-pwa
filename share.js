// Share target logic: parse the shared payload and open a pre-filled GitHub issue
// on the website repo using the matching issue-form template.

const TARGET_REPO = 'lqdev/luisquintanilla.me';

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
const responseTypeInput = document.getElementById('f-response-type');

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

// Build and open a pre-filled GitHub issue on the matching issue-form template. Keeping
// `template=` means GitHub shows the styled form; the values come from the edited fields.
function openIssue(fields) {
    const query = new URLSearchParams(fields).toString();
    window.location.href = `https://github.com/${TARGET_REPO}/issues/new?${query}`;
}

// Read the current (possibly edited) field values.
function currentValues() {
    return {
        title: titleInput.value.trim(),
        url: urlInput.value.trim(),
        notes: notesInput.value,
        responseType: responseTypeInput.value,
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

document.getElementById('response-btn').addEventListener('click', () => {
    const { title, url, notes, responseType } = currentValues();
    if (!requireUrl(url)) return;
    const postTitle = title || 'Shared Content';
    openIssue({
        template: 'post-response.yml',
        title: `[Response] ${postTitle}`,
        response_type: responseType,
        target_url: url,
        post_title: postTitle,
        content: notes,
    });
});

document.getElementById('readlater-btn').addEventListener('click', () => {
    const { title, url } = currentValues();
    if (!requireUrl(url)) return;
    // url_title mirrors the editable Title field; if the user cleared it, the site
    // auto-fetches the real page title from the URL.
    openIssue({
        template: 'add-read-later.yml',
        title: `[Read Later] ${title || url}`,
        url: url,
        url_title: title,
    });
});
