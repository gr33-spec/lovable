import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, briefResume, briefTexte, linesWithoutSupply, planQuote, ROOFING_REFERENTIAL, siteBrief, tradeProfile, validateTakeoff } from "../src/index.js";
import { DE00000071_LINES } from "./devis-reels/de00000071.js";
import { readQuote } from "./support/read-quote.js";

/**
 * §51.5 (décision du fondateur, 2026-10-11) : LA LECTURE EST FAITE PAR L'IA, PAS PAR DES RÈGLES DE MOTS. Test permanent
 * DE00000071 (devis réel, bac acier + 5 Velux), résultat attendu validé par le fondateur, écrit mot pour mot au §51.5 :
 *  - Bref : toiture existante en bac acier isolé ; pas de couverture neuve ; gouttière demi-ronde zinc naturel 17,40 m
 *    sur crochets Négrafix ; chéneau 11,70 m refait en membrane ; 4 Velux SK06 114×118 GGL white finish et 1 MK04 78×98
 *    GGU ever finish avec raccords pour bac acier ; tôles bac acier en étanchéité au-dessus des Velux.
 *  - Questions, exactement celles-ci : développé de gouttière 25 ou 33 ; nombre de descentes ; chéneau EPDM ou PVC et
 *    largeur développée ; raccord Velux ZWC (ligne fourniture) ou Pratikal (ligne pose), contradiction du devis ; tôles
 *    bac acier : 10 tôles ou 10 m², et longueur. Aucune question sur les Velux.
 *  - Liste : gouttière 5 longueurs de 4 m (orange, développé) ; crochets Négrafix 35 (vert) ; naissances (orange,
 *    nombre) ; membrane chéneau (orange) ; Velux GGL SK06 114×118 white finish 4 (vert) ; Velux GGU MK04 78×98 ever
 *    finish 1 (vert) ; raccords SK06 4 et MK04 1 (orange, ZWC ou Pratikal) ; tôles bac acier 10 (orange, unité, profil
 *    et teinte à préciser) ; 5 lignes sans fourniture.
 *  - Interdit : toute question sur une donnée écrite au devis ; tout identifiant interne à l'écran.
 *
 * ÉCHOUE AUJOURD'HUI (PR 1) : la lecture par règles de mots ne rend ni ce bref, ni ces questions, ni cette liste. La PR 2
 * (lecture entière par le modèle) le fait passer ; en attendant, chaque cas est marqué `it.fails` pour que la CI reste
 * verte sans cacher l'écart. Le jour où un cas passe, `it.fails` casse : il faut alors le remettre en `it`.
 */
const ref = ROOFING_REFERENTIAL;

/** Les trois écrans, tels que les voit l'artisan : le bref (§50.7), les questions (§51.2) et la liste (§49). */
function ecran(answers: Record<string, unknown> = {}) {
  const lines = DE00000071_LINES;
  const view = applyRuleConfirmations(readQuote(lines, answers as never), answers as never);
  const plan = planQuote(lines, ref, tradeProfile("roofing"));
  const brief = siteBrief({ ref, plan, answers: answers as never, lines: lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit })), ville: null });
  const bref = briefTexte(briefResume(brief, null, answers, null));
  const questions = view.questions.map((d) => ({ key: d.question?.key ?? d.key, text: d.question?.text ?? d.text, options: (d.question?.options ?? []).map((o) => o.label) }));
  const liste = view.screen.groups.flatMap((g) =>
    g.rows.map((r) => {
      const item = r.itemKey ? view.toBuy.find((b) => b.key === r.itemKey) : undefined;
      const quote = r.quoteKey ? view.toQuote.find((q) => q.key === r.quoteKey) : undefined;
      return { label: item?.label ?? quote?.label ?? r.pending?.label ?? "", quantity: item?.quantity ?? quote?.measure ?? r.pending?.quantity ?? null, couleur: r.status === "ok" ? "vert" : "orange", raison: r.reason ?? "" };
    }),
  );
  const profile = tradeProfile("roofing");
  const validation = validateTakeoff(lines.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  const sansFourniture = linesWithoutSupply(lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit })), validation).length;
  return { bref, questions, liste, sansFourniture };
}
const texte = (q: { text: string }) => q.text.toLowerCase();

