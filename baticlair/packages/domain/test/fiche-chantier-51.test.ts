import { describe, expect, it } from "vitest";
import {
  appliquerRelecture,
  applyRuleConfirmations,
  ficheChantier,
  ficheFacts,
  planQuote,
  ROOFING_REFERENTIAL,
  tradeProfile,
  type FicheChantier,
  type Question,
} from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { D2026_020_LINES } from "./devis-reels/d2026-020.js";
import { D2026_105_LINES, D2026_105_READINGS } from "./devis-reels/d2026-105.js";
import { FICHE_D2026_018, FICHE_D2026_020, FICHE_D2026_105 } from "./devis-reels/fiches.js";
import { readQuote, type QuoteLineInput } from "./support/read-quote.js";

/**
 * §51 (fondateur, 2026-10-10) : « Le moteur voit le chantier avant de compter ». Test permanent sur les trois devis
 * réels (D-2026-020, D-2026-018, D.2026.105), avec la fiche que rend l'IA (temps un) :
 *  - §51.4 : « Sur D-2026-018 : la fiche contient joint debout, 91 m², rampant 7 m, largeur 13 m, Quartz-Zinc 0,65,
 *    2 descentes, chaque donnée avec son origine. Aucune question sur une donnée présente dans la fiche. Les bacs, pattes
 *    et bandes sortent des mêmes dimensions. Une réponse « Autre » sur le façonnage modifie la fiche et la liste. »
 *  - §51.2 : chaque donnée manquante donne une seule question ; jamais une question sur une donnée lue ou déduite.
 *  - §51.3 : le calcul reste ligne par ligne (règle numéro un intacte) et puise dans la fiche.
 */
type A = Record<string, { value: string; unit: string } | string | null>;
const ref = ROOFING_REFERENTIAL;
const u = (value: string) => ({ value, unit: "u" });

function chantier(lines: QuoteLineInput[], fiche: FicheChantier, answers: A = {}, readings?: typeof D2026_105_READINGS) {
  const facts = ficheFacts(ref, fiche);
  const view = applyRuleConfirmations(readQuote(lines, answers as never, facts, undefined, undefined, readings), answers as never);
  const plan = planQuote(lines.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit })), ref, tradeProfile("roofing"), undefined, facts);
  const questions = view.questions.flatMap((d) => (d.question ? [d.question as Question] : []));
  const shown = ficheChantier({ ref, ai: fiche, plan, answers: answers as never, questions });
  return { view, questions, shown, facts };
}
const valeur = (f: FicheChantier, re: RegExp) => f.donnees.find((d) => re.test(d.libelle));
const paramKey = (k: string) => /^(?:engine:)?param:([a-z0-9_]+)/.exec(k)?.[1];

