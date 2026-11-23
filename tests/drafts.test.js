const test = require('node:test');
const assert = require('node:assert/strict');

const { createDraftStore } = require('../drafts.js');

function fakeStorage() {
    const items = new Map();
    return {
        items,
        getItem: (key) => (items.has(key) ? items.get(key) : null),
        setItem: (key, value) => items.set(key, String(value)),
        removeItem: (key) => items.delete(key),
    };
}

test('a draft in progress comes back; a sent draft is only offered as a restore', () => {
    const store = createDraftStore(fakeStorage(), 'draft');
    assert.equal(store.current(), null);
    assert.equal(store.lastSent(), null);

    store.save({ title: 'Hello', content: 'Half a thought' });
    assert.deepEqual(store.current(), { title: 'Hello', content: 'Half a thought' });
    assert.equal(store.lastSent(), null);

    store.markSent();
    assert.equal(store.current(), null);
    assert.deepEqual(store.lastSent(), { title: 'Hello', content: 'Half a thought' });

    // Starting a new draft replaces the sent one.
    store.save({ title: 'Next', content: '' });
    assert.deepEqual(store.current(), { title: 'Next', content: '' });
    assert.equal(store.lastSent(), null);

    store.clear();
    assert.equal(store.current(), null);
});

test('damaged or blocked storage never throws', () => {
    const damaged = fakeStorage();
    damaged.items.set('draft', '{not json');
    assert.equal(createDraftStore(damaged, 'draft').current(), null);

    const blocked = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
        removeItem() { throw new Error('blocked'); },
    };
    const store = createDraftStore(blocked, 'draft');
    store.save({ title: 'Hello' });
    store.markSent();
    store.clear();
    assert.equal(store.current(), null);
    assert.equal(store.lastSent(), null);
});
