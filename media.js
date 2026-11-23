// Media screen: collect the title, caption, orientation and tags in the app, then open a
// blank GitHub issue with that text written in. The photo or video itself is added on
// GitHub, because only GitHub's own editor can upload files.

(function () {
    'use strict';

    const core = window.IssueCore;
    const drafts = window.Drafts;
    if (!core || !drafts) return;

    const titleInput = document.getElementById('m-title');
    const captionInput = document.getElementById('m-caption');
    const tagsInput = document.getElementById('m-tags');
    const orientationInputs = Array.from(document.querySelectorAll('input[name="media-orientation"]'));
    const status = document.getElementById('media-status');
    const restoreButton = document.getElementById('media-restore-btn');
    const store = drafts.createDraftStore(drafts.deviceStorage(), 'github-post:draft:media');

    function values() {
        return {
            title: titleInput.value.trim(),
            caption: captionInput.value,
            orientation: orientationInputs.find((input) => input.checked)?.value || '',
            tags: tagsInput.value,
        };
    }

    function fill(saved) {
        titleInput.value = saved.title || '';
        captionInput.value = saved.caption || '';
        tagsInput.value = saved.tags || '';
        for (const input of orientationInputs) {
            input.checked = input.value === (saved.orientation || '');
        }
    }

    function hasText(post) {
        return Boolean(post.title || post.caption.trim() || post.tags.trim() || post.orientation);
    }

    // Problems are shown in red; everything else in the neutral info colour.
    function say(message, isInfo) {
        status.textContent = message;
        status.classList.toggle('is-info', Boolean(isInfo));
    }

    function onEdit(event) {
        event.target.classList.remove('invalid');
        say('');
        restoreButton.hidden = true;

        const post = values();
        if (hasText(post)) store.save(post);
        else store.clear();
    }

    for (const input of [titleInput, captionInput, tagsInput]) {
        input.addEventListener('input', onEdit);
    }
    for (const input of orientationInputs) {
        input.addEventListener('change', onEdit);
    }

    document.getElementById('media-submit-btn').addEventListener('click', () => {
        const post = values();
        if (!post.title) {
            titleInput.classList.add('invalid');
            titleInput.focus();
            say('A title is required.');
            return;
        }

        const url = core.issueUrl(core.buildIssue('media', post));
        if (url.length > core.MAX_URL_LENGTH) {
            captionInput.classList.add('invalid');
            captionInput.focus();
            say('The caption is too long to send to GitHub in a link. Shorten it, or finish writing it on GitHub.');
            return;
        }

        store.markSent();
        window.location.href = url;
    });

    restoreButton.addEventListener('click', () => {
        fill(store.lastSent() || {});
        store.save(values());
        restoreButton.hidden = true;
        say('Restored the last post you sent.', true);
    });

    document.getElementById('media-clear-btn').addEventListener('click', () => {
        if (hasText(values()) && !window.confirm('Clear this post?')) return;
        fill({});
        store.clear();
        say('');
    });

    const draft = store.current();
    if (draft) {
        fill(draft);
        say('Draft restored.', true);
    } else if (store.lastSent()) {
        restoreButton.hidden = false;
    }
})();
