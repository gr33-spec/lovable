#!/usr/bin/env node
/**
 * L'état des lieux du catalogue, écrit dans docs/catalogue/etat-des-lieux.md (Greg, 13 novembre 2026, « cœur métier »).
 *   pnpm -s build && node scripts/etat-des-lieux-catalogue.mjs [articles-de-la-base.json]
 * Sans fichier : l'amorce du dépôt. Avec : les articles d'une base (un tableau JSON `cle, metier, famille, produit,
 * variante, designation, unite`), comparés à l'amorce. Lecture seule : rien n'est écrit ailleurs que dans le rapport.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const d = createRequire(import.meta.url)("../dist/index.js");
const ici = dirname(fileURLToPath(import.meta.url));
const amorce = d.TOUT_LE_CATALOGUE;
const clesAmorce = new Set(amorce.map((a) => a.cle));
const base = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : null;
const NATURES = { ancien_identifiant: "Anciens identifiants (même clé à l'écriture près)", exact: "Doublons exacts (même désignation, même unité, même métier)", partage_entre_metiers: "Même article sous deux métiers", unites_differentes: "Même désignation, unités différentes", probable: "Doublons probables (mêmes mots, autre ordre)" };

function section(titre, articles) {
  const e = d.etatDesLieuxDuCatalogue(articles, clesAmorce);
  const L = [`## ${titre}`, "", `${e.total} articles. ${e.rattachementsMultiples} articles se lisent dans plus d'un métier (une seule fiche, plusieurs rattachements). ${e.nonClasses.length} article(s) sans famille (« Autres produits »).`, ""];
  L.push("### Articles par métier et par famille", "", "| Métier | Articles du métier | Famille | Sous-familles | Produits | Articles lus dans la famille |", "| --- | ---: | --- | ---: | ---: | ---: |");
  for (const m of e.parMetier) m.familles.forEach((f, i) => L.push(`| ${i === 0 ? m.libelle : ""} | ${i === 0 ? m.articles : ""} | ${f.famille} | ${f.sousFamilles.length > 1 ? f.sousFamilles.length : "—"} | ${f.produits} | ${f.articles} |`));
  L.push("", "« Articles du métier » : ceux dont c'est le métier principal. « Articles lus dans la famille » compte aussi ceux qu'un autre métier partage.", "");
  L.push("### Doublons", "");
  for (const [nature, libelle] of Object.entries(NATURES)) {
    const g = e.doublons.filter((x) => x.nature === nature);
    L.push(`- **${libelle}** : ${g.length}`);
    for (const x of g.slice(0, nature === "ancien_identifiant" ? 5 : 20)) L.push(`  - ${x.designation} : ${x.cles.map((c) => `\`${c}\`${c === x.canonique ? " (gardée)" : ""}`).join(", ")}`);
    if (nature === "ancien_identifiant" && g.length > 5) L.push(`  - … et ${g.length - 5} autres, tous de la forme « -x- » → « x ».`);
  }
  L.push("", "### Familles trop volumineuses (plus de " + d.SEUIL_FAMILLE_VOLUMINEUSE + " produits d'un coup)", "", ...(e.famillesVolumineuses.length ? e.famillesVolumineuses.map((f) => `- ${f.metier} › ${f.famille} › ${f.sousFamille} : ${f.produits} produits`) : ["Aucune."]));
  L.push("", "### Désignations ambiguës (un même produit dans deux familles d'origine du même métier)", "", ...(e.designationsAmbigues.length ? e.designationsAmbigues.map((p) => `- ${p.metier} : « ${p.produit} » dans ${p.familles.join(" et ")}`) : ["Aucune."]));
  L.push("", "### Unités incohérentes (un même produit vendu sous plusieurs unités)", "", ...(e.unitesIncoherentes.length ? e.unitesIncoherentes.map((p) => `- ${p.metier} : « ${p.produit} » en ${p.unites.join(", ")}`) : ["Aucune."]));
  L.push("", "### Articles sans famille", "", ...(e.nonClasses.length ? e.nonClasses.map((a) => `- \`${a.cle}\` (${a.designation})`) : ["Aucun."]), "");
  return L;
}

const lignes = ["# État des lieux du catalogue Mobiiz", "", "Fichier produit par `packages/domain/scripts/etat-des-lieux-catalogue.mjs` (lecture seule). Ne pas le modifier à la main.", "", ...section("L'amorce du dépôt (`packages/domain/src/catalogue/donnees`)", amorce)];
if (base) {
  const hors = base.filter((a) => !clesAmorce.has(a.cle));
  const absents = amorce.filter((a) => !base.some((b) => b.cle === a.cle));
  lignes.push(...section("La base fournie", base), `### Écart avec l'amorce`, "", `- ${hors.length} article(s) de la base absents de l'amorce (anciens identifiants ou ajouts de l'admin) : jamais supprimés.`, `- ${absents.length} article(s) de l'amorce absents de la base : la synchronisation explicite les ajouterait.`, "");
}
writeFileSync(join(ici, "../../../docs/catalogue/etat-des-lieux.md"), lignes.join("\n"));
console.log(`docs/catalogue/etat-des-lieux.md : ${lignes.length} lignes`);
