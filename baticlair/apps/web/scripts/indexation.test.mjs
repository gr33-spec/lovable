import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { indexationActive, NOINDEX, PAGES_INDEXABLES, reglesXRobots, ROBOTS_ENTRAINEMENT, sitesArtisansIndexes } from "../src/lib/indexation.ts";
import { donneesOrganisation } from "../src/lib/organisation.ts";

/**
 * RÉFÉRENCEMENT (Greg, 28 novembre 2026) : seul mobiiz.fr en production s'ouvre aux moteurs, page par page ; le site de
 * test, les adresses Vercel et tout le reste disent « noindex ». Le test rejoue les règles avec le routeur de Next lui-même
 * (même expression que dans le manifeste lu par Vercel, même lecture de `has` / `missing`).
 */
const require = createRequire(import.meta.url);
const { buildCustomRoute } = require("next/dist/lib/build-custom-route");
const { matchHas } = require("next/dist/shared/lib/router/utils/prepare-destination");

/** « noindex » pour cette adresse et cet hôte ? */
function noindex(env, hote, chemin) {
  return reglesXRobots(env).some((r) => {
    const route = buildCustomRoute("header", r);
    if (!new RegExp(route.regex).test(chemin)) return false;
    return !!matchHas({ headers: { host: hote } }, {}, r.has, r.missing);
  });
}

const PROD = { INDEXATION_SITE: "on", VERCEL_ENV: "production" };
const PRIVEES = ["/connexion", "/inscription", "/commencer", "/compte", "/chantiers/abc", "/admin", "/admin/reglages", "/chiffrer/jeton123", "/reponse/xyz", "/grille/j", "/achat-groupe/j", "/negoce", "/negoce/connexion", "/couvreurs", "/couvreurs-bretagne", "/decouvrir", "/version", "/v1/projects", "/v1/public/pages/dupont", "/photos/a.jpg", "/e/dupont-couverture", "/mon-site", "/messages", "/tarifs/x", "/cgu-bis", "/peintres"];
const OUVERTES = [...PAGES_INDEXABLES, "/robots.txt", "/sitemap.xml", "/marque/icone-1024.png", "/landing/v3/ecran.webp", "/_next/static/chunks/a.js", "/favicon.ico"];

test("le site de test et toute adresse hors production : tout est noindex", () => {
  for (const env of [{}, { INDEXATION_SITE: "on" }, { VERCEL_ENV: "production" }, { INDEXATION_SITE: "on", VERCEL_ENV: "preview" }, { PAGES_ENTREPRISES_INDEXEES: "on", VERCEL_ENV: "preview" }]) {
    assert.equal(indexationActive(env), false);
    for (const hote of ["test.mobiiz.fr", "mobiiz.fr", "baticlair-git-x-gr33-spec.vercel.app", "localhost"]) {
      for (const chemin of [...OUVERTES, ...PRIVEES]) assert.ok(noindex(env, hote, chemin), `${JSON.stringify(env)} ${hote}${chemin}`);
    }
  }
});

test("production, mobiiz.fr : la landing, les tarifs et les pages légales sont ouvertes, le reste est noindex", () => {
  for (const chemin of OUVERTES) assert.equal(noindex(PROD, "mobiiz.fr", chemin), false, chemin);
  for (const chemin of PRIVEES) assert.ok(noindex(PROD, "mobiiz.fr", chemin), chemin);
  // Un port ou des majuscules ne changent rien.
  assert.equal(noindex(PROD, "Mobiiz.fr:443", "/tarifs"), false);
});

test("production, mais un autre hôte (test, www, adresse Vercel, imitation) : tout est noindex", () => {
  for (const hote of ["test.mobiiz.fr", "www.mobiiz.fr", "api-test.mobiiz.fr", "baticlair.vercel.app", "mobiizxfr", "mobiiz.fr.exemple.com", "faux-mobiiz.fr"]) {
    for (const chemin of [...OUVERTES, ...PRIVEES]) assert.ok(noindex(PROD, hote, chemin), `${hote}${chemin}`);
  }
});

test("les sites des artisans : ouverts seulement sur mobiiz.fr en production ET avec PAGES_ENTREPRISES_INDEXEES", () => {
  assert.equal(sitesArtisansIndexes({ PAGES_ENTREPRISES_INDEXEES: "on" }), false);
  assert.ok(noindex(PROD, "mobiiz.fr", "/e/dupont-couverture"));
  const avecSites = { ...PROD, PAGES_ENTREPRISES_INDEXEES: "on" };
  assert.ok(sitesArtisansIndexes(avecSites));
  assert.equal(noindex(avecSites, "mobiiz.fr", "/e/dupont-couverture"), false);
  assert.ok(noindex(avecSites, "test.mobiiz.fr", "/e/dupont-couverture"));
  assert.ok(noindex(avecSites, "mobiiz.fr", "/compte"));
});

test("l'en-tête est bien noindex, nofollow ; les robots d'entraînement sont nommés", () => {
  assert.deepEqual(NOINDEX, [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]);
  for (const r of ["GPTBot", "ClaudeBot", "Google-Extended"]) assert.ok(ROBOTS_ENTRAINEMENT.includes(r), r);
  // Jamais un robot de RECHERCHE dans la liste refusée.
  for (const r of ["Googlebot", "Bingbot", "OAI-SearchBot", "Claude-SearchBot", "ChatGPT-User", "Claude-User", "PerplexityBot"]) assert.ok(!ROBOTS_ENTRAINEMENT.includes(r), r);
});

test("données structurées : Organization et WebSite, sans avis ni note", () => {
  const d = donneesOrganisation("https://mobiiz.fr", { nom: "Mobiiz", editeur: "BATI INVEST", email: "contact@mobiiz.fr", accroche: "Par des artisans, pour les artisans." });
  const types = d["@graph"].map((n) => n["@type"]);
  assert.deepEqual(types, ["Organization", "WebSite"]);
  assert.equal(d["@graph"][0].url, "https://mobiiz.fr/");
  assert.doesNotMatch(JSON.stringify(d), /aggregateRating|review|ratingValue/i);
});
