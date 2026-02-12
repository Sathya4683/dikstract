const DB_NAME = 'dikstract-db';
const DB_VERSION = 1;

export interface Config {
  blockedDomains: string[];
}

export interface VideoData {
  blob: Blob;
  size: number;
  duration: number;
}


//   Database Connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }

      if (!db.objectStoreNames.contains('video')) {
        db.createObjectStore('video');
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/* ===============================
   Config Store
================================ */

export async function getConfig(): Promise<Config> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('config');

    request.onsuccess = () => {
      resolve(request.result || { blockedDomains: [] });
    };

    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

export async function saveConfig(config: Config): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put(config, 'config');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

//   Video Store

export async function getVideo(): Promise<VideoData | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('video', 'readonly');
    const store = tx.objectStore('video');
    const request = store.get('motivation');

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

export async function saveVideo(videoData: VideoData): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('video', 'readwrite');
    const store = tx.objectStore('video');
    const request = store.put(videoData, 'motivation');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

export async function deleteVideo(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('video', 'readwrite');
    const store = tx.objectStore('video');
    const request = store.delete('motivation');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

//   Video Validation (Safer)

export async function validateVideo(
  file: File
): Promise<{ valid: boolean; error?: string; duration?: number }> {
  const MAX_SIZE = 15 * 1024 * 1024; // 15MB

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File exceeds 15MB limit' };
  }

  if (!file.type.startsWith('video/')) {
    return { valid: false, error: 'Invalid video file type' };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(objectUrl);

      if (!isFinite(duration) || duration <= 0) {
        resolve({ valid: false, error: 'Invalid video metadata' });
        return;
      }

      if (duration > 20) {
        resolve({ valid: false, error: 'Video must be under 20 seconds' });
        return;
      }

      resolve({ valid: true, duration });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ valid: false, error: 'Unsupported or corrupted video file' });
    };

    try {
      video.src = objectUrl;
    } catch {
      URL.revokeObjectURL(objectUrl);
      resolve({ valid: false, error: 'Video processing failed' });
    }
  });
}
