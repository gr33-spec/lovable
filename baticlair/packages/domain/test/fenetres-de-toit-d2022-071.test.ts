import { describe, expect, it } from "vitest";
import { planQuote, ROOFING_REFERENTIAL, tradeProfile } from "../src/index.js";
import { D2022_071_LINES } from "./devis-reels/d2022-071.js";
import { readQuote } from "./support/read-quote.js";

/**
 * Retour du fondateur (2026-10-11, son devis D-2022-071) : « on voit bien le nombre de velux et la taille… Toutes les
 * infos sont là pour sortir un quantitatif au top ». L'écran posait pourtant « Taille de la fenêtre de toit : fenêtre
 * 114 × 118 (devis : « 114×118 »), ou fenêtre 78 × 98 (devis : « mk04 ») ? », « Surface du toit ? », et sortait deux
 * lignes « Couverture bac acier MK04 ». Trois causes, toutes générales :
 *  - une ligne de pose (« Pose de velux sk06 114x118 ») valait pour TOUTES les fenêtres du devis, donc contredisait la
 *    MK04 : elle ne vaut que pour la fenêtre dont elle redit la taille (§49.4 : jamais de question sur une donnée écrite) ;
 *  - « Réalisation des trémies de charpente pour velux » et « Pose de velx … sur bac acier » sont de la main-d'œuvre :
 *    l'article posé est ce qui suit « pose », pas le support après « sur » ; ce qui suit « pour » est la destination ;
 *  - une ligne sans colonne d'unité (« tôles bacs acier … 10 ») ne lance pas « Surface du toit ? » avec des boutons
 *    50/100/150/200 : §49.2, la donnée manquante se demande sur la ligne.
 */
describe("devis D-2022-071 : 4 fenêtres 114 × 118 et 1 fenêtre 78 × 98 (fondateur, 2026-10-11)", () => {
  const profile = tradeProfile("roofing");

  it("les lignes de pose et de trémies sont de la main-d'œuvre : deux fenêtres, chacune sa taille, aucune contradiction", () => {
    const plan = planQuote(D2022_071_LINES, ROOFING_REFERENTIAL, profile);
    expect(plan.contradictions).toEqual([]);
    expect(plan.lines.filter((l) => l.status === "not_material").map((l) => l.ref)).toEqual(["2", "4", "6", "7", "9"]);
    const fenetres = plan.inputs.filter((i) => i.workItemId.startsWith("fenetre-de-toit"));
    expect(fenetres.map((f) => [f.params.taille_fenetre?.value, f.params.nb_fenetres?.value]).sort()).toEqual([
      ["114118", "4"],
      ["7898", "1"],
    ]);
    // Rien du bac acier n'est à chiffrer : le devis ne le fournit que pour l'étanchéité au-dessus des fenêtres (ligne 10).
    expect(plan.lines.filter((l) => l.status === "planned" && l.workItemId?.startsWith("couverture-bac-acier")).map((l) => l.ref)).toEqual(["10"]);
  });

  it("l'écran : aucune question de taille ni de surface, les deux fenêtres partent telles qu'écrites, les trémies ne sont pas à chiffrer", () => {
    const v = readQuote(D2022_071_LINES);
    const texts = v.questions.map((q) => q.question?.text ?? q.text);
    expect(texts.filter((t) => /fenêtre|surface du toit/i.test(t))).toEqual([]);
    // §49.2 : « tôles bacs acier … 10 » sans unité : l'unité se demande sur la ligne, et rien d'autre sur le bac acier.
    expect(texts.filter((t) => /bac acier|unité/i.test(t))).toEqual(["Pas d'unité sur cette ligne. C'est à la pièce ?"]);
    const labels = v.toBuy.map((b) => b.label);
    expect(labels).toEqual(expect.arrayContaining([D2022_071_LINES[4]!.designation, D2022_071_LINES[7]!.designation]));
    expect(labels.filter((l) => /^Couverture bac acier/.test(l))).toEqual([]);
    expect(v.toQuote.map((b) => b.label).filter((l) => /trémies|Pose de vel/i.test(l))).toEqual([]);
  });

  it("« Oui, à la pièce » : 10 tôles partent telles qu'écrites, sans « Surface du toit ? » ni taille de fenêtre derrière", () => {
    const v = readQuote(D2022_071_LINES.map((l) => (l.ref === "10" ? { ...l, unit: "u" } : l)));
    const texts = v.questions.map((q) => q.question?.text ?? q.text);
    expect(texts.filter((t) => /fenêtre|bac acier|surface du toit/i.test(t))).toEqual([]);
    const toles = v.toBuy.find((b) => b.lineIds.includes("10"))!;
    expect([toles.label, toles.quantity]).toEqual(["Tôles bacs acier pour étanchéité du dessus de velux", "10 pièces"]);
  });
});
