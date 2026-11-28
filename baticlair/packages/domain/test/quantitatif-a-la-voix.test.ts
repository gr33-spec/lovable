import { describe, expect, it } from "vitest";
import { dicteeAuPropre, dicteeVaAuMoteur, ecranDeLecture, lectureDeLaDictee, ROOFING_REFERENTIAL as ref, type EngineAnswer } from "../src/index.js";

/**
 * LE QUANTITATIF À LA VOIX (Greg, 28 novembre 2026, test réel sur iPhone). « Le chemin voix doit passer par TON moteur,
 * exactement comme un devis » ; « on n'envoie JAMAIS des m² à un fournisseur » ; « on n'invente jamais une caractéristique » ;
 * « châtia » devait être « chatière ». Six dictées : la phrase exacte de Greg, puis cinq dictées réalistes avec des mots mal
 * transcrits. Pour chacune : le texte remis au propre, les questions posées, la liste finale (réponses d'un artisan).
 */
type Reponses = Record<string, EngineAnswer>;
/** La discussion : chaque question reçoit la réponse donnée par la fonction, jusqu'à la dernière. */
function discussion(brut: string, repondre: (cle: string, boutons: string[], valeurs: string[], unite: string) => EngineAnswer) {
  const propre = dicteeAuPropre(ref, brut);
  const lecture = lectureDeLaDictee(ref, propre.texte);
  const answers: Reponses = {};
  const posees: string[] = [];
  for (let i = 0; i < 20; i++) {
    const q = ecranDeLecture({ ref, lecture, answers, preferences: {} }).questions[0];
    if (!q) break;
    posees.push(q.text);
    answers[q.key] = repondre(q.key, (q.options ?? []).map((o) => o.label), (q.options ?? []).map((o) => o.value), q.unit ?? "u");
  }
  const avantSuggestions = ecranDeLecture({ ref, lecture, answers, preferences: {} });
  const e = ecranDeLecture({ ref, lecture, answers: { ...answers, "suggestions:choisies": "aucune" }, preferences: {} });
  return { propre, lecture, posees, suggestions: (avantSuggestions.suggestions ?? []).map((s) => s.label), liste: e.purchase.toBuy.map((b) => `${b.label} = ${b.quantity}`), aChiffrer: e.purchase.toQuote.map((b) => b.label) };
}
/** L'artisan touche le premier bouton ; sans bouton, « Je ne sais pas ». */
const premierBouton = () => (_cle: string, _boutons: string[], valeurs: string[], unite: string): EngineAnswer => (valeurs.length ? { value: valeurs[0]!, unit: unite } : null);

