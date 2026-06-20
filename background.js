// dikstract background service worker

const DB_NAME = 'dikstract-db';
const DB_VERSION = 1;

//brr brr patapim
//
// One-time bypass store (in-memory)
const temporaryAllow = new Set();

// ==============================
// IndexedDB
// ==============================

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }

            if (!db.objectStoreNames.contains('video')) {
                db.createObjectStore('video');
            }
        };
    });
}

async function getBlockedDomains() {
    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get('config');

            request.onsuccess = () => {
                resolve(request.result?.blockedDomains || []);
            };

            request.onerror = () => reject(request.error);

            tx.oncomplete = () => db.close();
        });
    } catch (error) {
        console.error('Error loading blocked domains:', error);
        return [];
    }
}

// ==============================
// Allow Once Listener
// ==============================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ALLOW_ONCE' && message.hostname) {
        temporaryAllow.add(message.hostname.toLowerCase());
        sendResponse({ ok: true });
    }
});

// ==============================
// Navigation Interceptor
// ==============================

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only main frame
    if (details.frameId !== 0) return;

    // Ignore extension pages
    if (details.url.startsWith('chrome-extension://')) return;

    try {
        const urlObj = new URL(details.url);
        const hostname = urlObj.hostname.toLowerCase();

        // Allow once logic
        if (temporaryAllow.has(hostname)) {
            temporaryAllow.delete(hostname);
            return;
        }

        const blockedDomains = await getBlockedDomains();
        if (!blockedDomains.length) return;

        const shouldBlock = blockedDomains.some(domain => {
            const clean = domain.toLowerCase().trim();
            return hostname === clean || hostname.endsWith('.' + clean);
        });

        if (shouldBlock) {
            const redirectUrl =
                chrome.runtime.getURL('block.html') +
                '?target=' +
                encodeURIComponent(details.url);

            chrome.tabs.update(details.tabId, { url: redirectUrl });
        }

    } catch (error) {
        console.error('Navigation processing error:', error);
    }
});

console.log('dikstract background service worker loaded');
