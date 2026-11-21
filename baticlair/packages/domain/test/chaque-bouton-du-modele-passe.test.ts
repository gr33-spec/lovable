/**
 * Retour du fondateur (2026-10-13, capture iPhone, chantier SCI Armor Immo) : « Cette réponse ne passe pas » sur
 * « Je façonne (bobine) », un bouton que l'écran venait de proposer. Le modèle écrit ses boutons à sa façon (singulier,
 * minuscules, valeurs en mots) ; le référentiel a ses valeurs (« 1 », « 2 », « 0.65 »). RÈGLE PERMANENTE, dans les
 * 22 tiroirs : un bouton du modèle qui nomme un choix prend la valeur de ce choix ; un bouton qui ne se rattache à rien
 * n'est jamais montré (la question prend les boutons du référentiel). Jamais un bouton que le serveur refusera.
 */
import { describe, expect, it } from "vitest";
import { lignesDeLecture, planDeLecture, questionDeLecture, REFERENTIALS, valeurDuReferentiel, type LectureDevis } from "../src/index.js";

const vide = (metier: string): LectureDevis => ({ metier, lots: [], fiche: { donnees: [] }, bref: [], questions: [], lignes: [], contexte: null, notes: [] });
const params = REFERENTIALS.flatMap((ref) => ref.workItems.flatMap((w) => w.params.filter((p) => (p.choices?.length ?? 0) > 1 && !p.named).map((p) => ({ ref, w, p }))));
// Le libellé tel que le modèle le réécrit : minuscules, pluriel ↔ singulier dans la parenthèse.
const singulier = (t: string) => t.replace(/\(([^)]*)\)/g, (_, x: string) => `(${x.split(" ").map((w) => w.replace(/(?<=..)s$/, "")).join(" ")})`);

describe("chaque bouton du modèle se ramène à une valeur du référentiel (22 tiroirs)", () => {
  it(`${params.length} données à choix : libellé exact, en minuscules, au singulier`, () => {
    const fautes: string[] = [];
    for (const { ref, w, p } of params) {
      for (const c of p.choices!) {
        for (const label of [c.label, c.label.toLowerCase(), singulier(c.label)]) {
          const v = valeurDuReferentiel(p, { label, valeur: label.toLowerCase().replace(/\s+/g, "_") });
          if (v !== c.value) fautes.push(`${ref.trade}/${w.id}/${p.key} : « ${label} » → ${v} (attendu ${c.value})`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("le façonnage du joint debout, tel que le modèle l'a écrit en production", () => {
    const p = params.find((x) => x.w.id === "couverture-zinc-joint-debout" && x.p.key === "faconnage")!.p;
    expect(valeurDuReferentiel(p, { label: "Je façonne (bobine)", valeur: "bobine" })).toBe("1");
    expect(valeurDuReferentiel(p, { label: "Je façonne", valeur: "je_faconne" })).toBe("1");
    expect(valeurDuReferentiel(p, { label: "Commandé façonné", valeur: "commande" })).toBe("2");
    expect(valeurDuReferentiel(p, { label: "0,65 mm", valeur: "0,65" })).toBe("0,65");
  });

  it("sur une donnée chiffrée, aucun bouton montré n'est en mots (le serveur n'accepte qu'un nombre)", () => {
    const fautes: string[] = [];
    for (const { ref, p } of params) {
      const lecture = vide(ref.trade);
      const plan = planDeLecture(ref, lecture, lignesDeLecture(lecture));
      const q = questionDeLecture(ref, plan, { cle: p.key, texte: p.question ?? p.label, boutons: [{ label: "Truc inconnu", valeur: "zzz" }, { label: p.choices![0]!.label, valeur: "x" }], unite: null, donnee: p.label, ligne: null });
      if (q.named) continue;
      const enMots = (q.options ?? []).filter((o) => !/^\d+(?:[.,]\d+)?$/.test(o.value));
      if (enMots.length > 0) fautes.push(`${ref.trade}/${p.key} : ${enMots.map((o) => o.value).join(", ")}`);
    }
    expect(fautes).toEqual([]);
  });
});
