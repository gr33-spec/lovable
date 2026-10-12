import { describe, expect, it } from "vitest";
import { briefTexte, DE00000071_LECTURE, ecranDeLecture, ROOFING_REFERENTIAL } from "../src/index.js";
import { DE00000071_LINES } from "./devis-reels/de00000071.js";

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
 * La lecture du devis est celle du modèle (`src/lecture/exemples/de00000071.ts`, relue par le fondateur) ; le code calcule
 * et affiche. La fixture `de00000071.ts` garde les lignes brutes du devis : la lecture doit les reprendre toutes.
 */
const ref = ROOFING_REFERENTIAL;

/** Les trois écrans, tels que les voit l'artisan : le bref (§50.8), les questions (§51.2) et la liste (§49), depuis la lecture. */
function ecran(answers: Record<string, unknown> = {}) {
  const e = ecranDeLecture({ ref, lecture: DE00000071_LECTURE, answers: answers as never });
  const bref = briefTexte(DE00000071_LECTURE.bref.map((texte, i) => ({ cle: `fiche-bref-${i + 1}`, texte })));
  // L'écran des questions montre les questions du modèle ; un « C'est bon » de ligne (à préciser) se règle sur la liste.
  const questions = e.purchase.questions.filter((d) => d.question).map((d) => ({ key: d.question!.key, text: d.question!.text, options: (d.question!.options ?? []).map((o) => o.label) }));
  const liste = e.purchase.screen.groups.flatMap((g) =>
    g.rows.map((r) => {
      const item = r.itemKey ? e.purchase.toBuy.find((b) => b.key === r.itemKey) : undefined;
      const quote = r.quoteKey ? e.purchase.toQuote.find((q) => q.key === r.quoteKey) : undefined;
      return { label: item?.label ?? quote?.label ?? r.pending?.label ?? "", quantity: item?.quantity ?? quote?.measure ?? r.pending?.quantity ?? null, couleur: r.status === "ok" ? "vert" : "orange", raison: r.reason ?? "" };
    }),
  );
  return { bref, questions, liste, sansFourniture: e.sansFourniture.length, e };
}
const texte = (q: { text: string }) => q.text.toLowerCase();

