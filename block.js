// Block page script - handles video playback and user decision

const DB_NAME = 'dikstract-db';
const DB_VERSION = 1;

let targetUrl = '';

// ==============================
// Utilities
// ==============================

function getTargetUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('target') || '';
}

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

async function getVideo() {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('video', 'readonly');
      const store = tx.objectStore('video');
      const request = store.get('motivation');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error reading video:', error);
    return null;
  }
}

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').innerHTML =
    `<div class="error">${message}</div>`;
  document.getElementById('error').style.display = 'block';

  document.getElementById('message').textContent = 'continue anyway?';
  document.getElementById('message').style.display = 'block';
  document.getElementById('actions').style.display = 'flex';
}

function showDecision() {
  document.getElementById('message').style.display = 'block';
  document.getElementById('actions').style.display = 'flex';
}

// ==============================
// Init
// ==============================

async function init() {
  targetUrl = getTargetUrl();

  if (!targetUrl) {
    showError('No target URL specified.');
    return;
  }

  const videoData = await getVideo();

  if (!videoData || !videoData.blob) {
    showError(
      'No motivational video configured.<br><br>Go to settings and upload one.'
    );
    return;
  }

  const loading = document.getElementById('loading');
  const videoContainer = document.getElementById('videoContainer');
  const videoElement = document.getElementById('video');

  try {
    const objectUrl = URL.createObjectURL(videoData.blob);
    videoElement.src = objectUrl;

    loading.style.display = 'none';
    videoContainer.style.display = 'block';

    videoElement.addEventListener('ended', () => {
      showDecision();
    });

    videoElement.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      showError('Failed to play video.');
    });

  } catch (error) {
    showError('Failed to load video.');
  }
}

// ==============================
// Continue (FIXED LOGIC)
// ==============================

document.getElementById('continueBtn').addEventListener('click', () => {
  if (!targetUrl) return;

  try {
    const urlObj = new URL(targetUrl);
    const hostname = urlObj.hostname;

    chrome.runtime.sendMessage(
      { type: 'ALLOW_ONCE', hostname },
      () => {
        window.location.href = targetUrl;
      }
    );
  } catch (error) {
    window.location.href = targetUrl;
  }
});

// ==============================
// Close Tab
// ==============================

document.getElementById('closeBtn').addEventListener('click', () => {
  chrome.tabs.getCurrent((tab) => {
    if (tab?.id) {
      chrome.tabs.remove(tab.id);
    } else {
      window.close();
    }
  });
});

// ==============================

init();
