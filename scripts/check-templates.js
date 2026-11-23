#!/usr/bin/env node
// Compares the post types in issue-core.js with the live issue-form templates in the
// website repo, so that a template change over there is noticed here before a post
// silently fails to publish.
//
//   node scripts/check-templates.js
//
// Prints every mismatch and exits 1 if the two have drifted apart.

const { FORMS, TARGET_REPO } = require('../issue-core.js');

const RAW_BASE = `https://raw.githubusercontent.com/${TARGET_REPO}/main/.github/ISSUE_TEMPLATE`;

// The only field types GitHub fills in from a link.
const PREFILLABLE = ['input', 'textarea'];

const unquote = (text) => text.trim().replace(/^(["'])(.*)\1$/, '$2');

// Reads the parts of an issue-form template this check needs: the labels it applies and,
// for each form field, its type, id, label and dropdown choices. This is not a general
// YAML parser; it relies on the consistent layout of the site's templates.
function parseTemplate(text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const labelsLine = lines.find((line) => /^labels:/.test(line)) || '';
    const labels = [...labelsLine.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);

    const fields = [];
    let field = null;
    let inOptions = false;

    for (const line of lines) {
        // Form fields are the two-space-indented list items directly under `body:`.
        const start = line.match(/^ {2}- type:\s*(\S+)/);
        if (start) {
            field = { type: start[1], id: '', label: '', options: [] };
            if (field.type !== 'markdown') fields.push(field);
            inOptions = false;
            continue;
        }
        if (!field || field.type === 'markdown') continue;

        if (inOptions) {
            const option = line.match(/^\s+-\s+(.+)$/);
            if (option) {
                field.options.push(unquote(option[1]));
                continue;
            }
            if (line.trim()) inOptions = false;
        }

        const id = line.match(/^\s+id:\s*(\S+)/);
        const label = line.match(/^\s+label:\s*(.+)$/);
        if (id) field.id = id[1];
        else if (label) field.label = unquote(label[1]);
        else if (/^\s+options:\s*$/.test(line)) inOptions = true;
    }

    return { labels, fields };
}

// Returns a list of human-readable problems; empty when the app and template agree.
function compare(form, template) {
    const problems = [];

    if (!template.labels.includes(form.label)) {
        problems.push(`the template no longer applies the "${form.label}" label (it applies: ${template.labels.join(', ') || 'none'})`);
    }

    if (form.delivery === 'template') {
        for (const fieldId of Object.values(form.params)) {
            const field = template.fields.find((candidate) => candidate.id === fieldId);
            if (!field) {
                problems.push(`field id "${fieldId}" no longer exists in the template`);
            } else if (!PREFILLABLE.includes(field.type)) {
                problems.push(`field "${fieldId}" is now a ${field.type}, which GitHub cannot prefill from a link`);
            }
        }
        return problems;
    }

    const ours = form.fields.map(([label]) => label).sort().join(' | ');
    const theirs = template.fields.map((field) => field.label).sort().join(' | ');
    if (ours !== theirs) {
        problems.push(`field labels differ\n      app:      ${ours}\n      template: ${theirs}`);
    }

    for (const field of template.fields.filter((candidate) => candidate.type === 'dropdown')) {
        const ourChoices = (form.options[field.label] || []).join(', ');
        const theirChoices = field.options.join(', ');
        if (ourChoices !== theirChoices) {
            problems.push(`choices for "${field.label}" differ\n      app:      ${ourChoices || '(none)'}\n      template: ${theirChoices}`);
        }
    }

    return problems;
}

async function main() {
    let failed = false;

    for (const [type, form] of Object.entries(FORMS)) {
        const response = await fetch(`${RAW_BASE}/${form.template}`);
        if (!response.ok) {
            console.error(`✗ ${type}: could not fetch ${form.template} (HTTP ${response.status})`);
            failed = true;
            continue;
        }

        const problems = compare(form, parseTemplate(await response.text()));
        if (problems.length === 0) {
            console.log(`✓ ${type} matches ${form.template}`);
            continue;
        }

        failed = true;
        console.error(`✗ ${type} has drifted from ${form.template}:`);
        for (const problem of problems) console.error(`    - ${problem}`);
    }

    if (failed) {
        console.error('\nUpdate FORMS in issue-core.js (and its tests) to match the templates.');
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { compare, parseTemplate };
