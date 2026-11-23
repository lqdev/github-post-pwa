const test = require('node:test');
const assert = require('node:assert/strict');

const { FORMS } = require('../issue-core.js');
const { compare, parseTemplate } = require('../scripts/check-templates.js');

// A cut-down copy of the site's follow.yml, in the same layout.
const FOLLOW_TEMPLATE = `name: Follow a Site
title: "[Follow] "
labels: ["follow"]
body:
  - type: markdown
    attributes:
      value: |
        ## Follow a Site
        - type: not-a-field
  - type: input
    id: feed_url
    attributes:
      label: Feed URL
      placeholder: "https://example.com/feed.xml"
  - type: input
    id: site_url
    attributes:
      label: Site URL
  - type: input
    id: site_title
    attributes:
      label: Title
  - type: dropdown
    id: roll
    attributes:
      label: Roll
      options:
        - blogroll
        - podroll
      default: 0
    validations:
      required: true
`;

test('a template that matches the app reports no problems', () => {
    const template = parseTemplate(FOLLOW_TEMPLATE);

    assert.deepEqual(template.labels, ['follow']);
    assert.deepEqual(template.fields.map((field) => field.id), ['feed_url', 'site_url', 'site_title', 'roll']);
    assert.deepEqual(template.fields[3].options, ['blogroll', 'podroll']);
    assert.deepEqual(compare(FORMS.follow, template), []);
});

test('renamed fields, changed choices and unfillable fields are reported', () => {
    const renamed = parseTemplate(FOLLOW_TEMPLATE.replace('label: Roll', 'label: Collection').replace('- podroll', '- linkroll'));
    const problems = compare(FORMS.follow, renamed);
    assert.equal(problems.length, 2);
    assert.match(problems[0], /field labels differ/);
    assert.match(problems[1], /choices for "Collection" differ/);

    // A styled-form type breaks if one of the fields it fills becomes a dropdown.
    const asForm = { ...FORMS.follow, delivery: 'template', params: { roll: 'roll', gone: 'missing_id' } };
    assert.deepEqual(compare(asForm, parseTemplate(FOLLOW_TEMPLATE)), [
        'field "roll" is now a dropdown, which GitHub cannot prefill from a link',
        'field id "missing_id" no longer exists in the template',
    ]);
});
