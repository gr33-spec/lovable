import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * COOKIES : SEULEMENT LES NÉCESSAIRES (RGPD, Greg, 24 octobre 2026). Aucun script, aucune police, aucune image chargés
 * d'un autre site : pas de mesure d'audience, pas de pixel, donc rien à accepter (page Confidentialité, section Cookies).
 * La politique de sécurité du site le verrouille (`default-src 'self'`) ; ce test refuse un ajout dans le code.
 */
const racine = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const fichiers = (dossier) =>
  readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n);
    return statSync(p).isDirectory() ? fichiers(p) : /\.(tsx?|css|mjs)$/.test(n) ? [p] : [];
  });

const INTERDITS = [
  /googletagmanager|google-analytics|gtag\(|facebook\.net|fbq\(|hotjar|segment\.com|plausible|matomo|clarity\.ms|mixpanel|posthog|intercom|crisp\.chat/i,
  /<script[^>]*\ssrc=\{?["'`]https?:/i,
  /from ["']next\/script["']/,
  /@import\s+url\(["']?https?:/i,
  /fonts\.googleapis|fonts\.gstatic/i,
];

test("Turnstile (Greg, 26 octobre 2026) est le seul site extérieur, dans son seul composant", () => {
  const externes = [];
  for (const f of fichiers(join(racine, "src"))) {
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(/["'`] ?https:\/\/challenges\.cloudflare\.com[^"'`]*/g)) externes.push(`${f.slice(racine.length + 1)} ${m[0]}`);
  }
  assert.deepEqual(externes.map((e) => e.split(" ")[0]).sort(), ["src/components/turnstile.tsx", "src/lib/csp.ts"]);
});

test("aucun script ni traceur tiers dans le site", () => {
  const fautes = [];
  for (const f of fichiers(join(racine, "src"))) {
    const texte = readFileSync(f, "utf8");
    for (const motif of INTERDITS) if (motif.test(texte)) fautes.push(`${f.slice(racine.length + 1)} : ${motif}`);
  }
  assert.deepEqual(fautes, []);
});

test("la politique de sécurité ne laisse rien venir d'ailleurs ; un script ne passe qu'avec le nonce (26 octobre 2026)", () => {
  const csp = readFileSync(join(racine, "src", "lib", "csp.ts"), "utf8");
  assert.match(csp, /"default-src 'self'"/);
  assert.match(csp, /`script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.doesNotMatch(csp, /script-src[^`"]*unsafe-inline/);
  assert.match(csp, /"connect-src 'self' blob:"/);
  assert.doesNotMatch(csp, /-src[^"`]*https?:/);
  // Le proxy pose la politique sur chaque page ; next.config n'en pose plus une seconde, plus large.
  assert.match(readFileSync(join(racine, "src", "proxy.ts"), "utf8"), /Content-Security-Policy/);
  assert.doesNotMatch(readFileSync(join(racine, "next.config.ts"), "utf8"), /unsafe-inline/);
});