describe("§51.4 : D-2026-018, la fiche avant le calcul", () => {
  it("la fiche contient joint debout, 91 m², rampant 7 m, largeur 13 m, Quartz-Zinc 0,65, 2 descentes, chacune avec son origine", () => {
    const { shown } = chantier(D2026_018_LINES, FICHE_D2026_018);
    expect(valeur(shown, /^Ouvrage/)?.valeur).toMatch(/joint debout/);
    expect(valeur(shown, /^Surface/)?.valeur).toBe("91 m²");
    expect(valeur(shown, /^Rampant/)?.valeur).toBe("7 m");
    expect(valeur(shown, /^Largeur/)?.valeur).toBe("13 m");
    expect(valeur(shown, /^Matériau/)?.valeur).toMatch(/Quartz-Zinc 0,65/);
    expect(valeur(shown, /descentes/)).toMatchObject({ valeur: "2", origine: "deduite" });
    for (const d of shown.donnees) {
      expect(["devis", "deduite", "reponse", "manquante"], d.libelle).toContain(d.origine);
      if (d.origine === "devis") expect(d.preuve, d.libelle).toBeTruthy();
      if (d.origine === "deduite") expect(d.regle, d.libelle).toBeTruthy();
      if (d.origine === "manquante") expect(d.valeur, d.libelle).toBeNull();
    }
  });

  it("aucune question sur une donnée présente dans la fiche (les descentes déduites ne se demandent plus)", () => {
    const { questions } = chantier(D2026_018_LINES, FICHE_D2026_018);
    const keys = questions.map((q) => paramKey(q.key));
    for (const k of ["nb_descentes", "pente", "longueur_rampant", "surface", "epaisseur_zinc", "aspect_zinc"]) expect(keys, k).not.toContain(k);
  });

  it("les bacs, les pattes et les bandes sortent des mêmes dimensions ; changer le rampant dans la fiche les change ensemble", () => {
    const commande: A = { "param:faconnage@couverture-zinc-joint-debout": u("2"), "param:developpe@bandes-zinc__3": { value: "20", unit: "cm" } };
    const at7 = chantier(D2026_018_LINES, FICHE_D2026_018, commande).view;
    const line = (v: typeof at7, re: RegExp) => v.toBuy.find((b) => re.test(b.label));
    // 13 m de large (91 ÷ 7) en bobine 500 : 31 bacs ; 7 m + 15 cm ; pattes VMZINC sur 91 m² et 7 m de rampant.
    expect(line(at7, /^Bacs joint debout/)).toMatchObject({ label: expect.stringMatching(/longueur 7,15 m$/), quantity: "31 bacs" });
    expect(line(at7, /^Pattes coulissantes/)?.quantity).toBe("519 pièces");
    // L'artisan corrige le rampant dans la fiche (6,5 m) : largeur 14 m, bacs plus courts et plus nombreux, pattes du rampant 5,5-7,5.
    const corrigee = appliquerRelecture(FICHE_D2026_018, { donnees: [{ cle: "rampant", libelle: "Rampant", valeur: "6,5 m", origine: "reponse" }], reponses: [] });
    const at65 = chantier(D2026_018_LINES, corrigee, commande).view;
    expect(line(at65, /^Bacs joint debout/)).toMatchObject({ label: expect.stringMatching(/longueur 6,65 m$/), quantity: "33 bacs" });
    expect(line(at65, /^Pattes coulissantes/)?.quantity).toBe(line(at7, /^Pattes coulissantes/)?.quantity);
  });

  it("une réponse « Autre » sur le façonnage, relue, modifie la fiche et la liste", () => {
    const avant = chantier(D2026_018_LINES, FICHE_D2026_018, { "param:faconnage@couverture-zinc-joint-debout": u("1") });
    expect(avant.view.toBuy.some((b) => /^Bacs joint debout/.test(b.label))).toBe(false);
    // L'artisan écrit sous « Autre » : « je commande les bacs façonnés, je plie les bandes moi-même ». L'IA relit (§51.2).
    const relue = appliquerRelecture(FICHE_D2026_018, {
      donnees: [{ cle: "faconnage", libelle: "Façonnage", valeur: "bacs commandés façonnés, bandes pliées sur place", origine: "reponse" }],
      reponses: [
        { question: "param:faconnage@couverture-zinc-joint-debout", valeur: "2" },
        { question: "param:faconnage@bandes-zinc__3", valeur: "1" },
      ],
      manque: null,
    });
    const answers: A = Object.fromEntries([
      ["param:faconnage@couverture-zinc-joint-debout", u("2")],
      ["param:faconnage@bandes-zinc__3", u("1")],
    ]);
    const apres = chantier(D2026_018_LINES, relue, answers);
    expect(valeur(apres.shown, /^Façonnage$/)).toMatchObject({ valeur: "bacs commandés façonnés, bandes pliées sur place", origine: "reponse" });
    expect(apres.view.toBuy.find((b) => /^Bacs joint debout/.test(b.label))?.quantity).toBe("31 bacs");
    expect(apres.shown.donnees.filter((d) => d.origine === "manquante").map((d) => d.libelle)).not.toContain("Façonnage");
  });
});

describe("§51.2 : les questions viennent des trous de la fiche, sur les trois devis", () => {
  const cases = [
    ["D-2026-018", D2026_018_LINES, FICHE_D2026_018, undefined],
    ["D-2026-020", D2026_020_LINES, FICHE_D2026_020, undefined],
    ["D.2026.105", D2026_105_LINES, FICHE_D2026_105, D2026_105_READINGS],
  ] as const;
  for (const [name, lines, fiche, readings] of cases) {
    it(`${name} : une question par donnée manquante, jamais sur une donnée de la fiche ; règle numéro un intacte`, () => {
      const { questions, shown, view } = chantier([...lines], fiche, {}, readings);
      // Une seule question par donnée.
      const keys = questions.map((q) => q.key);
      expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
      // Jamais une question sur une donnée lue ou déduite de la fiche.
      const known = new Set(ficheFacts(ref, fiche).map((f) => f.key));
      expect(questions.map((q) => paramKey(q.key)).filter((k) => k && known.has(k))).toEqual([]);
      // Chaque question ouverte du calcul est un trou de la fiche, nommé une fois.
      const holes = shown.donnees.filter((d) => d.origine === "manquante");
      expect(holes.map((d) => d.cle).filter((k, i, all) => all.indexOf(k) !== i)).toEqual([]);
      // La question consommables (oui / non) n'est pas une donnée du chantier.
      for (const q of questions.filter((x) => x.key.startsWith("param:") && x.key !== "param:consommables")) expect(holes.some((h) => h.question === q.text), q.key).toBe(true);
      // Règle numéro un : la fiche n'ajoute aucune ligne ; chaque fourniture vient d'une ligne du devis.
      const without = readQuote([...lines], {}, [], undefined, undefined, readings);
      expect(view.toBuy.length + view.toQuote.length).toBe(without.toBuy.length + without.toQuote.length);
    });
  }
});
