/* Offline support. Version and precache list are stamped in by build_v3.py.
   App files: cache first. data.json: network first so updates arrive. Fonts: stale while revalidate.
   Photos from other sites: cache first, capped, because opaque responses use a lot of quota. */
const VERSION = "fecbfbe900";
const SHELL = ["./", "index.html", "styles.css", "data.json", "manifest.webmanifest", "icon-192.png", "icon-512.png", "app.js", "cards.js", "explore.js", "i18n.js", "mapview.js", "picks.js", "planner.js", "share.js", "sheet.js", "state.js", "today.js", "util.js", "weather.js", "img/almadies.webp", "img/bandia.webp", "img/divinite.webp", "img/djoudj.webp", "img/goree.webp", "img/grande-mosquee.webp", "img/hann.webp", "img/kayar.webp", "img/lac-rose.webp", "img/madeleine.webp", "img/maison-esclaves.webp", "img/mamelles.webp", "img/monod.webp", "img/monument.webp", "img/musee-femme.webp", "img/musee-historique.webp", "img/ngor.webp", "img/saint-louis.webp", "img/sorano.webp", "img/village-arts.webp", "img/yoff.webp"];
const C_SHELL = "dkr3-shell-" + VERSION, C_IMG = "dkr3-img", C_FONT = "dkr3-font";
const IMG_MAX = 60;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(C_SHELL).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("dkr3-shell-") && k !== C_SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.endsWith("/data.json")) {
      e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(C_SHELL).then(c => c.put(req, copy)); return r; })
        .catch(() => caches.match(req)));
      return;
    }
    if (req.mode === "navigate") {
      e.respondWith(fetch(req).catch(() => caches.match("index.html", { ignoreSearch: true }).then(r => r || caches.match("./"))));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(C_FONT).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (req.destination === "image") {
    e.respondWith(caches.open(C_IMG).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      c.put(req, r.clone()).then(() => trim(C_IMG, IMG_MAX));
      return r;
    }))));
  }
  // Everything else (weather API, outbound links) goes straight to the network.
});
