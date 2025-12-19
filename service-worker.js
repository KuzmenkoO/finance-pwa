self.addEventListener("install", event => {
  const CACHE_NAME = "v2";
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        "./",
        "./index.html",
        "./styles/base.css",
        "./styles/mobile.css",
        "./scripts/state.js",
        "./scripts/options.js",
        "./scripts/renderers.js",
        "./scripts/forms.js",
        "./scripts/app-init.js",
        "./scripts/ui.js",
        "./manifest.json",
        "./icon-192.png",
        "./icon-512.png"
      ])
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
