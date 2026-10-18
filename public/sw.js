/* Service worker: installable app, offline fallback, offline visit passes and
 * prescriptions, and push notifications. Caches are cleared on logout
 * (the logout response sends Clear-Site-Data). */
const VERSION = "v2";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon.svg"];
// Pages people may need without internet: the clinic visit pass and prescriptions.
const KEEP_OFFLINE = [/^\/consults\/[^/]+\/pass$/, /^\/prescriptions\/[^/]+$/, /^\/api\/prescriptions\/[^/]+\/pdf$/];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache live consult traffic or other APIs.
  if (url.pathname.startsWith("/api/") && !KEEP_OFFLINE.some((r) => r.test(url.pathname))) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); return res; })));
    return;
  }

  const keep = KEEP_OFFLINE.some((r) => r.test(url.pathname));
  if (req.mode === "navigate" || keep) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (keep && res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? caches.match("/offline") : Response.error())),
    );
  }
});

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: "Update", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || "Update", { body: data.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { link: data.url || data.link || "/notifications" }, tag: data.tag }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) { c.navigate(link); return c.focus(); }
      return self.clients.openWindow(link);
    }),
  );
});
