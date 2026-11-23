const test = require('node:test');
const assert = require('node:assert/strict');

const {
    deriveSiteUrl,
    extractFeedLinks,
    parseHandoff,
    suggestSiteTitle,
} = require('../follow-core.js');

test('deriveSiteUrl preserves site roots on multi-user hosts', () => {
    assert.equal(deriveSiteUrl('https://example.com/posts/hello'), 'https://example.com/');
    assert.equal(deriveSiteUrl('https://medium.com/@alice/story'), 'https://medium.com/@alice');
    assert.equal(deriveSiteUrl('https://github.com/octo/repo/issues/1'), 'https://github.com/octo/repo');
    assert.equal(deriveSiteUrl('https://social.example/@alice/123'), 'https://social.example/@alice');
    assert.equal(deriveSiteUrl('https://reddit.com/r/indieweb/comments/1'), 'https://reddit.com/r/indieweb');
    assert.equal(deriveSiteUrl('https://bsky.app/profile/alice.example/post/1'), 'https://bsky.app/profile/alice.example');
    assert.equal(deriveSiteUrl('https://dev.to/alice/article'), 'https://dev.to/alice');
    assert.equal(deriveSiteUrl('https://medium.com/feed/@alice'), 'https://medium.com/@alice');
    assert.equal(deriveSiteUrl('https://social.example/@alice.rss'), 'https://social.example/@alice');
    assert.equal(deriveSiteUrl('https://github.com/alice.atom'), 'https://github.com/alice');
    assert.equal(deriveSiteUrl('https://dev.to/feed/alice'), 'https://dev.to/alice');
});

test('deriveSiteUrl rejects non-http URLs and credentials', () => {
    assert.equal(deriveSiteUrl('javascript:alert(1)'), '');
    assert.equal(deriveSiteUrl('https://alice:secret@example.com/'), '');
    assert.equal(deriveSiteUrl('data:text/html,<h1>x</h1>'), '');
});

test('suggestSiteTitle keeps the final site segment', () => {
    assert.equal(suggestSiteTitle('A useful post | Example Blog'), 'Example Blog');
    assert.equal(suggestSiteTitle('A useful post – Example Blog'), 'Example Blog');
    assert.equal(suggestSiteTitle('A useful post — Example Blog'), 'Example Blog');
    assert.equal(suggestSiteTitle('A useful post - Example Blog'), 'Example Blog');
    assert.equal(suggestSiteTitle('A useful post · Example Blog'), 'Example Blog');
    assert.equal(suggestSiteTitle('Example Blog'), 'Example Blog');
});

test('parseHandoff accepts repeated feeds and de-duplicates them', () => {
    const params = new URLSearchParams([
        ['intent', 'follow'],
        ['url', 'https://example.com/post'],
        ['title', 'Post | Example Blog'],
        ['feed', 'https://example.com/feed.xml'],
        ['feed_title', 'All posts'],
        ['feed', 'https://example.com/feed.xml'],
        ['feed_title', 'Duplicate'],
        ['feed', 'https://example.com/notes.xml'],
        ['feed_title', 'Notes'],
        ['roll', 'podroll'],
    ]);

    assert.deepEqual(parseHandoff(params), {
        intent: 'follow',
        url: 'https://example.com/post',
        title: 'Post | Example Blog',
        roll: 'podroll',
        feeds: [
            {
                url: 'https://example.com/feed.xml',
                title: 'All posts',
                type: 'rss',
            },
            {
                url: 'https://example.com/notes.xml',
                title: 'Notes',
                type: 'rss',
            },
        ],
    });
});

test('parseHandoff drops hostile, credentialed, and excess feed values', () => {
    const params = new URLSearchParams([
        ['url', 'javascript:alert(1)'],
        ['roll', 'unknown'],
        ['feed', 'javascript:alert(1)'],
        ['feed', 'data:text/html,<h1>x</h1>'],
        ['feed', 'https://user:pass@example.com/feed'],
        ...Array.from({ length: 30 }, (_, index) => [
            'feed',
            `https://example.com/feed-${index}.xml`,
        ]),
    ]);

    const handoff = parseHandoff(params);
    assert.equal(handoff.url, '');
    assert.equal(handoff.roll, 'blogroll');
    assert.equal(handoff.feeds.length, 20);
    assert.ok(handoff.feeds.every(({ url }) => url.startsWith('https://example.com/')));
});

test('extractFeedLinks resolves extension-parity feed links and ignores HTML links', () => {
    const elements = [
        {
            getAttribute: (name) => ({
                type: 'application/rss+xml',
                href: 'feed.xml',
                title: 'All posts',
            })[name] || '',
            textContent: 'All posts',
        },
        {
            getAttribute: (name) => ({
                type: 'application/feed+json',
                href: '/feed.json',
            })[name] || '',
            textContent: 'JSON feed',
        },
        {
            getAttribute: (name) => ({
                type: 'text/html',
                href: '/about',
            })[name] || '',
            textContent: 'About',
        },
    ];
    const doc = {
        querySelectorAll: () => elements,
    };

    assert.deepEqual(extractFeedLinks(doc, 'https://example.com/blog/'), [
        {
            url: 'https://example.com/blog/feed.xml',
            title: 'All posts',
            type: 'rss',
        },
        {
            url: 'https://example.com/feed.json',
            title: 'JSON feed',
            type: 'json',
        },
    ]);
});
