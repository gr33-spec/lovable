// BatiClair : seulement pour prévenir l'artisan quand sa liste est prête (parcours §48). Aucun cache, aucune requête.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// La notification envoyée par le serveur (Web Push) : elle arrive téléphone verrouillé ou application fermée.
// Toujours montrée (les navigateurs l'exigent) ; même étiquette que celle de la page : une seule s'affiche.
self.addEventListener("push", (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch {
    m = {};
  }
  const title = m.title || "BatiClair";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: m.body || "C'est prêt.",
      tag: m.tag || "baticlair",
      renotify: true,
      icon: "/icon.svg",
      data: { url: new URL(m.url || "/", self.location.origin).href },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (url && "navigate" in c && c.url !== url) return c.focus().then(() => c.navigate(url));
        if ("focus" in c) return c.focus();
      }
      return url ? self.clients.openWindow(url) : undefined;
    }),
  );
});
