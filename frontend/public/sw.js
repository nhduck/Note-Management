const CACHE_NAME = "note-app-v1";

// Installation complete - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/", "/index.html"]);
    })
  );
});

// For each request -> try network first, fallback to cache on error
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return; // skip POST requests
  if (event.request.url.includes("/api/")) return; // skip API requests

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Online -> update cache for later use
        const copy = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => {
        // Offline -> serve from cache
        return caches.match(event.request);
      })
  );
});