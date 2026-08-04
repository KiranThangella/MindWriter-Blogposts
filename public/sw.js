const CACHE_NAME = 'ai-news-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/index.html'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept same-origin requests (the app shell / static assets).
  // Cross-origin requests — most importantly calls to the Cloudflare
  // Worker backend at VITE_API_BASE_URL — must NOT be routed through this
  // service worker. Replaying a cross-origin Request object via fetch()
  // from inside a SW adds an extra, flaky layer on top of the browser's
  // own CORS handling (this was showing up as intermittent "Failed to
  // fetch" / CORS errors on /api/* calls that worked fine when the SW
  // wasn't yet controlling the page). Letting the browser handle
  // cross-origin requests directly removes the SW as a variable entirely.
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  // Navigation requests (the actual HTML document — "/" itself, and any
  // article/tool/static-page path since the SPA fallback serves the same
  // index.html for all of them) MUST go network-first. The old cache-first
  // strategy here served a stuck, stale index.html indefinitely after any
  // new deployment: Vite's JS/CSS filenames are content-hashed and change
  // on every build, so an old cached index.html keeps pointing at chunk
  // files that no longer exist on the server (404), silently breaking the
  // whole app (articles/data never load) until a hard refresh forced a
  // real network fetch. Network-first means every normal online visit —
  // including someone clicking a fresh Google search result — gets the
  // current build; the cached copy is now purely an offline fallback.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});

// --- Push notifications ("breaking news" alerts) ---
// Payload shape sent by the worker (see src/lib/push-notifications.ts):
// { title, body, url, icon, image }
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'మైండ్‌రైటర్', body: event.data ? event.data.text() : 'కొత్త కథనం అందుబాటులో ఉంది' };
  }

  const title = data.title || 'మైండ్‌రైటర్';
  const options = {
    body: data.body || 'కొత్త కథనం ప్రచురించబడింది',
    icon: data.icon || '/logo.png',
    badge: '/logo.png',
    image: data.image,
    data: { url: data.url || '/' },
    // Coalesces rapid-fire notifications (e.g. multiple auto-published
    // articles close together) into one slot instead of stacking a wall
    // of separate alerts.
    tag: 'mindwriter-article',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an already-open tab on that URL if one
// exists, instead of always opening a fresh tab.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
