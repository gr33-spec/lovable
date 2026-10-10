import { describe, expect, it } from "vitest";
import { decodeRelecture, relectureDossier, relectureSystem, RULE_51_2, type RelectureInput } from "../src/modules/takeoff/application/fiche-relecture.js";
import { readFileSync } from "node:fs";

/**
 * §51.2 : « Une réponse « Autre » n'est jamais rangée dans une case sans être relue. » La relecture est faite par l'IA ;
 * le code relit ce qu'elle rend : une clé de question inconnue, une valeur hors des boutons ne passent jamais.
 */
const input: RelectureInput = {
  tradeLabel: "Couverture",
  fiche: { donnees: [{ cle: "rampant", libelle: "Rampant", valeur: "7 m", origine: "devis", preuve: "ligne 1" }] },
  question: { key: "param:faconnage@couverture-zinc-joint-debout", text: "Couverture zinc à joint debout : tu façonnes toi-même ou tu commandes façonné ?", options: [{ label: "Je façonne", value: "1" }, { label: "Je commande façonné", value: "2" }], unit: "u" },
  texte: "les bacs façonnés, la bande je la plie",
  ouvertes: [{ key: "param:pente", text: "Pente du toit ?", options: [{ label: "30°", value: "30" }, { label: "45°", value: "45" }], unit: "°" }],
};

describe("§51.2 : la relecture d'une réponse « Autre »", () => {
  it("le texte du §51.2 est branché mot pour mot, avec la règle numéro un ; le dossier dit la fiche, la question, ses boutons et la réponse", () => {
    const doc = readFileSync(new URL("../../../docs/referentiel-couverture.md", import.meta.url), "utf8");
    const s512 = doc.slice(doc.indexOf("## 51.2"), doc.indexOf("## 51.3")).split("\n").slice(1).map((l) => l.trim()).filter(Boolean).join("\n");
    expect(RULE_51_2.split("\n").slice(1).join("\n")).toBe(s512);
    expect(relectureSystem(input)).toContain(RULE_51_2);
    expect(relectureSystem(input)).toContain("RÈGLE NUMÉRO UN");
    const dossier = relectureDossier(input);
    expect(dossier).toContain("- Rampant : 7 m (devis)");
    expect(dossier).toContain("2 = Je commande façonné");
    expect(dossier).toContain("« les bacs façonnés, la bande je la plie »");
  });

  it("le code ne garde que les clés et les valeurs connues ; la donnée écrite entre dans la fiche, origine « ta réponse »", () => {
    const r = decodeRelecture(
      {
        fiche: [{ donnee: "façonnage", valeur: "bacs commandés façonnés, bandes pliées" }, { donnee: "", valeur: "x" }],
        reponses: [
          { question: "param:faconnage@couverture-zinc-joint-debout", valeur: "2" },
          { question: "param:faconnage@couverture-zinc-joint-debout", valeur: "3" },
          { question: "param:inconnue", valeur: "1" },
          { question: "param:pente", valeur: "38" },
        ],
        manque: { donnee: "", question: "" },
      },
      input,
    );
    expect(r.reponses).toEqual([
      { question: "param:faconnage@couverture-zinc-joint-debout", valeur: "2", unite: "u" },
      { question: "param:pente", valeur: "38", unite: "°" },
    ]);
    expect(r.donnees).toEqual([expect.objectContaining({ libelle: "Façonnage", valeur: "bacs commandés façonnés, bandes pliées", origine: "reponse" })]);
    expect(r.manque).toBeNull();
  });
});
