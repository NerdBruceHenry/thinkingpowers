// 离线缓存（由 tools/gen-sw.mjs 生成，请勿手改）
const VERSION = 'tp-3f97a58040';
const FILES = [
  "./",
  "./css/style.css",
  "./icon.svg",
  "./index.html",
  "./js/app.js",
  "./js/data/badges.js",
  "./js/data/cards/classic1.js",
  "./js/data/cards/classic2.js",
  "./js/data/cards/expand1.js",
  "./js/data/cards/expand2.js",
  "./js/data/cards/expand3.js",
  "./js/data/cards/index.js",
  "./js/data/games.js",
  "./js/data/meta.js",
  "./js/data/talks.js",
  "./js/games/index.js",
  "./js/logic.js",
  "./js/state.js",
  "./js/ui.js",
  "./js/views/games.js",
  "./js/views/home.js",
  "./js/views/journal.js",
  "./js/views/parent.js",
  "./js/views/review.js",
  "./js/views/talk.js",
  "./js/views/universe.js",
  "./manifest.webmanifest",
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// 网络优先（保证更新），离线时用缓存
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});
