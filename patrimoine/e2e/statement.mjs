// Relevé bancaire : un fichier CSV est lu dans le navigateur, les virements
// des locataires sont reconnus puis pointés après validation.
import { base, browserLogin, check, done, launch } from "./lib.mjs";

const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await browserLogin(page);
const d = (await (await page.request.get(base + "/api/data")).json()).data;
const lease = d.tenancies.find((t) => t.status === "actif" && t.rent && t.tenants?.[0]?.lastName);
if (!lease) {
  check("données de test : un bail en cours avec un locataire nommé", false);
  done("Relevé bancaire");
}
const month = new Date().toISOString().slice(0, 7);
const amount = (lease.rent + (lease.charges ?? 0)).toFixed(2).replace(".", ",");
const name = lease.tenants[0].lastName.toUpperCase();
const csv = `Date;Libellé;Montant\n05/${month.slice(5)}/${month.slice(0, 4)};VIR SEPA ${name} LOYER;${amount}\n06/${month.slice(5)}/${month.slice(0, 4)};CB BOULANGERIE;-4,20\n`;
await page.goto(base + "/gestion/releve");
await page.locator("input[type=file]").setInputFiles({ name: "releve.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "latin1") });
await page.waitForTimeout(600);
check("virement du locataire reconnu", await page.getByText(/Reconnu : nom du locataire et montant/).isVisible().catch(() => false));
check("autre opération laissée de côté", await page.getByText(/non rapprochées \(1\)/).isVisible().catch(() => false));
await page.getByRole("button", { name: /Pointer 1 loyer/ }).click();
await page.waitForTimeout(1500);
const after = (await (await page.request.get(base + "/api/data")).json()).data;
const p = after.units.find((u) => u.id === lease.unitId)?.payments?.[month];
check("loyer pointé payé avec la date du virement", p?.status === "paye" && p?.paidDate === `${month}-05`, JSON.stringify(p));
check("aucune erreur", errors.length === 0, errors.join(" | "));
await browser.close();
done("Relevé bancaire");