describe("§51.5 : DE00000071, le résultat attendu par le fondateur", () => {
  it.fails("le bref : toiture existante en bac acier, gouttière 17,40 m, chéneau 11,70 m, 4 + 1 Velux, tôles en étanchéité", () => {
    const { bref } = ecran();
    for (const attendu of [/bac acier isolé/i, /pas de couverture neuve/i, /gouttière demi-ronde zinc naturel 17,40 m/i, /crochets Négrafix/i, /chéneau 11,70 m/i, /membrane/i, /4 Velux SK06 114 ?× ?118 GGL white finish/i, /1 MK04 78 ?× ?98 GGU ever finish/i, /raccords pour bac acier/i, /tôles bac acier en étanchéité au-dessus des Velux/i]) {
      expect(bref, bref).toMatch(attendu);
    }
  });

  it.fails("les questions, exactement cinq : développé 25 ou 33, descentes, chéneau, raccord ZWC ou Pratikal, tôles 10 ou 10 m²", () => {
    const { questions } = ecran();
    expect(questions).toHaveLength(5);
    const [developpe, descentes, cheneau, raccord, toles] = [/développé/, /descentes/, /chéneau/, /raccord/, /tôles/].map((re) => questions.find((q) => re.test(texte(q)))!);
    expect(developpe?.options).toEqual(["De 25", "De 33"]);
    expect(descentes).toBeDefined();
    expect(texte(cheneau!)).toMatch(/epdm ou pvc/);
    expect(texte(cheneau!)).toMatch(/largeur développée/);
    expect(raccord?.options).toEqual(["ZWC", "Pratikal"]);
    expect(texte(raccord!)).toMatch(/zwc .*fourniture.*pratikal .*pose|fourniture.*zwc.*pose.*pratikal/);
    expect(texte(toles!)).toMatch(/10 tôles ou 10 m²/);
    expect(texte(toles!)).toMatch(/longueur/);
    // Interdit : une question sur une donnée écrite (les Velux, leur taille, leur nombre) ; un identifiant interne.
    expect(questions.filter((q) => /velux|fenêtre/i.test(q.text))).toEqual([]);
    for (const q of questions) expect(q.text).not.toMatch(/[a-f0-9]{8}-|__|param:|fenetre-de-toit|couverture-bac/);
  });

  it.fails("la liste, dans l'ordre du devis : gouttière, crochets, naissances, membrane, Velux ×2, raccords ×2, tôles ; 5 lignes sans fourniture", () => {
    const { liste, sansFourniture } = ecran();
    const vu = liste.map((l) => [l.label, l.quantity, l.couleur] as const);
    expect(vu).toHaveLength(9);
    expect(vu[0]).toEqual([expect.stringMatching(/^Gouttière demi-ronde zinc naturel/), "5 longueurs de 4 m", "orange"]);
    expect(liste[0]!.raison).toMatch(/développé/i);
    expect(vu[1]).toEqual([expect.stringMatching(/^Crochets .*Négrafix/i), "35 pièces", "vert"]);
    expect(vu[2]).toEqual([expect.stringMatching(/^Naissances/), null, "orange"]);
    expect(liste[2]!.raison).toMatch(/descentes|nombre/i);
    expect(vu[3]).toEqual([expect.stringMatching(/^Membrane .*chéneau|^Chéneau .*membrane/i), expect.anything(), "orange"]);
    expect(vu[4]).toEqual([expect.stringMatching(/^Velux GGL SK06 114 ?× ?118 white finish/i), "4 pièces", "vert"]);
    expect(vu[5]).toEqual([expect.stringMatching(/^Velux GGU MK04 78 ?× ?98 ever finish/i), "1 pièce", "vert"]);
    expect(vu[6]).toEqual([expect.stringMatching(/^Raccords? .*SK06/i), "4 pièces", "orange"]);
    expect(liste[6]!.raison).toMatch(/ZWC ou Pratikal/i);
    expect(vu[7]).toEqual([expect.stringMatching(/^Raccords? .*MK04/i), "1 pièce", "orange"]);
    expect(vu[8]).toEqual([expect.stringMatching(/^Tôles bac acier/i), "10", "orange"]);
    expect(liste[8]!.raison).toMatch(/unité|profil|teinte/i);
    expect(sansFourniture).toBe(5);
    // Interdit : un identifiant interne à l'écran.
    for (const l of liste) expect(`${l.label} ${l.raison}`).not.toMatch(/[a-f0-9]{8}-|__|param:/);
  });
});
