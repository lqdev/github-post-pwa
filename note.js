// Note screen: write a note in the app and hand it to GitHub's "Post a Note" form. Every
// field on that form is a text box, so the styled form can be prefilled as it is.

(function () {
    'use strict';

    const core = window.IssueCore;
    const drafts = window.Drafts;
    if (!core || !drafts) return;

    const titleInput = document.getElementById('n-title');
    const contentInput = document.getElementById('n-content');
    const tagsInput = document.getElementById('n-tags');
    const status = document.getElementById('note-status');
    const copyButton = document.getElementById('note-copy-btn');
    const restoreButton = document.getElementById('note-restore-btn');
    const store = drafts.createDraftStore(drafts.deviceStorage(), 'github-post:draft:note');

    // Set when automatic copying fails, so the next tap trusts the user's own copy.
    let copiedByHand = false;

    function values() {
        return {
            title: titleInput.value.trim(),
            content: contentInput.value,
            tags: tagsInput.value,
        };
    }

    function fill(saved) {
        titleInput.value = saved.title || '';
        contentInput.value = saved.content || '';
        tagsInput.value = saved.tags || '';
    }

    function hasText(note) {
        return Boolean(note.title || note.content.trim() || note.tags.trim());
    }

    // Problems are shown in red; everything else in the neutral info colour.
    function say(message, isInfo) {
        status.textContent = message;
        status.classList.toggle('is-info', Boolean(isInfo));
    }

    function showProblem(input, message) {
        input.classList.add('invalid');
        input.focus();
        say(message);
        return null;
    }

    // The site rejects a note without a title or with fewer than 3 characters of content.
    function validValues() {
        const note = values();
        if (!note.title) return showProblem(titleInput, 'A title is required.');
        if (note.content.replace(/\s/g, '').length < 3) {
            return showProblem(contentInput, 'Write at least a few characters of content.');
        }
        return note;
    }

    function openOnGitHub(note) {
        store.markSent();
        window.location.href = core.issueUrl(core.buildIssue('note', note));
    }

    function onEdit(event) {
        event.target.classList.remove('invalid');
        say('');
        copyButton.hidden = true;
        restoreButton.hidden = true;
        copiedByHand = false;

        const note = values();
        if (hasText(note)) store.save(note);
        else store.clear();
    }

    for (const input of [titleInput, contentInput, tagsInput]) {
        input.addEventListener('input', onEdit);
    }

    document.getElementById('note-submit-btn').addEventListener('click', () => {
        const note = validValues();
        if (!note) return;

        // The note travels to GitHub inside the link, and GitHub rejects very long links.
        if (core.issueUrl(core.buildIssue('note', note)).length > core.MAX_URL_LENGTH) {
            say('This note is too long to send to GitHub in a link. Use the button below: it copies the content so you can paste it into the Content box on GitHub.');
            copyButton.hidden = false;
            return;
        }

        openOnGitHub(note);
    });

    copyButton.addEventListener('click', async () => {
        const note = validValues();
        if (!note) return;

        if (!copiedByHand) {
            try {
                await navigator.clipboard.writeText(note.content);
            } catch {
                copiedByHand = true;
                contentInput.focus();
                contentInput.select();
                say('Could not copy automatically. Copy the selected text yourself, then tap the button again.');
                return;
            }
        }

        // Title and tags still arrive filled in; the content is pasted on GitHub.
        openOnGitHub({ ...note, content: '' });
    });

    restoreButton.addEventListener('click', () => {
        fill(store.lastSent() || {});
        store.save(values());
        restoreButton.hidden = true;
        say('Restored the last note you sent.', true);
    });

    document.getElementById('note-clear-btn').addEventListener('click', () => {
        if (hasText(values()) && !window.confirm('Clear this note?')) return;
        fill({});
        store.clear();
        say('');
        copyButton.hidden = true;
    });

    const draft = store.current();
    if (draft) {
        fill(draft);
        say('Draft restored.', true);
    } else if (store.lastSent()) {
        restoreButton.hidden = false;
    }
})();
