import { describe, expect, it } from "vitest";
import { readSiteNotes, ROOFING_REFERENTIAL } from "../src/index.js";

/**
 * BANC DE 30 PHRASÉS D'ARTISAN (référentiel §44.2, test permanent du §44.5) : la note se lit sans IA. Chaque mesure
 * attendue est trouvée, avec sa valeur exacte ; AUCUNE fausse mesure n'est créée (ce qui n'est pas attendu fait échouer).
 * Phrasés : « environ », « ~ », « 6m50 », « 2 rampants de 6,5 », « deux descentes », abréviations (ml, lin, pte).
 */
const BANC: [note: string, attendu: Record<string, string>][] = [
  ["Pente 42°", { pente: "42 °" }],
  ["pente : 35°", { pente: "35 °" }],
  ["pte 40°", { pente: "40 °" }],
  ["Pente environ 30°", { pente: "30 °" }],
  ["pente ~35°", { pente: "35 °" }],
  ["pente de 38 degrés", { pente: "38 °" }],
  ["Rampant 6 m", { longueur_rampant: "6 m" }],
  ["rampant 6m50", { longueur_rampant: "6.50 m" }],
  ["2 rampants de 6,5", { longueur_rampant: "6.5 m" }],
  ["Rampants 2 x 6,50 m", { longueur_rampant: "6.50 m" }],
  ["rampant env. 7 m", { longueur_rampant: "7 m" }],
  ["faîtage 9 ml", { longueur_faitage: "9 m" }],
  ["Faîtage : 12 lin", { longueur_faitage: "12 m" }],
  ["gouttière 24 ml", { longueur_gouttiere: "24 m" }],
  ["égout 18 m", { longueur_gouttiere: "18 m" }],
  ["deux descentes", { nb_descentes: "2 u" }],
  ["Gouttière avec 2 descentes.", { nb_descentes: "2 u" }],
  ["3 descentes EP", { nb_descentes: "3 u" }],
  ["une cheminée à reprendre", { nb_cheminees: "1 u" }],
  ["Cheminée : périmètre 4 m", { perimetre_cheminee: "4 m" }],
  ["hauteur des descentes 5 m", { hauteur_descente: "5 m" }],
  ["entraxe 60 cm", { entraxe_supports: "60 cm" }],
  ["pureau de 10,5 cm", { pureau: "10.5 cm" }],
  ["zinc ép. 0,65 mm", { epaisseur_zinc: "0.65 mm" }],
  ["Pente 42°. Rampants 2 × 6,50 m. 2 descentes", { pente: "42 °", longueur_rampant: "6.50 m", nb_descentes: "2 u" }],
  // Pièges : du contexte, jamais une mesure.
  ["Prévoir 9 000 ardoises, budget 12 000 €", {}],
  ["Rampant à voir sur place", {}],
  ["Noue 12 m, 2 Velux conservés", {}],
  ["Le client veut une pente douce", {}],
  ["Devis du 12/03, chantier en mai", {}],
];

const lu = (note: string) => Object.fromEntries(readSiteNotes(ROOFING_REFERENTIAL, note).map((f) => [f.key, `${f.value} ${f.unit}`]));

describe("banc de 30 phrasés d'artisan (§44.2)", () => {
  it("le banc compte bien 30 phrasés", () => expect(BANC).toHaveLength(30));
  it.each(BANC)("« %s »", (note, attendu) => {
    expect(lu(note)).toEqual(attendu);
  });
});
