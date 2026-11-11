import { describe, expect, it } from "vitest";
import { briefFacts, briefResume, briefSentence, briefTexte, lectureDepuisLignes, lignesDeLecture, planDeLecture, ROOFING_REFERENTIAL, siteBrief } from "../src/index.js";

/**
 * « LE CHANTIER EN BREF » NE DIT QUE CE QUI EST ÉCRIT (retour de Greg, 11 novembre 2026 ; règle numéro un, §45.7 test 6).
 * Une liste d'ardoises saisie à la main sortait « Couverture en tuiles à emboîtement » : le bref nommait l'ouvrage de la
 * première ligne rangée, même un accessoire commun à plusieurs ouvrages (un liteau, un écran de sous-toiture, une pointe),
 * rangé par défaut dans le premier ouvrage du tiroir qui le porte (la tuile). Règle : le bref ne nomme un ouvrage que si
 * une ligne en écrit la FOURNITURE PRINCIPALE (l'ardoise, la tuile, le zinc), et n'en garde que les mots écrits (« au
 * crochet » ne se dit pas si aucun crochet n'est écrit). Sans cela, il reste neutre.
 */
type Ligne = { designation: string; quantity: string; unit: string; ouvrage?: string; emplacement?: string };
const T = "couverture-tuiles-emboitement";
const A = "couverture-ardoises-crochet";
const Z = "couverture-zinc-joint-debout";

/** Le bref d'une liste, chaque ligne rangée comme le ferait un lecteur (le modèle, ou la lecture simulée de la démonstration). */
const bref = (lignes: Ligne[], ville: string | null = null) => {
  const lines = lignes.map((l, i) => ({ id: String(i + 1), designation: l.designation, quantity: l.quantity, unit: l.unit }));
  const base = lectureDepuisLignes(lines);
  const lecture = { ...base, lignes: base.lignes.map((l, i) => ({ ...l, fournitures: l.fournitures.map((f) => ({ ...f, ouvrage: lignes[i]!.ouvrage ?? null, emplacement: lignes[i]!.emplacement ?? null })) })) };
  const ls = lignesDeLecture(lecture);
  const plan = planDeLecture(ROOFING_REFERENTIAL, lecture, ls);
  const b = siteBrief({ ref: ROOFING_REFERENTIAL, plan, answers: {}, lines: ls.map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit })), ville });
  return { b, faits: briefFacts(b), texte: briefTexte(briefResume(b, null, {}), Boolean(b.ville || b.situation)), phrase: briefSentence(b) };
};
const tout = (r: ReturnType<typeof bref>) => [r.faits.join(" | "), r.texte, r.phrase].join(" || ");

const ARDOISE: Ligne = { designation: "Ardoise naturelle 32 × 22 Espagne 1er choix", quantity: "1200", unit: "pièces", ouvrage: A, emplacement: "ardoise" };
const CROCHET: Ligne = { designation: "Crochet ardoise inox 90 mm", quantity: "1250", unit: "pièces", ouvrage: A, emplacement: "crochet" };
// Les accessoires communs, rangés dans le PREMIER ouvrage du tiroir qui les porte : la tuile (ou le zinc pour une pointe).
const LITEAU: Ligne = { designation: "Liteau sapin traité 18 × 40", quantity: "180", unit: "m", ouvrage: T, emplacement: "liteau" };
const ECRAN: Ligne = { designation: "Écran de sous-toiture HPV 1,5 × 50 m", quantity: "3", unit: "rouleaux", ouvrage: T, emplacement: "ecran" };
const POINTE: Ligne = { designation: "Pointe inox 2,7 × 50", quantity: "4", unit: "boîtes", ouvrage: Z, emplacement: "fixation_patte" };
const TUILE: Ligne = { designation: "Tuile mécanique grand moule rouge", quantity: "900", unit: "pièces", ouvrage: T, emplacement: "tuile" };
const LITEAU_ARDOISE: Ligne = { ...LITEAU, ouvrage: A };

