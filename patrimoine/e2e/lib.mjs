// Outils communs aux tests de parcours (application lancée par `next start`).
// Configuration par variables d'environnement, jamais de secret en dur :
//   E2E_BASE_URL         adresse de l'application (défaut http://localhost:3000)
//   E2E_OWNER_PASSWORD   mot de passe propriétaire (= APP_PASSWORD du serveur)
//   E2E_GESTION_PASSWORD mot de passe de l'accès gestion locative (créé par seed)
//   E2E_CHROMIUM         chemin d'un Chromium déjà installé (facultatif)

export const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const ownerPassword = process.env.E2E_OWNER_PASSWORD;
export const gestionPassword = process.env.E2E_GESTION_PASSWORD;
if (!ownerPassword || !gestionPassword) {
  console.error("E2E_OWNER_PASSWORD et E2E_GESTION_PASSWORD sont requis.");
  process.exit(2);
}
export const O = { origin: base };

let failures = 0;
export const check = (label, ok, extra = "") => {
  if (!ok) failures++;
  console.log(ok ? "OK " : "KO ", label, extra === "" ? "" : String(extra));
};
export const done = (name) => {
  console.log(failures ? `${name} : ${failures} échec(s)` : `${name} : tout est conforme`);
  process.exit(failures ? 1 : 0);
};

export const cookieOf = (res) => (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).find((c) => c.startsWith("patrimoine_session=") && c.length > 20);
export const login = async (password, ip) => {
  const r = await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json", ...O, ...(ip ? { "x-real-ip": ip } : {}) }, body: JSON.stringify({ password }) });
  return { status: r.status, cookie: cookieOf(r) };
};
export const req = (path, cookie, init = {}) => fetch(base + path, { redirect: "manual", ...init, headers: { ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) } });
export const json = (path, cookie, body, method = "POST") => req(path, cookie, { method, headers: { "content-type": "application/json", ...O }, body: JSON.stringify(body) });

export async function launch() {
  const { chromium } = await import("playwright");
  return chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
}

/** Connexion propriétaire dans le navigateur (même parcours qu'un utilisateur). */
export async function browserLogin(page) {
  await page.goto(base + "/connexion");
  await page.getByRole("button", { name: /Accès patrimoine/ }).click();
  await page.fill("input[type=password]", ownerPassword);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"));
}
