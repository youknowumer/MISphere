/* MISphere service worker — offline-first app shell.
   Pages and version.json: network first (so updates are always picked up), cache as fallback.
   Everything else (fonts, Excel library, icons): cache first.  © 2026 Muhammad Umer Faheem */
const VERSION = "11.3.0";
const CACHE = "misphere-" + VERSION;
const CORE = [
  "./", "index.html", "landing.html", "manifest.webmanifest", "favicon.svg",
  "vendor/xlsx.full.min.js", "vendor/fonts.css",
  "vendor/fonts/inter-latin-wght-normal.woff2", "vendor/fonts/inter-latin-ext-wght-normal.woff2",
  "vendor/fonts/bricolage-grotesque-latin-600-normal.woff2", "vendor/fonts/bricolage-grotesque-latin-700-normal.woff2", "vendor/fonts/bricolage-grotesque-latin-800-normal.woff2",
  "vendor/fonts/instrument-sans-latin-400-normal.woff2", "vendor/fonts/instrument-sans-latin-500-normal.woff2", "vendor/fonts/instrument-sans-latin-600-normal.woff2", "vendor/fonts/instrument-sans-latin-700-normal.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "MIS-Task-Import-Template.xlsx"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("misphere-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const networkFirst = async (req, timeout = 4000) => {
  const c = await caches.open(CACHE);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    const r = await fetch(req, { cache: "no-store", signal: ctl.signal }); clearTimeout(t);
    if (r && r.ok) c.put(req.url.split("?")[0].endsWith("version.json") ? req : new Request(req.url.split("?")[0]), r.clone());
    return r;
  } catch (_) {
    return (await c.match(req, { ignoreSearch: true })) || (await c.match("index.html")) || Response.error();
  }
};
const cacheFirst = async req => {
  const c = await caches.open(CACHE), hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r;
};
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;     // GitHub sync etc. go straight to the network
  const isPage = req.mode === "navigate" || /\.(html|json|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  e.respondWith(isPage ? networkFirst(req) : cacheFirst(req));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
