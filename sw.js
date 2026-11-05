// Кешбекер — service worker.
// Единственная задача: всегда брать свежую страницу (index.html) из сети, а не из кеша браузера.
// GitHub Pages разрешает хранить файлы 10 минут, и без этого айфон показывал старую версию сайта.
// Без интернета отдаём то, что есть в кеше, — сайт всё равно откроется.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.mode !== "navigate") return;            // стили и скрипты обновляются через ?v= в index.html
  e.respondWith(fetch(r, { cache: "no-store" }).catch(() => fetch(r)));
});
