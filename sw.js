// Offline cache. Bump VERSION whenever you change files so your phone picks up the update.
const VERSION = "fit-v4";
const FILES = ["./", "index.html", "css/base.css", "css/theme.css", "css/life.css", "js/main.js", "js/core.js", "js/engine.js", "js/plan.js", "js/figures.js", "js/config.js", "js/workouts.js",
  "js/life.js", "js/bible.js", "js/faith-ui.js", "js/books-ui.js", "js/hard-ui.js", "js/life-ui.js", "manifest.json", "icons/icon-180.png", "icons/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("fit-") && k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Network first, cache when offline (gym with no signal). Only the app's own files and fonts get cached —
// book searches and covers go straight to the internet.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const mine = u.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || /covers\.openlibrary\.org$/.test(u.hostname);
  if (!mine) return;
  e.respondWith(fetch(e.request).then((res) => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return res; }).catch(() => caches.match(e.request)));
});
