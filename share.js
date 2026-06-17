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

// --- Safe preview rendering (shared content is untrusted; never use innerHTML) ---

const pageInfo = document.getElementById('page-info');

function strong(text) {
    const el = document.createElement('strong');
    el.textContent = text;
    return el;
}

function labeledValue(label, value) {
    const fragment = document.createDocumentFragment();
    fragment.append(strong(label), document.createTextNode(value), document.createElement('br'));
    return fragment;
}

function renderPreview() {
    pageInfo.replaceChildren();

    if (parsed.title && parsed.url) {
        pageInfo.append(strong('✅ Ready to post'), document.createElement('br'));
        pageInfo.append(labeledValue('Title: ', parsed.title));
        pageInfo.append(strong('URL: '));
        appendUrl(parsed.url);
    } else if (parsed.title || parsed.url) {
        pageInfo.append(strong('⚠️ Partial data detected'), document.createElement('br'));
        if (parsed.title) pageInfo.append(labeledValue('Title: ', parsed.title));
        if (parsed.url) {
            pageInfo.append(strong('URL: '));
            appendUrl(parsed.url);
        }
    } else {
        pageInfo.append(strong('❌ No content detected'), document.createElement('br'));
        pageInfo.append(document.createTextNode('Raw shared text: ' + (sharedText || 'None')));
    }
}

// Only render http(s) URLs as clickable links; anything else is shown as plain text.
function appendUrl(url) {
    if (/^https?:\/\//i.test(url)) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = url;
        pageInfo.append(link);
    } else {
        pageInfo.append(document.createTextNode(url));
    }
}

renderPreview();

// --- Issue creation ---

// Build and open a pre-filled GitHub issue. `fields` are the issue-form field ids.
function openIssue(fields) {
    const query = new URLSearchParams(fields).toString();
    window.location.href = `https://github.com/${TARGET_REPO}/issues/new?${query}`;
}

const postTitle = parsed.title || 'Shared Content';

document.getElementById('bookmark-btn').addEventListener('click', () => {
    openIssue({
        template: 'post-bookmark.yml',
        title: `[Bookmark] ${postTitle}`,
        target_url: parsed.url,
        post_title: postTitle,
        content: formattedContent,
    });
});

document.getElementById('response-btn').addEventListener('click', () => {
    openIssue({
        template: 'post-response.yml',
        title: `[Response] ${postTitle}`,
        target_url: parsed.url,
        post_title: postTitle,
        content: formattedContent,
    });
});

document.getElementById('readlater-btn').addEventListener('click', () => {
    // Read Later only needs a URL; leave url_title blank so the site fetches the
    // real page title automatically when it isn't available from the share.
    openIssue({
        template: 'add-read-later.yml',
        title: `[Read Later] ${parsed.title || parsed.url}`,
        url: parsed.url,
        url_title: parsed.title || '',
    });
});
