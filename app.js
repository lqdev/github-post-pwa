// Install / landing page logic for the GitHub Post Creator PWA.

let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const installContainer = document.getElementById('install-container');
const installedContainer = document.getElementById('installed-container');

// Register the service worker so the app can be installed and used offline.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.log('Service Worker registration failed', err));
}

// If the app is already installed (launched standalone), show the success state.
if (window.matchMedia('(display-mode: standalone)').matches) {
    installContainer.style.display = 'none';
    installedContainer.style.display = 'block';
}

// Capture the browser's install prompt so we can trigger it from our button.
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            installContainer.style.display = 'none';
            installedContainer.style.display = 'block';
        }

        deferredPrompt = null;
    } else {
        // Fallback instructions for browsers without beforeinstallprompt (e.g. iOS Safari).
        alert('To install:\n\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
    }
});

window.addEventListener('appinstalled', () => {
    installContainer.style.display = 'none';
    installedContainer.style.display = 'block';
});
