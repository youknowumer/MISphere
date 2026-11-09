/* MISphere service worker - offline support.
   Bump VERSION on every release (it must match version.json). */
var VERSION = 'mis-11.16.0';
var SHELL = [
  './', 'index.html', 'landing.html', 'manifest.webmanifest', 'favicon.svg',
  'vendor/fonts.css', 'vendor/xlsx.full.min.js',
  'vendor/fonts/inter-latin-wght-normal.woff2', 'vendor/fonts/inter-latin-ext-wght-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'MIS-Task-Import-Template.xlsx'
];

self.addEventListener('install', function (e) {
  /* each file is cached on its own: one missing file can never break the install */
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('mis-') === 0 && k !== VERSION; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;                 /* GitHub / Worker / Odoo calls are never touched */
  if (url.pathname.slice(-12) === 'version.json') return;     /* the update check always asks the network */
  if (req.mode === 'navigate') {                              /* pages: network first, cache when offline */
    e.respondWith(fetch(req).then(function (r) {
      var cp = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, cp); }); return r;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('index.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (m) {         /* assets: cache first, refresh in background */
    var net = fetch(req).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, cp); }); }
      return r;
    }).catch(function () { return m; });
    return m || net;
  }));
});
