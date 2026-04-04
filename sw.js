// Garden OS — Service Worker
// Strategy: network-first for the app shell, passthrough for all external APIs.

const CACHE = 'garden-os-v1';
const SHELL  = ['./index.html', './'];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) { return c.addAll(SHELL); })
      .then(function() { return self.skipWaiting(); })
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.filter(function(k) { return k !== CACHE; })
              .map(function(k) { return caches.delete(k); })
        );
      })
      .then(function() { return self.clients.claim(); })
  );
});

// ── Fetch: external URLs pass straight through; app shell uses network-first ──
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Always let API calls, fonts, and other origins go directly to network.
  // Intercepting them offline-only would surface stale data — not useful here.
  if (url.origin !== self.location.origin) return;

  // For same-origin requests (the HTML itself), use network-first.
  // On success, update the cache. On failure, serve the cached shell.
  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return response;
      })
      .catch(function() {
        return caches.match(e.request)
          .then(function(cached) { return cached || caches.match('./index.html'); });
      })
  );
});
