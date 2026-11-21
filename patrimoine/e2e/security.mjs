// Tests d'intrusion : accès sans session, cookies falsifiés, requêtes d'un
// autre site, fichiers, cloisonnement de l'accès gestion, liens de partage,
// déconnexion, essais de mot de passe, secrets, données intactes.
import { O, check, cookieOf, done, gestionPassword, login, ownerPassword, req, base } from "./lib.mjs";

// 0. Données de référence
const owner = (await login(ownerPassword)).cookie;
const d = (await (await req("/api/data", owner)).json()).data;
const before = JSON.stringify(d);
const bilanFile = d.statements.find((s) => s.fileId)?.fileId;
const leaseFile = d.tenancies.find((t) => t.signedLease?.fileId)?.signedLease.fileId;
const docFile = d.documents.find((x) => x.fileId)?.fileId;
console.log("fichiers de test :", { bilanFile, leaseFile, docFile });

// 1. Sans session
for (const p of ["/api/data", "/api/backup", "/api/export-excel", "/api/shares", "/api/snapshots", "/api/dossier-banque", ...(bilanFile ? [`/api/files/${bilanFile}`] : []), "/api/access", "/api/passkey", "/api/irl"]) {
  const r = await req(p);
  check(`sans session ${p} refusé`, r.status === 401, r.status);
}
for (const p of ["/", "/patrimoine", "/documents", "/plus", "/gestion", "/plus/sauvegardes"]) {
  const r = await req(p);
  check(`sans session page ${p} → connexion`, r.status === 307 && r.headers.get("location")?.includes("/connexion"), `${r.status} ${r.headers.get("location")}`);
}
const bogus = await req("/partage/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
const bogusTxt = await bogus.text();
check("faux lien de partage : aucune donnée", !d.companies[0] || !bogusTxt.includes(d.companies[0].name), bogus.status);
check("dossier par faux lien refusé", (await req("/partage/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/dossier")).status === 404);

// 2. Cookie falsifié
const [payload, sig] = owner.split("=")[1].split(".");
const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), exp: Date.now() + 1e12 })).toString("base64url");
check("cookie falsifié refusé", (await req("/api/data", `patrimoine_session=${forged}.${sig}`)).status === 401);
check("cookie sans signature refusé", (await req("/api/data", `patrimoine_session=${payload}`)).status === 401);

