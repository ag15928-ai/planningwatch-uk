const CACHE_NAME = "planningwatch-shell-v6";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./background-alerts-config.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("planningwatch-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (new URL(request.url).pathname.endsWith("/data/renewables.json")) return;
  event.respondWith(fetch(request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    return response;
  }).catch(() => caches.match(request).then(cached => cached || caches.match("./index.html"))));
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {body: event.data?.text() || "A renewable project update is available."}; }
  const title = data.title || "PlanningWatch UK update";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "A renewable project change was detected near your saved centre.",
    data: {url: data.url || "./#alerts"},
    tag: "planningwatch-renewable-update"
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./#alerts", self.location.href).href;
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => {
    const match = clients.find(client => client.url.startsWith(self.location.origin));
    if (match) { match.navigate(target); return match.focus(); }
    return self.clients.openWindow(target);
  }));
});
