// Response flow: a second screen for the choices GitHub cannot prefill on its issue form
// (response type and RSVP status). The app writes the issue text itself and opens a
// ready-to-submit blank issue carrying the `response` label.

(function () {
    'use strict';

    const shareFlow = window.shareFlow;
    const core = window.IssueCore;
    if (!shareFlow || !core) return;

    const postActions = document.getElementById('post-actions');
    const panel = document.getElementById('response-panel');
    const rsvpField = document.getElementById('rsvp-status-field');
    const status = document.getElementById('response-status');
    const editNote = document.querySelector('.edit-note');
    const pageInfo = document.getElementById('page-info');
    const originalEditNote = editNote.textContent;

    function checkedValue(name) {
        return panel.querySelector(`input[name="${name}"]:checked`)?.value || '';
    }

    // RSVP status only makes sense for rsvp responses.
    function syncRsvpField() {
        rsvpField.hidden = checkedValue('response-type') !== 'rsvp';
    }

    function activate() {
        postActions.hidden = true;
        panel.hidden = false;
        status.textContent = '';
        syncRsvpField();
        editNote.textContent =
            'Pick a response type, then create the issue. GitHub opens it ready to submit — nothing to select there.';
        pageInfo.textContent = 'Your choices are written into the issue for you.';
        panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function deactivate() {
        panel.hidden = true;
        postActions.hidden = false;
        status.textContent = '';
        editNote.textContent = originalEditNote;
        shareFlow.renderStatus();
    }

    document.getElementById('response-btn').addEventListener('click', activate);
    document.getElementById('response-back-btn').addEventListener('click', deactivate);

    panel.addEventListener('change', () => {
        status.textContent = '';
        syncRsvpField();
    });

    document.getElementById('response-submit-btn').addEventListener('click', () => {
        const { title, url, notes, tags } = shareFlow.currentValues();
        if (!shareFlow.requireUrl(url)) {
            status.textContent = 'A URL is required.';
            return;
        }

        const responseType = checkedValue('response-type');
        const rsvpStatus = checkedValue('rsvp-status');
        if (responseType === 'rsvp' && !rsvpStatus) {
            status.textContent = 'Choose an RSVP status.';
            rsvpField.querySelector('input').focus();
            return;
        }

        shareFlow.openIssue(core.buildIssue('response', {
            title: title || 'Shared Content',
            url,
            notes,
            tags,
            responseType,
            rsvpStatus,
        }));
    });
})();