// 3. CSRF
const csrf = await req("/api/ops", owner, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ ops: [{ op: "settings", patch: { groupName: "PIRATE" } }] }) });
check("requête d'un autre site (Origin) refusée", csrf.status === 403, csrf.status);
const csrf2 = await req("/api/ops", owner, { method: "POST", headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" }, body: JSON.stringify({ ops: [{ op: "settings", patch: { groupName: "PIRATE" } }] }) });
check("requête d'un autre site (Sec-Fetch-Site) refusée", csrf2.status === 403, csrf2.status);

// 4. Fichiers : chemin, injection, altération, faux contenu
for (const p of ["/api/files/..%2F..%2Fetc%2Fpasswd", "/api/files/'%20OR%201=1--", "/api/files/00000000-0000-0000-0000-000000000000"]) {
  const r = await req(p, owner);
  check(`fichier ${p} introuvable`, r.status === 404, r.status);
}
if (bilanFile) {
  const r = await req(`/api/files/${bilanFile}?i=0`, owner, { method: "PUT", headers: O, body: "%PDF-1.4 falsifié" });
  check("document existant non modifiable (propriétaire compris)", r.status === 400, `${r.status} ${await r.text()}`);
}
const meta = await (await req("/api/files", owner, { method: "POST", headers: { "content-type": "application/json", ...O }, body: JSON.stringify({ name: "x.pdf", size: 20, mime: "application/pdf", sha256: "0".repeat(64) }) })).json();
const fake = await req(`/api/files/${meta.id}?i=0`, owner, { method: "PUT", headers: O, body: "<html><script>alert(1)</script>" });
check("page HTML déguisée en PDF refusée", fake.status === 400, fake.status);
await req(`/api/files/${meta.id}`, owner, { method: "DELETE", headers: O });
const emp = await (await req("/api/files/empreinte", owner, { method: "POST", headers: { "content-type": "application/json", ...O }, body: JSON.stringify({ sha256: "0".repeat(64) }) })).json();
check("empreinte annoncée par le navigateur ignorée", emp.files.length === 0, JSON.stringify(emp));

// 5. Espace gestion (Enora)
const gestion = (await login(gestionPassword)).cookie;
check("connexion gestion", !!gestion);
const gd = (await (await req("/api/data", gestion)).json()).data;
check("gestion : aucun prêt, bilan ni document du patrimoine", gd.loans.length === 0 && gd.statements.length === 0 && gd.documents.length === 0 && !gd.settings.analyses);
check("gestion : valeur des biens masquée", gd.units.every((u) => u.value === undefined));
for (const [label, id] of [["bilan", bilanFile], ["document", docFile]]) {
  if (!id) continue;
  const r = await req(`/api/files/${id}`, gestion);
  check(`gestion : ${label} d'une SCI refusé`, r.status === 403, r.status);
  const del = await req(`/api/files/${id}`, gestion, { method: "DELETE", headers: O });
  check(`gestion : suppression du ${label} refusée`, del.status === 403, del.status);
}
if (leaseFile) check("gestion : bail signé accessible", (await req(`/api/files/${leaseFile}`, gestion)).status === 200);
for (const p of ["/api/backup", "/api/export-excel", "/api/dossier-banque", "/api/shares", "/api/access", "/api/snapshots", "/api/sessions", "/api/analyse"]) {
  const r = await req(p, gestion);
  check(`gestion : ${p} refusé`, r.status === 403, r.status);
}
for (const p of ["/patrimoine", "/plus", "/documents", "/plus/sauvegardes"]) {
  const r = await req(p, gestion);
  check(`gestion : page ${p} fermée`, r.status === 307 && r.headers.get("location")?.includes("/gestion"), r.status);
}
await req("/api/ops", gestion, { method: "POST", headers: { "content-type": "application/json", ...O }, body: JSON.stringify({ ops: [{ op: "upsert", coll: "loans", item: { id: "pirate", name: "pirate" } }, { op: "delete", coll: "statements", id: d.statements[0]?.id ?? "x" }, { op: "settings", patch: { groupName: "PIRATE" } }] }) });
const after = (await (await req("/api/data", owner)).json()).data;
check("gestion : écritures hors périmètre ignorées", !after.loans.some((l) => l.id === "pirate") && after.statements.length === d.statements.length && after.settings.groupName === d.settings.groupName);

// 6. Lien de partage
const share = await (await req("/api/shares", owner, { method: "POST", headers: { "content-type": "application/json", ...O }, body: JSON.stringify({ label: "Test intrusion", days: 1 }) })).json();
const open = await req(`/partage/${share.token}/ouvrir`);
const lecture = cookieOf(open);
check("lien de partage : session de consultation", !!lecture);
check("consultation : lecture autorisée", (await req("/api/data", lecture)).status === 200);
const w = await req("/api/ops", lecture, { method: "POST", headers: { "content-type": "application/json", ...O }, body: JSON.stringify({ ops: [{ op: "settings", patch: { groupName: "PIRATE" } }] }) });
check("consultation : écriture refusée", w.status === 403, w.status);
for (const p of ["/api/backup", "/api/export-excel", "/api/shares", "/api/snapshots"]) check(`consultation : ${p} refusé`, (await req(p, lecture)).status === 403);
const swap = await req(`/partage/${share.token}/ouvrir?confirmer=1`, owner, { headers: { "sec-fetch-site": "cross-site" } });
check("lien piégé d'un autre site : session du propriétaire conservée", !cookieOf(swap), swap.headers.get("location"));
await req(`/api/shares/${share.link.id}`, owner, { method: "DELETE", headers: O });
check("lien révoqué : consultation coupée aussitôt", (await req("/api/data", lecture)).status === 401);
check("lien révoqué : ne rouvre plus", !cookieOf(await req(`/partage/${share.token}/ouvrir`)));

// 7. Déconnexion réelle et « tout déconnecter »
const s1 = (await login(ownerPassword)).cookie;
await req("/api/logout", s1, { method: "POST", headers: O });
check("après déconnexion : ancien cookie inutilisable", (await req("/api/data", s1)).status === 401);
const a = (await login(ownerPassword)).cookie;
const b = (await login(ownerPassword)).cookie;
const all = await req("/api/sessions", b, { method: "POST", headers: O });
const b2 = cookieOf(all) ?? b;
check("tout déconnecter : autre appareil coupé", (await req("/api/data", a)).status === 401);
check("tout déconnecter : cet appareil reste connecté", (await req("/api/data", b2)).status === 200);

// 8. Essais de mot de passe
let blocked = 0;
for (let i = 0; i < 10; i++) if ((await login("mauvais-" + i, "203.0.113.77")).status === 429) blocked++;
check("essais en rafale bloqués", blocked >= 1, `${blocked} bloqués`);
check("x-forwarded-for ne contourne pas le blocage", (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json", ...O, "x-real-ip": "203.0.113.77", "x-forwarded-for": "198.51.100.9" }, body: JSON.stringify({ password: "x" }) })).status === 429);

// 9. Secrets
const pages = await (await req("/connexion")).text();
const chunks = [...pages.matchAll(/\/_next\/static\/[^"]+\.js/g)].map((m) => m[0]);
let leak = false;
for (const c of chunks) { const t = await (await fetch(base + c)).text(); if ((t.includes(ownerPassword) || t.includes(gestionPassword) || /DATABASE_URL|sk-ant-|APP_PASSWORD=/.test(t))) leak = true; }
check("aucun secret dans le code envoyé au navigateur", !leak, `${chunks.length} fichiers`);

// 10. Données intactes
const final = (await (await req("/api/data", b2)).json()).data;
const strip = (x) => JSON.stringify({ ...x, settings: { ...x.settings } });
check("données intactes après les attaques", strip(final) === strip(JSON.parse(before)));
done("Sécurité");
