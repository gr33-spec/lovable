import type { Referential } from "../referential/model.js";
import { pointsPourLecture } from "./electricite.js";

/**
 * §51.5 : L'EXPORT DU RÉFÉRENTIEL DONNÉ AU MODÈLE avec le devis. Tout ce dont la lecture a besoin pour nommer les
 * fournitures et les rattacher au calcul : chaque ouvrage, ses données (clés, unités, questions, choix), ses
 * emplacements et ce que le code en calcule (formules, unités). Les ratios eux-mêmes restent au code : le modèle n'a pas
 * à compter, seulement à dire ce que le devis écrit et ce qui manque. Compact (texte), le JSON complet du tiroir faisant
 * un demi-mégaoctet.
 */
export function exportPourLecture(ref: Referential): string {
  const out: string[] = [`RÉFÉRENTIEL ${ref.id} (version ${ref.version}), métier ${ref.trade}.`, ""];
  for (const w of ref.workItems) {
    out.push(`OUVRAGE ${w.id} : ${w.label}${w.section ? ` [${w.section}]` : ""}${w.perLine ? " (une instance par ligne du devis)" : ""}`);
    if (w.params.length > 0) {
      out.push("  données :");
      for (const p of w.params) {
        const choices = (p.choices ?? []).map((c) => `${c.value} = ${c.label}`).join(" ; ");
        const written = (p.textValues ?? []).slice(0, 6).map((v) => `${v.value} ← « ${v.keywords[0] ?? v.value} »`).join(" ; ");
        const bits = [
          `unité ${p.unit}`,
          p.fromLineQuantity ? "se lit dans la quantité de la ligne" : null,
          p.default && typeof p.default.value === "string" ? `défaut ${p.default.value}` : null,
          choices ? `choix : ${choices}` : null,
          written ? `valeurs écrites : ${written}` : null,
          p.question ? `question : « ${p.question} »` : null,
        ].filter(Boolean);
        out.push(`    - ${p.key} (${p.label}) : ${bits.join(" ; ")}`);
      }
    }
    out.push("  emplacements :");
    for (const s of w.slots) {
      const bits = [
        s.measureOnly ? (s.orderedAsWritten ? "l'article tel qu'écrit, qui compte aussi l'ouvrage" : "mesure de l'ouvrage, jamais commandé tel quel") : null,
        s.formOf ? `forme d'achat de « ${s.formOf} »` : null,
        s.indissociable ? "ajouté d'office (indissociable)" : null,
        s.citedBy?.length ? `cité par : ${s.citedBy.join(", ")}` : null,
        s.usual ? `d'usage : ${s.usual.text}` : null,
      ].filter(Boolean);
      out.push(`    - ${s.key} (${s.label}, famille ${s.family})${bits.length ? ` : ${bits.join(" ; ")}` : ""}`);
    }
    if (w.needs.length > 0) {
      out.push("  ce que le code calcule :");
      for (const n of w.needs) out.push(`    - ${n.id} → emplacement ${n.slot} : ${n.formula} (${n.unit})${n.when ? `, si ${n.when}` : ""}${n.designation ? `, désignation « ${n.designation} »` : ""}`);
    }
    out.push("");
  }
  // Temps trois, électricité : le modèle nomme le point de chaque ligne ; le code en tire les fournitures (§3).
  if (ref.trade === "electrical") out.push(pointsPourLecture(), "");
  out.push("FAMILLES DE PRODUITS : " + ref.families.map((f) => `${f.code} (${f.label})`).join(" ; "));
  return out.join("\n");
}