describe("le chantier en bref ne dit que ce qui est écrit", () => {
  it("une liste d'ardoises seules : jamais de tuiles, et « au crochet » ne se dit pas sans crochet écrit", () => {
    const r = bref([ARDOISE]);
    expect(tout(r)).not.toMatch(/tuile|emboîtement|emboitement|zinc|crochet/i);
    expect(r.faits[0]).toBe("Couverture en ardoises");
    expect(r.phrase).toBe("Je vous envoie la liste des fournitures pour un chantier de couverture en ardoises : 1200 pièces, ardoise naturelle 32 × 22 Espagne 1er choix.");
  });

  it("la liste du retour (ardoises, crochets, liteaux, écran, chevron, pointes) : une couverture en ardoises au crochet, jamais en tuiles, quel que soit l'ordre des lignes", () => {
    for (const lignes of [
      [ARDOISE, CROCHET, LITEAU, ECRAN, POINTE],
      [LITEAU, ECRAN, POINTE, CROCHET, ARDOISE],
      [ECRAN, ARDOISE, LITEAU, CROCHET],
    ]) {
      const r = bref(lignes);
      expect(tout(r), lignes.map((l) => l.designation).join(" + ")).not.toMatch(/tuile|emboîtement|emboitement|zinc|joint debout/i);
      expect(r.faits[0]).toBe("Couverture en ardoises au crochet");
    }
  });

  it("le cas inverse : une liste de tuiles ne devient jamais une couverture en ardoises", () => {
    for (const lignes of [[TUILE], [TUILE, LITEAU, ECRAN], [LITEAU_ARDOISE, TUILE], [CROCHET, TUILE]]) {
      const r = bref(lignes);
      expect(tout(r), lignes.map((l) => l.designation).join(" + ")).not.toMatch(/ardoises au crochet|couverture en ardoise|zinc/i);
      expect(r.faits[0]).toBe("Couverture en tuiles");
    }
    // « À emboîtement » se dit quand la liste l'écrit.
    expect(bref([{ ...TUILE, designation: "Tuile à emboîtement grand moule rouge" }]).faits[0]).toBe("Couverture en tuiles à emboîtement");
  });

  it("information insuffisante : des accessoires seuls (liteau, écran, pointe, crochet) ne nomment aucun type de couverture", () => {
    for (const lignes of [[LITEAU], [ECRAN], [POINTE], [LITEAU, ECRAN, POINTE], [LITEAU_ARDOISE], [CROCHET]]) {
      const r = bref(lignes);
      expect(tout(r), lignes.map((l) => l.designation).join(" + ")).not.toMatch(/tuile|emboîtement|couverture en|ardoises au crochet|zinc|joint debout/i);
      expect(r.b.ouvrage).toBeNull();
      expect(r.phrase).toBe("Je vous envoie la liste des fournitures pour un chantier.");
      expect(r.texte).toBe("");
    }
  });

  it("une ligne que personne n'a rangée (aucun lecteur) : neutre aussi", () => {
    const r = bref([{ designation: "Ardoise naturelle 32 × 22", quantity: "1200", unit: "pièces" }, { designation: "Liteau 18 × 40", quantity: "180", unit: "m" }], "Lannion");
    expect(r.b.ouvrage).toBeNull();
    expect(tout(r)).not.toMatch(/tuile|emboîtement|crochet|zinc/i);
    expect(r.texte).toBe("Lannion.");
  });

  it("sans ville, le texte ne prend jamais un fait pour une ville (« Chantier à 1200 pièces »)", () => {
    expect(bref([ARDOISE]).texte).toBe("Couverture en ardoises, 1200 pièces, ardoise naturelle 32 × 22 Espagne 1er choix.");
    expect(bref([ARDOISE], "Lannion").texte).toBe("Couverture en ardoises, 1200 pièces, ardoise naturelle 32 × 22 Espagne 1er choix. Chantier à Lannion.");
  });

  it("ardoises ET tuiles écrites : jamais « la première de la liste » ; les deux sont nommées, dans tous les ordres", () => {
    const attendu = "Couverture en tuiles et en ardoises";
    for (const lignes of [
      [ARDOISE, TUILE],
      [TUILE, ARDOISE],
      [ARDOISE, CROCHET, LITEAU, TUILE, ECRAN],
      [ECRAN, TUILE, LITEAU, CROCHET, ARDOISE],
      [LITEAU, TUILE, POINTE, ARDOISE],
    ]) {
      const r = bref(lignes);
      expect(r.faits[0], lignes.map((l) => l.designation).join(" + ")).toMatch(new RegExp(`^${attendu}`));
      // Aucun fait d'une ligne n'est prêté au chantier (ni « 1200 pièces », ni « 900 pièces », ni un matériau).
      expect(r.b.faits).toEqual([]);
      expect(tout(r)).not.toMatch(/emboîtement|emboitement|zinc|joint debout/i);
    }
    // Les mêmes lignes, dans les deux ordres : exactement le même bref.
    expect(tout(bref([ARDOISE, TUILE]))).toBe(tout(bref([TUILE, ARDOISE])));
    expect(bref([ARDOISE, TUILE]).phrase).toBe("Je vous envoie la liste des fournitures pour un chantier de couverture en tuiles et en ardoises.");
    // « Au crochet » reste dit quand un crochet est écrit.
    expect(bref([TUILE, CROCHET, ARDOISE]).faits[0]).toBe("Couverture en tuiles et en ardoises au crochet");
  });

  it("deux autres fournitures principales contradictoires (zinc à joint debout et ardoises), dans les deux ordres : les deux, jamais une seule", () => {
    const ZINC: Ligne = { designation: "Couverture zinc à joint debout prépatiné 0,65 mm", quantity: "40", unit: "m²", ouvrage: Z, emplacement: "couverture" };
    const a = bref([ZINC, ARDOISE]);
    const b = bref([ARDOISE, ZINC]);
    expect(tout(a)).toBe(tout(b));
    expect(a.faits[0]).toBe("Couverture en ardoises et zinc à joint debout");
    expect(tout(a)).not.toMatch(/tuile|crochet/i);
  });

  it("une surface écrite tranche (§45.2, l'ouvrage principal et sa surface), quel que soit l'ordre ; à égalité, les deux", () => {
    const A60: Ligne = { designation: "Couverture en ardoises naturelles 32 × 22", quantity: "60", unit: "m²", ouvrage: A, emplacement: "ardoise" };
    const T20: Ligne = { designation: "Couverture en tuiles terre cuite", quantity: "20", unit: "m²", ouvrage: T, emplacement: "tuile" };
    const T60: Ligne = { ...T20, quantity: "60" };
    for (const lignes of [[A60, T20], [T20, A60]]) {
      const r = bref(lignes);
      expect(r.faits[0]).toBe("Couverture en ardoises");
      expect(r.faits[1]).toBe("60 m²");
    }
    for (const lignes of [[A60, T60], [T60, A60]]) {
      const r = bref(lignes);
      expect(r.faits[0]).toBe("Couverture en tuiles et en ardoises");
      expect(r.b.faits).toEqual([]);
    }
  });

  it("trois systèmes écrits sans surface pour trancher : le bref reste neutre, dans tous les ordres", () => {
    const ZINC: Ligne = { designation: "Couverture zinc à joint debout prépatiné 0,65 mm", quantity: "40", unit: "m²", ouvrage: Z, emplacement: "couverture" };
    for (const lignes of [[ARDOISE, TUILE, ZINC], [ZINC, TUILE, ARDOISE], [TUILE, ZINC, ARDOISE]]) {
      const r = bref(lignes);
      expect(r.b.ouvrage).toBeNull();
      expect(tout(r)).not.toMatch(/couverture en|emboîtement|ardoises au crochet/i);
    }
  });

  it("deux lignes du même ouvrage : le bref ne dépend pas de leur ordre", () => {
    const ARDOISE_B: Ligne = { ...ARDOISE, designation: "Ardoise naturelle 40 × 24 Angers", quantity: "300" };
    expect(tout(bref([ARDOISE, ARDOISE_B]))).toBe(tout(bref([ARDOISE_B, ARDOISE])));
  });
});
