const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('the Web Share Target stays on the existing share screen', () => {
    assert.equal(manifest.share_target.action, '/github-post-pwa/share.html');
    assert.equal(manifest.share_target.method, 'GET');
    assert.deepEqual(manifest.share_target.params, {
        title: 'title',
        text: 'text',
        url: 'url',
    });
});

test('shortcut targets and icons exist and stay inside the app scope', () => {
    assert.ok(manifest.shortcuts.length > 0);

    for (const shortcut of manifest.shortcuts) {
        assert.ok(shortcut.url.startsWith(manifest.scope));
        assert.ok(
            fs.existsSync(path.join(root, shortcut.url.replace(manifest.scope, ''))),
            `missing shortcut target ${shortcut.url}`
        );

        for (const icon of shortcut.icons) {
            const iconPath = icon.src.replace('./', '');
            assert.ok(fs.existsSync(path.join(root, iconPath)), `missing shortcut icon ${icon.src}`);
            assert.ok(
                serviceWorker.includes(`/github-post-pwa/${iconPath}`),
                `shortcut icon ${icon.src} is not cached`
            );
        }
    }
});
