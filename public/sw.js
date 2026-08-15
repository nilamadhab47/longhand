// longhand service worker
//
// Cache strategy:
//   - static  (cache-first, immutable):  /_next/static/*, /icon-*, /manifest.webmanifest
//   - pages   (stale-while-revalidate):  /, /n/:sectionId, /sign-in
//   - none    (network-only, never store): /api/*, non-GET, cross-origin
//
// Cache naming is versioned via the ?v= query on the sw.js registration URL.
// When a new build ships, PwaRegister registers /sw.js?v=<newId>, the browser
// treats the byte-different URL as a new worker, this file re-installs, and
// old caches are dropped in `activate`.

const VERSION = (() => {
  try {
    return new URL(self.location.href).searchParams.get("v") || "dev";
  } catch {
    return "dev";
  }
})();

const CACHES = {
  static: `longhand-static-${VERSION}`,
  pages: `longhand-pages-${VERSION}`,
};

const PRECACHE_STATIC = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

const MAX_PAGES = 24;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHES.static);
      // Best-effort precache — never let one 404 abort install.
      await Promise.all(
        PRECACHE_STATIC.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            // ignore
          }
        }),
      );
      // Do NOT call skipWaiting() here. We let the client decide when
      // to activate the new worker (via the "New version available" toast),
      // so an in-flight edit is never interrupted by a sudden reload.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const keep = new Set(Object.values(CACHES));
      await Promise.all(
        keys
          .filter((key) => key.startsWith("longhand-") && !keep.has(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      broadcast({ type: "ACTIVATED", version: VERSION });
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API traffic — auth, mutations, and search must always
  // hit the network so results and errors are honest.
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icon-")
  ) {
    event.respondWith(cacheFirst(request, CACHES.static));
    return;
  }

  if (url.pathname === "/") {
    event.respondWith(networkFirst(request, CACHES.pages));
    return;
  }

  if (url.pathname.startsWith("/n/") || url.pathname === "/sign-in") {
    event.respondWith(staleWhileRevalidate(event, CACHES.pages));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(event.request, response.clone());
        await trimCache(cache, MAX_PAGES);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Keep the worker alive until the background refresh finishes so the
    // next navigation sees fresh content.
    event.waitUntil(network);
    return cached;
  }

  const response = await network;
  if (response) return response;

  const rootShell = await cache.match("/");
  if (rootShell) return rootShell;
  return new Response(
    "<!doctype html><meta charset=utf-8><title>Offline</title><p style='font-family:system-ui;padding:2rem'>You're offline and this page isn't cached yet.</p>",
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length <= max) return;
  const excess = keys.length - max;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i]);
  }
}

function broadcast(message) {
  void self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) client.postMessage(message);
  });
}
