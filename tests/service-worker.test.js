const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function serviceWorker(fetchImpl, cached) {
    const listeners = {};
    const sandbox = {
        URL,
        Response,
        console,
        fetch: fetchImpl,
        caches: {
            match: async () => cached,
        },
        self: {
            location: { origin: 'https://lqdev.github.io' },
            addEventListener: (name, callback) => { listeners[name] = callback; },
            skipWaiting() {},
            clients: { claim() {} },
        },
    };

    vm.runInNewContext(
        fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'),
        sandbox,
        { filename: 'sw.js' }
    );

    return listeners.fetch;
}

async function handle(handler, url = 'https://lqdev.github.io/github-post-pwa/share.html?url=x') {
    let responsePromise;
    handler({
        request: { method: 'GET', url },
        respondWith: (promise) => { responsePromise = promise; },
    });
    return responsePromise;
}

test('network-first returns a successful network response without using the cache', async () => {
    const network = new Response('new release', { status: 200 });
    const cached = new Response('old release', { status: 200 });
    const response = await handle(
        serviceWorker(async () => network, cached)
    );

    assert.equal(response, network);
});

test('an HTTP error falls back to the matching cached shell', async () => {
    const cached = new Response('offline shell', { status: 200 });
    const response = await handle(
        serviceWorker(async () => new Response('server error', { status: 503 }), cached)
    );

    assert.equal(response, cached);
});

test('an HTTP error is retained when nothing is cached', async () => {
    const original = new Response('not found', { status: 404 });
    const response = await handle(
        serviceWorker(async () => original, null)
    );

    assert.equal(response, original);
});

test('a network failure falls back to cache, or a network error when uncached', async () => {
    const cached = new Response('offline shell', { status: 200 });
    const fromCache = await handle(
        serviceWorker(async () => { throw new TypeError('offline'); }, cached)
    );
    assert.equal(fromCache, cached);

    const uncached = await handle(
        serviceWorker(async () => { throw new TypeError('offline'); }, null)
    );
    assert.equal(uncached.type, 'error');
});
