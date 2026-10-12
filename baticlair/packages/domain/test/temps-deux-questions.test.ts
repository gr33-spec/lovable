/**
 * TEMPS DEUX, les questions (directive du fondateur, 2026-10-12 ; §51.2, §51.6) : une question par donnée manquante, une
 * par ligne orange, aucune sur une donnée écrite ; une fois tout répondu, la liste est verte.
 *  - « Article ajouté à la main sans unité : orange avec question « unité ? » (case avec unité), jamais vert sans unité (51.6). »
 *  - Une ligne que le fournisseur précisera (profil, teinte) a sa question à l'écran des questions : « Le fournisseur
 *    précisera » ou ce que l'artisan écrit, qui part dans la précision de la ligne.
 */
import { describe, expect, it } from "vitest";
import { DE00000071_LECTURE, ecranDeLecture, lectureDepuisLignes, ROOFING_REFERENTIAL, type LectureDevis } from "../src/index.js";

const ref = ROOFING_REFERENTIAL;
const rows = (lecture: LectureDevis, answers: Record<string, unknown> = {}) => {
  const e = ecranDeLecture({ ref, lecture, answers: answers as never });
  const lignes = e.purchase.screen.groups.flatMap((g) => g.rows).map((r) => {
    const item = e.purchase.toBuy.find((b) => b.key === r.itemKey);
    return { label: item?.label ?? "", quantity: item?.quantity ?? null, precision: item?.precision ?? null, couleur: r.status === "ok" ? "vert" : "orange", raison: r.reason ?? "" };
  });
  const questions = e.purchase.questions.filter((d) => d.question).map((d) => ({ key: d.question!.key, text: d.question!.text, options: (d.question!.options ?? []).map((o) => o.value) }));
  return { lignes, questions };
};

describe("temps deux : une ligne sans unité demande son unité", () => {
  const lecture = lectureDepuisLignes([
    { id: "l1", designation: "Bâche de protection 4 × 5 m", quantity: "2", unit: null },
    { id: "l2", designation: "Vis inox 4,5 × 35", quantity: "200", unit: "u" },
  ]);

  it("orange « Unité à préciser » avec sa question à boutons d'unité, jamais verte sans unité", () => {
    const { lignes, questions } = rows(lecture);
    expect(lignes[0]).toMatchObject({ label: expect.stringMatching(/^Bâche/), couleur: "orange", raison: "Unité à préciser" });
    expect(lignes[1]).toMatchObject({ couleur: "vert" });
    const q = questions.find((x) => x.key === "unite:l1")!;
    expect(q.text).toBe("Bâche de protection 4 × 5 m : quelle unité ?");
    expect(q.options).toEqual(["u", "m", "m2", "kg", "l"]);
    expect(questions.filter((x) => x.key.startsWith("unite:"))).toHaveLength(1);
  });

  it("l'unité répondue passe la ligne au vert, avec son unité", () => {
    const { lignes, questions } = rows(lecture, { "unite:l1": "u" });
    expect(lignes[0]).toMatchObject({ couleur: "vert", quantity: "2 pièces" });
    expect(questions.filter((x) => x.key.startsWith("unite:"))).toEqual([]);
  });
});

describe("temps deux : une ligne que le fournisseur précisera se règle sur la ligne (§51.6, « C'est bon / Modifier »)", () => {
  it("les tôles de DE00000071 (profil, teinte) : aucune question de plus à l'écran des questions ; une précision écrite sur la ligne la passe en précision", () => {
    const avant = rows(DE00000071_LECTURE);
    expect(avant.questions.filter((x) => x.key.startsWith("a-preciser:"))).toEqual([]);
    const tole = DE00000071_LECTURE.lignes.find((l) => /tôles bacs acier pour étanchéité/i.test(l.designation))!;
    const ecrit = rows(DE00000071_LECTURE, { [`a-preciser:${tole.ref}`]: "Profil 1000 T, RAL 7016", "fiche:toles_bac_acier": "10 tôles" });
    const ligne = ecrit.lignes.find((l) => /^Tôles/i.test(l.label))!;
    expect(ligne.precision).toMatch(/Profil 1000 T, RAL 7016/);
    expect(ligne.raison).not.toMatch(/profil|teinte/i);
  });
});
