// Mobiiz : les notifications (parcours §48) et, depuis la revue du 26 octobre 2026, le hors connexion.
// Hors connexion : les pages déjà vues et leurs données se rouvrent depuis le cache de CET appareil ; sinon une page
// « Pas de réseau » claire. Jamais en cache : l'authentification, l'admin, les fichiers, ce qui écrit (POST, PUT…).
// Le cache est vidé à la déconnexion et à la suppression du compte (message « vider »).
const VERSION = "mobiiz-2026-10-26";
const PAGES = `${VERSION}-pages`;
const STATIQUE = `${VERSION}-statique`;
const DONNEES = `${VERSION}-donnees`;
const HORS_CONNEXION = "/hors-connexion";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(new Request(HORS_CONNEXION, { cache: "reload" }))).catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "vider") event.waitUntil(caches.keys().then((cles) => Promise.all(cles.map((c) => caches.delete(c)))));
});

const JAMAIS = /^\/v1\/(auth|admin|internal|webhooks|me\/notifications)|\/(documents?|pdf|fichiers?)\b|\.pdf(\?|$)|demande-de-devis/;

async function reseauPuisCache(requete, nomCache) {
  const cache = await caches.open(nomCache);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok && reponse.type === "basic") cache.put(requete, reponse.clone());
    return reponse;
  } catch (e) {
    const garde = await cache.match(requete);
    if (garde) return garde;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin || JAMAIS.test(url.pathname)) return;

  // Les fichiers de Next ne changent jamais (leur nom porte leur empreinte) : le cache d'abord.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.open(STATIQUE).then((c) => c.match(requete).then((r) => r || fetch(requete).then((f) => (f.ok && c.put(requete, f.clone()), f)))));
    return;
  }
  // Les données (GET /v1/…) : le réseau d'abord, la dernière réponse si le réseau manque.
  if (url.pathname.startsWith("/v1/")) {
    event.respondWith(reseauPuisCache(requete, DONNEES));
    return;
  }
  // Les pages : le réseau d'abord ; la page déjà vue ; sinon « Pas de réseau ».
  if (requete.mode === "navigate") {
    event.respondWith(reseauPuisCache(requete, PAGES).catch(() => caches.open(PAGES).then((c) => c.match(HORS_CONNEXION)).then((r) => r || new Response("Pas de réseau.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }))));
  }
});

// La notification envoyée par le serveur (Web Push) : elle arrive téléphone verrouillé ou application fermée.
// Toujours montrée (les navigateurs l'exigent) ; même étiquette que celle de la page : une seule s'affiche.
self.addEventListener("push", (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch {
    m = {};
  }
  const title = m.title || "Mobiiz";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: m.body || "C'est prêt.",
      tag: m.tag || "mobiiz",
      renotify: true,
      icon: "/icon-192.png",
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
