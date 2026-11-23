// Follow flow: discover feed choices when possible, otherwise hand off an
// optional feed to the website repo's server-side discovery workflow.

(function () {
    'use strict';

    const shareFlow = window.shareFlow;
    const core = window.FollowCore;
    if (!shareFlow || !core) return;

    const titleInput = document.getElementById('f-title');
    const urlInput = document.getElementById('f-url');
    const urlLabel = document.querySelector('label[for="f-url"]');
    const notesField = document.getElementById('notes-field');
    const responseTypeField = document.getElementById('response-type-field');
    const postActions = document.getElementById('post-actions');
    const followPanel = document.getElementById('follow-panel');
    const feedChoices = document.getElementById('follow-feed-choices');
    const feedStatus = document.getElementById('follow-feed-status');
    const rollInput = document.getElementById('follow-roll');
    const manualFeedInput = document.getElementById('follow-feed-manual');
    const pageInfo = document.getElementById('page-info');
    const originalUrlLabel = urlLabel.textContent;
    const originalEditNote = document.querySelector('.edit-note').textContent;

    let candidates = [];
    let titleEdited = false;
    let feedSelectionEdited = false;
    let active = false;
    let discoveryStarted = false;
    let preFollowValues = null;

    titleInput.addEventListener('input', () => {
        titleEdited = true;
    });

    function activeValues() {
        return shareFlow.currentValues();
    }

    function parseSelectedFeed() {
        const selected = feedChoices.querySelector('input[name="follow-feed"]:checked');
        if (!selected || selected.value === 'auto') return '';
        if (selected.value === 'manual') {
            const value = manualFeedInput.value.trim();
            try {
                const url = new URL(value);
                if ((url.protocol !== 'http:' && url.protocol !== 'https:')
                    || url.username
                    || url.password) {
                    throw new Error('Unsupported URL');
                }
                return url.href;
            } catch {
                manualFeedInput.classList.add('invalid');
                manualFeedInput.focus();
                feedStatus.textContent = 'Enter an absolute http(s) feed URL.';
                return null;
            }
        }
        return selected.value;
    }

    function appendCandidates(next) {
        candidates = core.dedupeCandidates(candidates.concat(next));
        renderFeedChoices();
    }

    function radioRow(value, title, detail, badgeText) {
        const label = document.createElement('label');
        label.className = 'feed-choice';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'follow-feed';
        radio.value = value;

        const body = document.createElement('span');
        body.className = 'feed-choice-body';

        const heading = document.createElement('span');
        heading.className = 'feed-choice-title';
        heading.textContent = title;

        if (badgeText) {
            const badge = document.createElement('span');
            badge.className = 'feed-badge';
            badge.textContent = badgeText;
            heading.appendChild(badge);
        }

        const url = document.createElement('span');
        url.className = 'feed-choice-url';
        url.textContent = detail;

        body.append(heading, url);
        label.append(radio, body);
        return label;
    }

    function renderFeedChoices() {
        const selectedValue = feedChoices.querySelector('input[name="follow-feed"]:checked')?.value;
        feedChoices.replaceChildren();

        candidates.forEach((feed, index) => {
            const row = radioRow(
                feed.url,
                feed.title,
                `${feed.type.toUpperCase()} · ${feed.url}`
            );
            if ((feedSelectionEdited && selectedValue === feed.url)
                || (!feedSelectionEdited && index === 0)) {
                row.querySelector('input').checked = true;
            }
            feedChoices.appendChild(row);
        });

        const automatic = radioRow(
            'auto',
            'Let GitHub find the feed',
            'If none is found, the request is closed and nothing is added.'
        );
        if ((feedSelectionEdited && selectedValue === 'auto')
            || (!feedSelectionEdited && candidates.length === 0)) {
            automatic.querySelector('input').checked = true;
        }
        feedChoices.appendChild(automatic);

        const manual = radioRow(
            'manual',
            'Enter a feed URL manually',
            'Use the RSS, Atom, or JSON Feed URL.'
        );
        if (feedSelectionEdited && selectedValue === 'manual') {
            manual.querySelector('input').checked = true;
        }
        feedChoices.appendChild(manual);
    }

    async function fetchFeedLinks(url) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 4000);
        try {
            const response = await fetch(url, {
                credentials: 'omit',
                redirect: 'follow',
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('html') && !/<(?:html|head|body)(?:\s|>)/i.test(text)) {
                return [];
            }

            const doc = new DOMParser().parseFromString(text, 'text/html');
            const baseHref = doc.querySelector('base[href]')?.getAttribute('href');
            const baseUrl = baseHref ? new URL(baseHref, response.url).href : response.url;
            return core.extractFeedLinks(doc, baseUrl);
        } catch (error) {
            console.warn('Follow feed discovery was unavailable; GitHub can retry it.', error);
            return [];
        } finally {
            window.clearTimeout(timer);
        }
    }

    async function discoverFromPage(pageUrl, siteUrl) {
        feedStatus.textContent = candidates.length
            ? 'Checking the page for more feeds…'
            : 'Checking the page for feeds…';

        const urls = [...new Set([pageUrl, siteUrl].filter(Boolean))];
        for (const url of urls) {
            const found = await fetchFeedLinks(url);
            appendCandidates(found);
            if (found.length) break;
        }

        feedStatus.textContent = candidates.length
            ? `${candidates.length} feed option${candidates.length === 1 ? '' : 's'} found.`
            : 'The page could not be inspected. GitHub will find a feed after you create the issue.';
    }

    function activateFollow() {
        if (active) return;
        active = true;

        const handoff = core.parseHandoff(shareFlow.params);
        const values = activeValues();
        preFollowValues = { title: values.title, url: values.url };
        const originalSharedUrl = handoff.intent === 'follow'
            ? handoff.url || values.url
            : values.url;
        const siteUrl = core.deriveSiteUrl(originalSharedUrl);
        const suggestedTitle = core.suggestSiteTitle(
            handoff.intent === 'follow' ? handoff.title || values.title : values.title
        );

        if (!titleEdited && suggestedTitle) titleInput.value = suggestedTitle;
        if (siteUrl) urlInput.value = siteUrl;
        if (handoff.roll) rollInput.value = handoff.roll;

        urlLabel.textContent = 'Site URL';
        notesField.hidden = true;
        responseTypeField.hidden = true;
        postActions.hidden = true;
        followPanel.hidden = false;
        document.querySelector('.edit-note').textContent =
            'Review the site, title, feed, and roll. If feed discovery cannot run in the browser, GitHub will try after you submit.';
        pageInfo.textContent = 'A feed is required. The issue is closed without adding a roll entry if discovery finds none.';

        const initialFeeds = handoff.feeds;
        const sharedUrlIsFeed = core.looksLikeFeedUrl(originalSharedUrl);
        if (sharedUrlIsFeed) {
            const lowerUrl = originalSharedUrl.toLowerCase();
            initialFeeds.unshift({
                url: originalSharedUrl,
                title: 'Shared feed',
                type: lowerUrl.endsWith('.atom')
                    ? 'atom'
                    : lowerUrl.endsWith('.json')
                        ? 'json'
                        : 'rss',
            });
        }
        appendCandidates(initialFeeds);

        if (!discoveryStarted) {
            discoveryStarted = true;
            discoverFromPage(originalSharedUrl, siteUrl);
        }
    }

    function deactivateFollow() {
        active = false;
        urlLabel.textContent = originalUrlLabel;
        notesField.hidden = false;
        responseTypeField.hidden = false;
        postActions.hidden = false;
        followPanel.hidden = true;
        document.querySelector('.edit-note').textContent = originalEditNote;
        pageInfo.textContent = 'Review the fields above, then choose a post type.';
        if (preFollowValues) {
            titleInput.value = preFollowValues.title;
            urlInput.value = preFollowValues.url;
        }
        const url = new URL(window.location.href);
        url.searchParams.delete('intent');
        window.history.replaceState(null, '', url);
    }

    document.getElementById('follow-btn').addEventListener('click', activateFollow);
    document.getElementById('follow-back-btn').addEventListener('click', deactivateFollow);
    feedChoices.addEventListener('change', (event) => {
        feedSelectionEdited = true;
        const manual = event.target.value === 'manual';
        manualFeedInput.hidden = !manual;
        manualFeedInput.classList.remove('invalid');
        if (manual) manualFeedInput.focus();
    });
    manualFeedInput.addEventListener('input', () => {
        manualFeedInput.classList.remove('invalid');
    });

    document.getElementById('follow-submit-btn').addEventListener('click', () => {
        const { title } = activeValues();
        const rawSiteUrl = urlInput.value.trim();
        let siteUrl = rawSiteUrl;
        const feedUrl = parseSelectedFeed();
        if (!rawSiteUrl) {
            urlInput.classList.add('invalid');
            urlInput.focus();
            feedStatus.textContent = 'A Site URL is required.';
            return;
        }
        try {
            const site = new URL(siteUrl);
            if ((site.protocol !== 'http:' && site.protocol !== 'https:')
                || site.username
                || site.password) {
                throw new Error('Unsupported URL');
            }
            siteUrl = site.href;
        } catch {
            urlInput.classList.add('invalid');
            urlInput.focus();
            feedStatus.textContent = 'Enter an absolute http(s) Site URL.';
            return;
        }
        if (feedUrl === null) return;
        if (!title) {
            titleInput.classList.add('invalid');
            titleInput.focus();
            feedStatus.textContent = 'A Title is required.';
            return;
        }

        const fields = {
            template: 'follow.yml',
            title: `[Follow] ${title}`,
            site_url: siteUrl,
            site_title: title,
            roll: rollInput.value,
        };
        if (feedUrl) fields.feed_url = feedUrl;
        shareFlow.openIssue(fields);
    });

    urlInput.addEventListener('input', () => urlInput.classList.remove('invalid'));
    titleInput.addEventListener('input', () => titleInput.classList.remove('invalid'));

    renderFeedChoices();
    if (core.parseHandoff(shareFlow.params).intent === 'follow') {
        activateFollow();
    }
})();