describe("§51.5 : DE00000071, le résultat attendu par le fondateur", () => {
  it("le bref : toiture existante en bac acier, gouttière 17,40 m, chéneau 11,70 m, 4 + 1 Velux, tôles en étanchéité", () => {
    const { bref } = ecran();
    for (const attendu of [/bac acier isolé/i, /pas de couverture neuve/i, /gouttière demi-ronde zinc naturel 17,40 m/i, /crochets Négrafix/i, /chéneau 11,70 m/i, /membrane/i, /4 Velux SK06 114 ?× ?118 GGL white finish/i, /1 MK04 78 ?× ?98 GGU ever finish/i, /raccords pour bac acier/i, /tôles bac acier en étanchéité au-dessus des Velux/i]) {
      expect(bref, bref).toMatch(attendu);
    }
  });

  it("les questions, exactement cinq : développé 25 ou 33, descentes, chéneau, raccord ZWC ou Pratikal, tôles 10 ou 10 m²", () => {
    const { questions } = ecran();
    expect(questions).toHaveLength(5);
    const [developpe, descentes, cheneau, raccord, toles] = [/développé de la gouttière/, /descentes/, /chéneau/, /raccord/, /tôles/].map((re) => questions.find((q) => re.test(texte(q)))!);
    expect(developpe?.options).toEqual(["De 25", "De 33"]);
    expect(descentes).toBeDefined();
    expect(texte(cheneau!)).toMatch(/epdm ou pvc/);
    expect(texte(cheneau!)).toMatch(/largeur développée/);
    expect(raccord?.options).toEqual(["ZWC", "Pratikal"]);
    expect(texte(raccord!)).toMatch(/zwc .*fourniture.*pratikal .*pose|fourniture.*zwc.*pose.*pratikal/);
    expect(texte(toles!)).toMatch(/10 tôles ou 10 m²/);
    expect(texte(toles!)).toMatch(/longueur/);
    // Interdit : une question sur une donnée écrite (les Velux, leur taille, leur nombre : seul leur raccord se demande) ;
    // un identifiant interne.
    expect(questions.filter((q) => /velux|fenêtre/i.test(q.text) && !/raccord/i.test(q.text))).toEqual([]);
    for (const q of questions) expect(q.text).not.toMatch(/[a-f0-9]{8}-|__|param:|fenetre-de-toit|couverture-bac/);
  });

  it("la liste, dans l'ordre du devis : gouttière, crochets, naissances, membrane, Velux et raccord SK06, Velux et raccord MK04, tôles ; 5 lignes sans fourniture", () => {
    const { liste, sansFourniture } = ecran();
    const vu = liste.map((l) => [l.label, l.quantity, l.couleur] as const);
    expect(vu).toHaveLength(9);
    expect(vu[0]).toEqual([expect.stringMatching(/^Gouttière demi-ronde zinc naturel/), "5 longueurs de 4 m", "orange"]);
    expect(liste[0]!.raison).toMatch(/développé/i);
    // §51.5 dit 35 crochets ; la règle §7 / §25 du référentiel compte un crochet tous les 50 cm (40 cm en bord de mer) plus un
    // en bout : 36, ou 45 en bord de mer. À trancher par le fondateur (voir le rapport de la PR 2).
    // Retour du fondateur (2026-10-12) : « Crochets de gouttière ? dév. ? » en vert, non : le crochet se choisit au développé
    // de la gouttière ; orange tant que la question n'a pas de réponse (§49.2), avec la même question que la gouttière.
    expect(vu[1]).toEqual([expect.stringMatching(/^Crochets .*Négrafix/i), expect.stringMatching(/^(?:35|36|44|45) pièces$/), "orange"]);
    expect(liste[1]!.raison).toMatch(/développé/i);
    expect(vu[2]).toEqual([expect.stringMatching(/^Naissances/), null, "orange"]);
    expect(liste[2]!.raison).toMatch(/descentes|nombre/i);
    expect(vu[3]).toEqual([expect.stringMatching(/^Membrane .*chéneau|^Chéneau .*membrane/i), expect.anything(), "orange"]);
    // §49.1 : l'ordre du devis, chaque ligne avec ses fournitures (la fenêtre, puis son raccord) ; le §51.5 les énumère par
    // article, le devis les écrit ligne par ligne.
    expect(vu[4]).toEqual([expect.stringMatching(/^Velux GGL SK06 114 ?× ?118 white finish/i), "4 pièces", "vert"]);
    expect(vu[5]).toEqual([expect.stringMatching(/^Raccords? .*SK06/i), "4 pièces", "orange"]);
    expect(liste[5]!.raison).toMatch(/ZWC ou Pratikal/i);
    expect(vu[6]).toEqual([expect.stringMatching(/^Velux GGU MK04 78 ?× ?98 ever finish/i), "1 pièce", "vert"]);
    expect(vu[7]).toEqual([expect.stringMatching(/^Raccords? .*MK04/i), "1 pièce", "orange"]);
    expect(vu[8]).toEqual([expect.stringMatching(/^Tôles bac acier/i), "10", "orange"]);
    expect(liste[8]!.raison).toMatch(/unité|profil|teinte/i);
    expect(sansFourniture).toBe(5);
    // Interdit : un identifiant interne à l'écran.
    for (const l of liste) expect(`${l.label} ${l.raison}`).not.toMatch(/[a-f0-9]{8}-|__|param:/);
  });

  it("le développé répondu (25) passe la gouttière au vert ; ses crochets attendent encore leur pose, puis passent au vert", () => {
    const dev = ecran({ "param:developpe_gouttiere": { value: "25", unit: "cm" } }).liste;
    expect(dev[0]).toMatchObject({ couleur: "vert" });
    expect(dev[1]).toMatchObject({ couleur: "orange", raison: "Pose à préciser" });
    const { liste } = ecran({ "param:developpe_gouttiere": { value: "25", unit: "cm" }, "param:fixation_crochet": { value: "2", unit: "u" } });
    expect(liste[0]).toMatchObject({ couleur: "vert" });
    expect(liste[1]).toMatchObject({ label: expect.stringMatching(/^Crochets .*Négrafix/i), couleur: "vert", raison: "" });
  });
});
