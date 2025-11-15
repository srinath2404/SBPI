/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'sbpi-cache-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests for now
  if (url.origin !== self.location.origin) return;

  if (request.url.includes('/api/')) {
    // Network-first for API
    event.respondWith(
      fetch(request).catch(() => caches.match(request)),
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});

// Background Sync: ask clients to sync pending pipes when possible
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-pipes') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  try {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      client.postMessage({ type: 'SYNC_PENDING_PIPES' });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[SW] Failed to notify clients for sync', err);
  }
}
