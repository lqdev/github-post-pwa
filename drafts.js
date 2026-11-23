// Keeps what the user is typing on this device, so closing the app by accident does not
// lose it. Nothing is sent anywhere; this is plain device storage.

(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.Drafts = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    // Browsers can block storage (private mode, settings). Drafts are a convenience, so
    // fall back to a store that remembers nothing rather than failing.
    function deviceStorage() {
        try {
            const storage = globalThis.localStorage;
            const probe = '__draft_probe__';
            storage.setItem(probe, '1');
            storage.removeItem(probe);
            return storage;
        } catch {
            return { getItem: () => null, setItem() {}, removeItem() {} };
        }
    }

    // A draft is either still being written, or was handed to GitHub ("sent") and is kept
    // as a safety net until the next draft replaces it.
    function createDraftStore(storage, key) {
        function read() {
            try {
                const saved = JSON.parse(storage.getItem(key));
                return saved && saved.values && typeof saved.values === 'object' ? saved : null;
            } catch {
                return null;
            }
        }

        function write(saved) {
            try {
                storage.setItem(key, JSON.stringify(saved));
            } catch {
                // Storage is full or blocked; the draft is simply not kept.
            }
        }

        return {
            // The draft still being written, or null.
            current() {
                const saved = read();
                return saved && !saved.sent ? saved.values : null;
            },
            // The last draft handed to GitHub, or null.
            lastSent() {
                const saved = read();
                return saved && saved.sent ? saved.values : null;
            },
            save(values) {
                write({ values, sent: false });
            },
            markSent() {
                const saved = read();
                if (saved) write({ values: saved.values, sent: true });
            },
            clear() {
                try {
                    storage.removeItem(key);
                } catch {
                    // Nothing to clear if storage is blocked.
                }
            },
        };
    }

    return { createDraftStore, deviceStorage };
});
