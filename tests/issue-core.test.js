const test = require('node:test');
const assert = require('node:assert/strict');

const {
    MAX_URL_LENGTH,
    TARGET_REPO,
    buildIssue,
    issueUrl,
    normalizeTags,
} = require('../issue-core.js');

// Copied from lqdev/luisquintanilla.me, .github/workflows/process-content-issue.yml.
// This is how the publishing workflow reads one field out of the issue text, so these
// tests prove that the text the app writes is readable by it. Keep in step with that file.
function extractFormValue(body, label) {
    const regex = new RegExp(`### (?:${label})\\s*\\n\\s*\\n([\\s\\S]*?)(?=\\n\\n###|\\n\\n---|$)`, 'i');
    const match = body.match(regex);
    const value = (match && match[1]) ? match[1].trim() : '';
    return value.replace(/^_No response_$/i, '').trim();
}

// The workflow passes labels as regex source with the brackets escaped.
const read = (body, label) => extractFormValue(body, label.replace(/[()]/g, '\\$&'));

test('response issue text matches what the GitHub form writes', () => {
    const issue = buildIssue('response', {
        title: 'TLD Ideas',
        url: 'https://ma.tt/2026/11/tld-ideas/',
        notes: '> Would be nice to give everyone a domain.\n\nThat would be cool.',
        tags: 'web, standards,tld',
        responseType: 'reply',
    });

    assert.deepEqual(issue, {
        title: '[Response] TLD Ideas',
        labels: 'response',
        body: [
            '### Response Type', 'reply',
            '### RSVP Status', '_No response_',
            '### Target URL', 'https://ma.tt/2026/11/tld-ideas/',
            '### Title', 'TLD Ideas',
            '### Content (Optional)', '> Would be nice to give everyone a domain.\n\nThat would be cool.',
            '### Slug (Optional)', '_No response_',
            '### Tags (Optional)', 'web,standards,tld',
        ].join('\n\n'),
    });
});

test('the publishing workflow reads back every response field', () => {
    const { body } = buildIssue('response', {
        title: 'An event',
        url: 'https://example.com/event',
        notes: 'First paragraph.\r\n\r\nSecond paragraph.',
        tags: 'events',
        responseType: 'rsvp',
        rsvpStatus: 'maybe',
    });

    assert.equal(body.includes('\r'), false);
    assert.equal(read(body, 'Response Type'), 'rsvp');
    assert.equal(read(body, 'RSVP Status'), 'maybe');
    assert.equal(read(body, 'Target URL'), 'https://example.com/event');
    assert.equal(read(body, 'Title'), 'An event');
    assert.equal(read(body, 'Content (Optional)'), 'First paragraph.\n\nSecond paragraph.');
    assert.equal(read(body, 'Slug (Optional)'), '');
    assert.equal(read(body, 'Tags (Optional)'), 'events');
});

test('an RSVP status is required for rsvp and dropped for every other type', () => {
    const base = { title: 'T', url: 'https://example.com/' };

    assert.throws(() => buildIssue('response', { ...base, responseType: 'rsvp' }), /RSVP status/);
    assert.throws(() => buildIssue('response', { ...base, responseType: 'rsvp', rsvpStatus: 'not applicable' }), /RSVP status/);

    const reshare = buildIssue('response', { ...base, responseType: 'reshare', rsvpStatus: 'yes' });
    assert.equal(read(reshare.body, 'Response Type'), 'reshare');
    assert.equal(read(reshare.body, 'RSVP Status'), '');
});

test('follow issue text matches the GitHub form and carries the chosen roll', () => {
    const issue = buildIssue('follow', {
        title: 'Maggie Appleton',
        siteUrl: 'https://maggieappleton.com/',
        feedUrl: 'https://maggieappleton.com/rss.xml',
        roll: 'blogroll',
    });

    assert.deepEqual(issue, {
        title: '[Follow] Maggie Appleton',
        labels: 'follow',
        body: [
            '### Feed URL', 'https://maggieappleton.com/rss.xml',
            '### Site URL', 'https://maggieappleton.com/',
            '### Title', 'Maggie Appleton',
            '### Roll', 'blogroll',
        ].join('\n\n'),
    });

    const podcast = buildIssue('follow', { title: 'A Show', siteUrl: 'https://example.com/', feedUrl: '', roll: 'podroll' });
    assert.equal(read(podcast.body, 'Feed URL'), '');
    assert.equal(read(podcast.body, 'Roll'), 'podroll');
});

test('bookmark and read later still open their styled forms', () => {
    assert.deepEqual(
        buildIssue('bookmark', { title: 'A page', url: 'https://example.com/', notes: '> quote', tags: 'web, tools' }),
        {
            template: 'post-bookmark.yml',
            title: '[Bookmark] A page',
            target_url: 'https://example.com/',
            post_title: 'A page',
            content: '> quote',
            tags: 'web,tools',
        }
    );

    // A cleared title is not sent, so the site fetches the page title itself.
    assert.deepEqual(
        buildIssue('readLater', { url: 'https://example.com/', title: '', issueTitle: 'https://example.com/' }),
        {
            template: 'add-read-later.yml',
            title: '[Read Later] https://example.com/',
            url: 'https://example.com/',
        }
    );
});

test('a note opens the styled note form with its text boxes filled', () => {
    assert.deepEqual(
        buildIssue('note', { title: 'Hello', content: 'First.\n\nSecond.', tags: 'rss, web' }),
        {
            template: 'post-note.yml',
            title: '[Note] Hello',
            post_title: 'Hello',
            content: 'First.\n\nSecond.',
            tags: 'rss,web',
        }
    );

    // A note too long for a link is opened without its content, which is pasted on GitHub.
    assert.deepEqual(buildIssue('note', { title: 'Hello', content: '' }), {
        template: 'post-note.yml',
        title: '[Note] Hello',
        post_title: 'Hello',
    });

    assert.throws(() => buildIssue('note', { content: 'No title' }), /Missing title/);
});

test('bad input is rejected instead of producing a broken issue', () => {
    assert.throws(() => buildIssue('podcast', {}), /Unknown post type/);
    assert.throws(() => buildIssue('bookmark', { title: 'No link' }), /Missing url/);
    assert.throws(() => buildIssue('follow', { title: 'T', siteUrl: 'https://example.com/', roll: 'linkroll' }), /Unknown Roll/);
    assert.throws(() => buildIssue('response', { title: 'T', url: 'https://example.com/', responseType: 'like' }), /Unknown Response Type/);
});

test('normalizeTags tidies comma-separated tags', () => {
    assert.equal(normalizeTags(' web , IndieWeb,, rss ,'), 'web,IndieWeb,rss');
    assert.equal(normalizeTags(''), '');
    assert.equal(normalizeTags(undefined), '');
});

test('issueUrl opens a new issue on the website repo', () => {
    const blank = new URL(issueUrl(buildIssue('response', {
        title: 'T',
        url: 'https://example.com/',
        responseType: 'star',
    })));

    assert.equal(blank.origin + blank.pathname, `https://github.com/${TARGET_REPO}/issues/new`);
    assert.equal(blank.searchParams.get('labels'), 'response');
    assert.equal(blank.searchParams.has('template'), false);
    assert.equal(read(blank.searchParams.get('body'), 'Response Type'), 'star');
    assert.ok(blank.href.length < MAX_URL_LENGTH);
});