describe("le quantitatif à la voix passe par le moteur, comme un devis", () => {
  it("la phrase exacte de Greg : « châtia » remis au propre, aucune surface envoyée, crochets comptés, rien d'inventé", () => {
    const brut = "je dois environ 50 m² d'ardoise 32x22, j'ai une gouttière bandeau avec les crochets, gouttière bandeau de 25, et je dois prévoir également deux châtia";
    const r = discussion(brut, (cle, boutons) => (/longueur_gouttiere/.test(cle) ? { value: "12", unit: "m" } : /qualite_ardoise/.test(cle) ? { value: "1", unit: "u" } : boutons.length ? { value: "1", unit: "u" } : null));
    expect(r.propre.texte).toBe("je dois environ 50 m² d'ardoise 32x22, j'ai une gouttière bandeau avec les crochets, gouttière bandeau de 25, et je dois prévoir également deux chatières");
    expect(r.lecture.lignes.map((l) => `${l.designation} [${l.quantite} ${l.unite}]`)).toEqual(["Ardoise 32x22 [50 m²]", "Gouttière bandeau avec les crochets, gouttière bandeau de 25 [null ml]", "Chatières [2 u]"]);
    // Les questions du comptoir, rien de plus : « de 25 » et « bandeau » sont dits, donc jamais redemandés ; la longueur de
    // gouttière, oui (Greg : « c'est correct, garde ça »).
    expect(r.posees).toEqual([
      "Tes m² d'ardoise comprennent déjà l'égout et les coupes ?",
      "Tes crochets d'ardoise : à agrafe ou à pointe ?",
      "Longueur de gouttière ?",
      "Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ?",
    ]);
    expect(r.liste).toEqual([
      "Ardoises naturelles Espagne 1er choix 32×22 = 2 095 pièces",
      "Crochets d'ardoise inox à agrafe standard, longueur 10 cm = 4 boîtes de 500",
      "Crochets d'ardoise inox à pointe standard, longueur 10 cm = 1 boîte de 700",
      "Gouttière dév. 25 = 4 longueurs de 4 m",
      "Crochets de gouttière bandeau dév. 25 = 31 pièces",
      "Chatières = 2 pièces",
    ]);
    // Puis l'étape « Suggestions » par catégorie, comme un devis (sortie de ventilation comprise).
    expect(r.suggestions).toEqual(expect.arrayContaining(["Naissances de gouttière", "Clous d'ardoise (égout, rives, faîtage)", "Sortie de ventilation (VMC, extraction d'air)"]));
    // Jamais un m² dans la liste, jamais une caractéristique qui n'a pas été dite ou choisie.
    expect(r.liste.join(" ")).not.toMatch(/m²|m2/);
    expect(r.aChiffrer).toEqual([]);
  });

  it("sans réponse sur la qualité, aucune qualité n'est écrite (jamais « Espagne 1er choix » d'un exemple)", () => {
    const r = discussion("50 m² d'ardoise 32x22", (cle, boutons) => (/qualite_ardoise/.test(cle) ? null : boutons.length ? { value: "1", unit: "u" } : null));
    expect(r.liste.join(" ")).not.toMatch(/Espagne|1er choix|Cupa/);
  });

  it("« 30 par 20 » est un format et « fêtage » le faîtage : ardoises en pièces, faîtage en feuilles de zinc", () => {
    const r = discussion("il me faut 80 m² d'ardoise 30 par 20 et 12 mètres de fêtage en zinc", premierBouton());
    expect(r.propre.texte).toBe("il me faut 80 m² d'ardoise 30x20 et 12 mètres de faîtage en zinc");
    expect(r.liste[0]).toMatch(/^Ardoises naturelles .*30×20 = [\d ]+ pièces$/);
    expect(r.liste.some((x) => /^Feuilles zinc .*2 × 1 m.* = \d+ pièces?$/.test(x))).toBe(true);
  });

  it("« goutière de 33 sur 15 mètres avec crocher sur chevrons, deux descentes de 5 mètres » : longueurs, crochets, tubes", () => {
    const r = discussion("60 m² de tuiles, une goutière de 33 sur 15 mètres avec crocher sur chevrons, deux descentes de 5 mètres", premierBouton());
    expect(r.propre.texte).toBe("60 m² de tuiles, une gouttière de 33 sur 15 mètres avec crochet sur chevrons, deux descentes de 5 mètres");
    expect(r.liste).toEqual(expect.arrayContaining(["Gouttière dév. 33 = 4 longueurs de 4 m", "Crochets de gouttière sur chevron dév. 33 = 39 pièces"]));
    expect(r.liste.some((x) => /^Tubes de descente/.test(x))).toBe(true);
    // Le modèle de tuile n'est pas dit : il se demande, jamais choisi à la place de l'artisan.
    expect(r.posees.some((q) => /tuiles/i.test(q))).toBe(true);
  });

  it("« l'habergement de la cheminée » : l'abergement, une pièce, et « Combien de feuilles ? » (sans la taille de la souche)", () => {
    const r = discussion("je refais une noue zinc de 8 mètres et l'habergement de la cheminée", premierBouton());
    expect(r.lecture.lignes.map((l) => `${l.designation} [${l.quantite} ${l.unite}]`)).toEqual(["Noue zinc [8 ml]", "Abergement de la cheminée [1 u]"]);
    expect(r.posees[0]).toBe("Pour l'entourage de ta cheminée, combien de feuilles de zinc te faut-il ?");
  });

  it("« ardoise 32 22 au crocher de 11, 40 mètres de litos » : format, crochets de 11, liteaux", () => {
    const r = discussion("100 m² d'ardoise 32 22 au crocher de 11, 40 mètres de litos", premierBouton());
    expect(r.propre.texte).toBe("100 m² d'ardoise 32x22 au crochet de 11, 40 mètres de liteaux");
    expect(r.liste.filter((x) => /^Crochets d'ardoise/.test(x)).every((x) => /longueur 11 cm/.test(x))).toBe(true);
    expect(r.liste).toContain("Liteaux = 40 ml");
  });

  it("« deux châtia et une sortie de toit » : deux chatières, une sortie de toit et ses pièces", () => {
    const r = discussion("deux châtia et une sortie de toit, 30 m² de tuiles", premierBouton());
    expect(r.propre.texte).toBe("deux chatières et une sortie de toit, 30 m² de tuiles");
    expect(r.liste).toEqual(expect.arrayContaining(["Chatières = 2 pièces"]));
    expect(r.lecture.lignes.find((l) => /Sortie de toit/.test(l.designation))).toMatchObject({ quantite: "1", unite: "u" });
  });

  it("un vrai doute devient des boutons, jamais « tu veux dire quoi ? »", () => {
    const vocab = dicteeAuPropre(ref, "trois chatias");
    // Un seul mot du métier à une lettre de son : remplacé ; sinon le doute a ses boutons.
    for (const d of vocab.doutes) expect(d.candidats.length).toBeGreaterThan(1);
    expect(vocab.texte).toMatch(/chatières/);
  });

  it("ce qui part au moteur : une mesure à calculer ; des articles comptés en pièces restent tels quels", () => {
    expect(dicteeVaAuMoteur(ref, "je dois environ 50 m² d'ardoise 32x22")).toBe(true);
    expect(dicteeVaAuMoteur(ref, "12 mètres de gouttière bandeau de 25 avec les crochets")).toBe(true);
    expect(dicteeVaAuMoteur(ref, "Ardoise 5 et fruitier")).toBe(false);
    expect(dicteeVaAuMoteur(ref, "1 000 ardoises naturelles 32×22 Espagne 1er choix et 950 crochets inox 100 mm")).toBe(false);
    expect(dicteeVaAuMoteur(ref, "10 sacs de colle")).toBe(false);
  });
});
