(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.FollowCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    const FEED_TYPES = new Set([
        'application/rss+xml',
        'application/atom+xml',
        'application/feed+json',
    ]);

    function parseHttpUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return null;

        try {
            const url = new URL(value.trim());
            if ((url.protocol !== 'http:' && url.protocol !== 'https:')
                || url.username
                || url.password) {
                return null;
            }
            return url;
        } catch {
            return null;
        }
    }

    function feedType(value) {
        const normalized = String(value || '').split(';', 1)[0].trim().toLowerCase();
        if (normalized === 'application/atom+xml') return 'atom';
        if (normalized === 'application/feed+json') return 'json';
        return 'rss';
    }

    function candidate(url, title, type) {
        const parsed = parseHttpUrl(url);
        if (!parsed) return null;

        return {
            url: parsed.href,
            title: String(title || 'Feed').trim() || 'Feed',
            type: feedType(type),
        };
    }

    function deriveSiteUrl(value) {
        const url = parseHttpUrl(value);
        if (!url) return '';

        url.search = '';
        url.hash = '';
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        const segments = url.pathname.split('/').filter(Boolean);
        const site = (path) => `${url.origin}${path}`;

        if (host === 'medium.com'
            && (segments[0] === 'feed' && /^@/.test(segments[1] || ''))) {
            return site(`/${segments[1]}`);
        }

        if (host === 'medium.com' && /^@/.test(segments[0] || '')) {
            return site(`/${segments[0]}`);
        }

        if (host === 'github.com' && segments.length) {
            if (segments.length === 1 && segments[0].endsWith('.atom')) {
                return site(`/${segments[0].slice(0, -5)}`);
            }
            const pathLength = segments.length > 1 ? 2 : 1;
            return site(`/${segments.slice(0, pathLength).join('/')}`);
        }

        if (host === 'reddit.com' && segments[0] === 'r' && segments[1]) {
            return site(`/r/${segments[1]}`);
        }

        if (host === 'bsky.app' && segments[0] === 'profile' && segments[1]) {
            return site(`/profile/${segments[1]}`);
        }

        if (host === 'dev.to' && segments[0] === 'feed' && segments[1]) {
            return site(`/${segments[1]}`);
        }

        if (host === 'dev.to' && segments[0]) {
            return site(`/${segments[0]}`);
        }

        if (/^@/.test(segments[0] || '')) {
            return site(`/${segments[0].replace(/\.rss$/i, '')}`);
        }

        return `${url.origin}/`;
    }

    function suggestSiteTitle(value) {
        const parts = String(value || '')
            .split(/\s+(?:\||–|—|-|·)\s+/)
            .map((part) => part.trim())
            .filter(Boolean);

        return parts.length ? parts[parts.length - 1] : String(value || '').trim();
    }

    function parseHandoff(params) {
        const get = (name) => typeof params?.get === 'function' ? params.get(name) || '' : '';
        const getAll = (name) => typeof params?.getAll === 'function' ? params.getAll(name) : [];
        const feedUrls = getAll('feed');
        const feedTitles = getAll('feed_title');
        const roll = get('roll').toLowerCase();

        const feeds = [];
        for (let index = 0; index < feedUrls.length && feeds.length < 20; index += 1) {
            const feed = candidate(feedUrls[index], feedTitles[index] || '', '');
            if (feed) feeds.push(feed);
        }

        return {
            intent: get('intent').toLowerCase(),
            url: parseHttpUrl(get('url'))?.href || '',
            title: get('title').trim(),
            roll: roll === 'podroll' ? 'podroll' : 'blogroll',
            feeds: dedupeCandidates(feeds),
        };
    }

    function extractFeedLinks(doc, baseUrl) {
        if (!doc || typeof doc.querySelectorAll !== 'function') return [];

        const selectors = [
            'link[rel~="alternate"][type]',
            'a[type]',
        ];

        const feeds = Array.from(doc.querySelectorAll(selectors.join(','))).map((element) => {
            const type = String(element.getAttribute('type') || '').split(';', 1)[0].trim().toLowerCase();
            if (!FEED_TYPES.has(type)) return null;

            const href = element.getAttribute('href') || '';
            let resolved;
            try {
                resolved = new URL(href, baseUrl).href;
            } catch {
                return null;
            }

            const title = element.getAttribute('title')
                || element.textContent
                || element.getAttribute('aria-label')
                || 'Feed';
            return candidate(resolved, title.trim(), type);
        }).filter(Boolean);

        return dedupeCandidates(feeds);
    }

    function dedupeCandidates(feeds) {
        const seen = new Set();
        return feeds.filter((feed) => {
            if (!feed?.url || seen.has(feed.url)) return false;
            seen.add(feed.url);
            return true;
        });
    }

    return {
        dedupeCandidates,
        deriveSiteUrl,
        extractFeedLinks,
        parseHandoff,
        suggestSiteTitle,
    };
});
