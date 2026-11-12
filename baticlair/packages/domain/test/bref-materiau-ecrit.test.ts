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

  it("deux autres fournitures principales (zinc à joint debout en m², ardoises à la pièce), dans les deux ordres : les deux, la surface écrite avec son ouvrage", () => {
    const ZINC: Ligne = { designation: "Couverture zinc à joint debout prépatiné 0,65 mm", quantity: "40", unit: "m²", ouvrage: Z, emplacement: "couverture" };
    const a = bref([ZINC, ARDOISE]);
    const b = bref([ARDOISE, ZINC]);
    expect(tout(a)).toBe(tout(b));
    // Les ardoises sont écrites à la pièce : pas de surface à dire pour elles ; le zinc garde la sienne.
    expect(a.faits[0]).toBe("Couverture en ardoises et zinc à joint debout (40 m²)");
    expect(a.b.faits).toEqual([]);
    expect(tout(a)).not.toMatch(/tuile|crochet/i);
  });

  it("JAMAIS UN OUVRAGE MASQUÉ par une plus grande surface (Greg, 12 novembre 2026) : tous sont cités avec leur surface écrite, dans les deux ordres", () => {
    const ardoise = (m2: string): Ligne => ({ designation: "Couverture en ardoises naturelles 32 × 22", quantity: m2, unit: "m²", ouvrage: A, emplacement: "ardoise" });
    const tuile = (m2: string): Ligne => ({ designation: "Couverture en tuiles terre cuite", quantity: m2, unit: "m²", ouvrage: T, emplacement: "tuile" });
    const cas: [Ligne, Ligne, string][] = [
      [ardoise("60"), tuile("20"), "Couverture en tuiles (20 m²) et en ardoises (60 m²)"],
      // Des surfaces très différentes : la petite n'est jamais masquée par la grande, ni l'inverse.
      [ardoise("600"), tuile("5"), "Couverture en tuiles (5 m²) et en ardoises (600 m²)"],
      [ardoise("3"), tuile("1200"), "Couverture en tuiles (1200 m²) et en ardoises (3 m²)"],
      [ardoise("12,5"), tuile("12,5"), "Couverture en tuiles (12,5 m²) et en ardoises (12,5 m²)"],
    ];
    for (const [a, t, attendu] of cas) {
      const r1 = bref([a, t]);
      const r2 = bref([t, a]);
      expect(r1.faits[0], attendu).toBe(attendu);
      expect(tout(r2)).toBe(tout(r1));
      // Aucun fait d'une ligne n'est prêté au chantier entier : chaque surface reste avec son ouvrage.
      expect(r1.b.faits).toEqual([]);
      expect(r1.phrase).toBe(`Je vous envoie la liste des fournitures pour un chantier de ${attendu.charAt(0).toLowerCase()}${attendu.slice(1)}.`);
    }
    // Deux lignes du même ouvrage : leurs surfaces écrites s'ajoutent pour cet ouvrage.
    expect(bref([ardoise("60"), tuile("20"), ardoise("15")]).faits[0]).toBe("Couverture en tuiles (20 m²) et en ardoises (75 m²)");
    expect(tout(bref([ardoise("15"), ardoise("60"), tuile("20")]))).toBe(tout(bref([tuile("20"), ardoise("60"), ardoise("15")])));
  });

  it("trois systèmes écrits : les trois sont cités, dans tous les ordres, chacun avec sa surface quand il en écrit une", () => {
    const ZINC: Ligne = { designation: "Couverture zinc à joint debout prépatiné 0,65 mm", quantity: "40", unit: "m²", ouvrage: Z, emplacement: "couverture" };
    const attendu = "Couverture en tuiles, en ardoises et zinc à joint debout (40 m²)";
    for (const lignes of [[ARDOISE, TUILE, ZINC], [ZINC, TUILE, ARDOISE], [TUILE, ZINC, ARDOISE]]) {
      const r = bref(lignes);
      expect(r.faits[0], lignes.map((l) => l.designation).join(" + ")).toBe(attendu);
      expect(r.b.faits).toEqual([]);
      expect(tout(r)).not.toMatch(/emboîtement|ardoises au crochet/i);
    }
  });

  it("un mot écrit sur un AUTRE article ne qualifie pas l'ouvrage : « à emboîtement » d'une faîtière ne fait pas une tuile à emboîtement", () => {
    // Le devis des parcours : une tuile romane canal, et une faîtière « à emboîtement » (un autre ouvrage).
    const CANAL: Ligne = { designation: "Tuile romane canal rouge 12,5 u/m²", quantity: "1250", unit: "u", ouvrage: T, emplacement: "tuile" };
    const FAITIERE: Ligne = { designation: "Faîtière ronde à emboîtement", quantity: "42", unit: "u", ouvrage: "faitage", emplacement: "faitiere" };
    for (const lignes of [[CANAL, FAITIERE, LITEAU], [FAITIERE, LITEAU, CANAL]]) {
      const r = bref(lignes);
      expect(r.faits[0], lignes.map((l) => l.designation).join(" + ")).toBe("Couverture en tuiles");
      expect(tout(r)).not.toMatch(/tuiles à embo[îi]tement/i);
    }
    // Écrit sur une ligne du même ouvrage (le liteau de la couverture en tuiles), le mot vaut.
    expect(bref([TUILE, { ...LITEAU, designation: "Liteau pour tuiles à emboîtement" }]).faits[0]).toBe("Couverture en tuiles à emboîtement");
  });

  it("deux lignes du même ouvrage sans surface pour trancher : l'ouvrage est nommé, aucune des deux ne prête ses faits au chantier", () => {
    const ARDOISE_B: Ligne = { ...ARDOISE, designation: "Ardoise naturelle 40 × 24 Angers", quantity: "300" };
    const a = bref([ARDOISE, ARDOISE_B]);
    expect(tout(a)).toBe(tout(bref([ARDOISE_B, ARDOISE])));
    expect(a.faits).toEqual(["Couverture en ardoises"]);
    expect(a.phrase).toBe("Je vous envoie la liste des fournitures pour un chantier de couverture en ardoises.");
    // Une surface écrite désigne la ligne, dans les deux ordres.
    const M2: Ligne = { designation: "Couverture en ardoises naturelles 32 × 22", quantity: "60", unit: "m²", ouvrage: A, emplacement: "ardoise" };
    for (const lignes of [[M2, ARDOISE_B], [ARDOISE_B, M2]]) expect(bref(lignes).faits.slice(0, 2)).toEqual(["Couverture en ardoises", "60 m²"]);
  });
});
