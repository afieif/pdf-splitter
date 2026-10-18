// Service worker: makes the app load offline and receives PDFs shared from other apps.
// build.py stamps VERSION with a hash of the app files, so each deploy refreshes the cache.
const VERSION = "__VERSION__";
const APP_CACHE = `pdf-splitter-${VERSION}`;
const FONT_CACHE = "pdf-splitter-fonts";
const SHARED_CACHE = "pdf-splitter-shared";
const APP_FILES = [
  "./",
  "manifest.webmanifest",
  "lib/pdf-lib.min.js",
  "lib/pdf.min.js",
  "lib/pdf.worker.min.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-64.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = [APP_CACHE, FONT_CACHE, SHARED_CACHE];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // A PDF shared from another app (Android share sheet): park it, then open the app.
  if (req.method === "POST" && url.pathname.endsWith("/share-target")) {
    event.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== "GET") return;

  // The page itself: try the network so updates arrive, fall back to the cached copy offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match("./")));
    return;
  }
  // Google Fonts: serve the cached copy, refresh it in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(req, FONT_CACHE));
    return;
  }
  // App files: cache first. They only change with a new VERSION.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});

async function receiveShare(req) {
  try {
    const form = await req.formData();
    const file = form.get("pdf");
    if (file && typeof file !== "string") {
      const cache = await caches.open(SHARED_CACHE);
      await cache.put(new URL("shared-pdf", self.registration.scope).href, new Response(file, {
        headers: { "Content-Type": "application/pdf", "X-Filename": encodeURIComponent(file.name || "shared.pdf") },
      }));
    }
  } catch { /* open the app anyway */ }
  return Response.redirect(new URL("./?shared=1", self.registration.scope).href, 303);
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then((res) => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; });
  return hit || update.catch(() => Response.error());
}
