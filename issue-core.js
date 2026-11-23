// Turns what the user entered in the app into a GitHub issue on the website repo.
//
// Each post type on the site has an issue-form template. GitHub can fill a form's text
// boxes from a link, but not its dropdowns, and files can only be attached in an editable
// text area. So there are two ways to hand a post to GitHub:
//
//   'template'  every field we send is a text box: open the styled form, prefilled.
//   'blank'     the form has dropdowns (or needs files): open a blank issue and write the
//               text the form would have produced, plus the label the workflow looks for.
//
// The publishing workflows only read the issue label and the "### <Field label>" sections
// of the issue text, so both routes look the same to them.

(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.IssueCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    const TARGET_REPO = 'lqdev/luisquintanilla.me';

    // GitHub rejects very long links (414 URI Too Long). Stay safely below that.
    const MAX_URL_LENGTH = 7500;

    // What GitHub's form writes for an optional field that was left empty.
    const NO_RESPONSE = '_No response_';

    // One entry per post type. Must match .github/ISSUE_TEMPLATE/<template> in TARGET_REPO;
    // scripts/check-templates.js compares the two.
    //
    //   required  value names that must not be empty
    //   params    ('template' only) value name -> the template field id it prefills
    //   fields    ('blank' only) [field label, value name, text when empty], in the order
    //             they are written; the third item defaults to NO_RESPONSE
    //   options   ('blank' only) field label -> the template's dropdown choices
    //   prepare   optional hook to check or adjust the values before they are written
    const FORMS = {
        bookmark: {
            template: 'post-bookmark.yml',
            label: 'bookmark',
            titlePrefix: '[Bookmark] ',
            delivery: 'template',
            required: ['url', 'title'],
            params: { url: 'target_url', title: 'post_title', notes: 'content', tags: 'tags' },
        },
        readLater: {
            template: 'add-read-later.yml',
            label: 'read-later',
            titlePrefix: '[Read Later] ',
            delivery: 'template',
            required: ['url'],
            params: { url: 'url', title: 'url_title' },
        },
        note: {
            template: 'post-note.yml',
            label: 'note',
            titlePrefix: '[Note] ',
            delivery: 'template',
            required: ['title'],
            params: { title: 'post_title', content: 'content', tags: 'tags' },
        },
        media: {
            template: 'post-media.yml',
            label: 'media',
            titlePrefix: '[Media] ',
            delivery: 'blank',
            required: ['title', 'caption'],
            // Files can only be attached on GitHub. A caption preserves the template's
            // required Content and Attachments field in the blank-issue handoff. The content
            // section is written last so a file added at the end lands inside it.
            fields: [
                ['Title', 'title'],
                ['Orientation (Optional)', 'orientation', 'None'],
                ['Slug (Optional)', 'slug'],
                ['Tags (Optional)', 'tags'],
                ['Content and Attachments', 'caption', ''],
            ],
            options: {
                'Orientation (Optional)': ['landscape', 'portrait'],
            },
        },
        response: {
            template: 'post-response.yml',
            label: 'response',
            titlePrefix: '[Response] ',
            delivery: 'blank',
            required: ['responseType', 'url', 'title'],
            fields: [
                ['Response Type', 'responseType'],
                ['RSVP Status', 'rsvpStatus'],
                ['Target URL', 'url'],
                ['Title', 'title'],
                ['Content (Optional)', 'notes'],
                ['Slug (Optional)', 'slug'],
                ['Tags (Optional)', 'tags'],
            ],
            options: {
                'Response Type': ['reply', 'reshare', 'star', 'rsvp'],
                'RSVP Status': ['not applicable', 'yes', 'no', 'maybe', 'interested'],
            },
            // An RSVP status only applies to rsvp responses, and is then mandatory.
            prepare(values) {
                const isRsvp = values.responseType === 'rsvp';
                if (isRsvp && !RSVP_STATUSES.includes(values.rsvpStatus)) {
                    throw new Error('An RSVP status is required for rsvp responses');
                }
                return { ...values, rsvpStatus: isRsvp ? values.rsvpStatus : '' };
            },
        },
        follow: {
            template: 'follow.yml',
            label: 'follow',
            titlePrefix: '[Follow] ',
            delivery: 'blank',
            required: ['siteUrl', 'title', 'roll'],
            fields: [
                ['Feed URL', 'feedUrl'],
                ['Site URL', 'siteUrl'],
                ['Title', 'title'],
                ['Roll', 'roll'],
            ],
            options: {
                Roll: ['blogroll', 'podroll'],
            },
        },
    };

    const RSVP_STATUSES = FORMS.response.options['RSVP Status']
        .filter((status) => status !== 'not applicable');

    function clean(value) {
        return String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim();
    }

    // "web, IndieWeb ,, rss" -> "web,IndieWeb,rss"
    function normalizeTags(value) {
        return clean(value).split(',').map((tag) => tag.trim()).filter(Boolean).join(',');
    }

    // Returns the query parameters for the "new issue" link of one post.
    //   'template' types: { template, title, <field id>: value, ... }
    //   'blank' types:    { title, labels, body }
    // `input.issueTitle` overrides the text after the title prefix (defaults to `title`).
    function buildIssue(type, input) {
        const form = FORMS[type];
        if (!form) throw new Error(`Unknown post type: ${type}`);

        let values = {};
        for (const [name, value] of Object.entries(input || {})) {
            values[name] = name === 'tags' ? normalizeTags(value) : clean(value);
        }
        if (form.prepare) values = form.prepare(values);

        for (const name of form.required) {
            if (!values[name]) throw new Error(`Missing ${name} for ${type}`);
        }

        const title = form.titlePrefix + (values.issueTitle || values.title || '');

        if (form.delivery === 'template') {
            const params = { template: form.template, title };
            for (const [name, fieldId] of Object.entries(form.params)) {
                if (values[name]) params[fieldId] = values[name];
            }
            return params;
        }

        for (const [label, name] of form.fields) {
            const choices = form.options[label];
            if (choices && values[name] && !choices.includes(values[name])) {
                throw new Error(`Unknown ${label}: ${values[name]}`);
            }
        }

        const body = form.fields
            .map(([label, name, whenEmpty = NO_RESPONSE]) => `### ${label}\n\n${values[name] || whenEmpty}`)
            .join('\n\n');

        return { title, labels: form.label, body };
    }

    function issueUrl(params) {
        return `https://github.com/${TARGET_REPO}/issues/new?${new URLSearchParams(params)}`;
    }

    return {
        FORMS,
        MAX_URL_LENGTH,
        NO_RESPONSE,
        RSVP_STATUSES,
        TARGET_REPO,
        buildIssue,
        issueUrl,
        normalizeTags,
    };
});
