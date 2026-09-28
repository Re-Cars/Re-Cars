/*
 * Service worker di RE|CARS (PWA).
 * - Pagine: sempre dalla rete; se si è offline si mostra /offline.html.
 *   Niente cache dei dati: le API stanno su un altro dominio e restano
 *   sempre aggiornate.
 * - Notifiche push dal backend (POST /notifiche/*): payload JSON
 *   { titolo, testo, url, tag }; il tocco apre (o porta in primo piano)
 *   la pagina indicata.
 */
const CACHE = "recars-v1";
const OFFLINE = "/offline.html";
const PRECACHE = [OFFLINE, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});

self.addEventListener("push", (event) => {
  let dati = {};
  try {
    dati = event.data ? event.data.json() : {};
  } catch {
    dati = { testo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(dati.titolo || "RE|CARS", {
      body: dati.testo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: dati.tag,
      lang: "it",
      data: { url: dati.url || "/homepage" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/homepage", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((finestre) => {
      const aperta = finestre.find((f) => f.url.startsWith(self.location.origin));
      if (aperta) return aperta.focus().then((f) => f.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
