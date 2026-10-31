/**
 * ASSISTANT MOBIIZ (Greg, 31 octobre 2026, points 2, 3, 11, 13, 14) : questions courtes et jamais reposées, consignes
 * libres (plusieurs dans un message), quantités seulement dites, « je ne sais pas », « passer » ; tout en code.
 */
import { describe, expect, it } from "vitest";
import { dateDite, interpreter, lireDescription, lireArticle, ligneVisee, messageOuverture, questionsAssistant, resumeConsignes, LIVRAISON_CHANTIER, RETRAIT_DEPOT, type LigneAssistant } from "../src/index.js";

const LIGNES: LigneAssistant[] = [
  { cle: "a", libelle: "Ardoise naturelle 32×22" },
  { cle: "b", libelle: "Liteau sapin traité 18×40" },
  { cle: "c", libelle: "Crochet ardoise inox 90 mm" },
  { cle: "d", libelle: "Vis inox 4 × 40" },
  { cle: "e", libelle: "Écran sous-toiture HPV" },
];

describe("les questions de l'assistant", () => {
  it("devis complet (adresse et livraison connues) : aucune question, et il le dit", () => {
    const q = questionsAssistant({ adresse: "3 rue du Port, Lannion", livraison: `${LIVRAISON_CHANTIER}, demain`, passees: [] });
    expect(q).toEqual([]);
    expect(messageOuverture(5, 0, q)).toBe("Ta liste est prête : 5 lignes. Je n'ai rien à te demander : tu peux relire le PDF et l'envoyer.");
  });
  it("infos manquantes : toutes les questions dans un seul message, par priorité ; jamais une quantité", () => {
    const q = questionsAssistant({ adresse: null, livraison: null, passees: [] });
    expect(q.map((x) => x.cle)).toEqual(["adresse", "livraison"]);
    const m = messageOuverture(12, 2, q);
    expect(m).toContain("Adresse du chantier ?");
    expect(m).toContain("Souhaites-tu une livraison ?");
    expect(m).toContain("dont 2 à vérifier");
    expect(m).not.toMatch(/combien|quelle quantit/i);
  });
  it("une question passée ne revient jamais ; la date ne se demande que pour une livraison", () => {
    expect(questionsAssistant({ adresse: null, livraison: null, passees: ["adresse", "livraison"] })).toEqual([]);
    expect(questionsAssistant({ adresse: "x", livraison: LIVRAISON_CHANTIER, passees: [] }).map((x) => x.cle)).toEqual(["date"]);
    expect(questionsAssistant({ adresse: "x", livraison: RETRAIT_DEPOT, passees: [] })).toEqual([]);
  });
});

describe("l'interprète des consignes", () => {
  it("plusieurs consignes dans un message (dictée) : retirer, ajouter, changer une quantité", () => {
    const c = interpreter("retire les vis, ajoute 10 sacs de colle C2 et passe les liteaux à 200 m", LIGNES);
    expect(c).toEqual([
      { type: "retirer", cle: "d", libelle: "Vis inox 4 × 40" },
      { type: "ajouter", libelle: "Colle C2", quantite: "10", unite: "sacs" },
      { type: "quantite", cle: "b", libelle: "Liteau sapin traité 18×40", quantite: "200", unite: "m" },
    ]);
    expect(resumeConsignes(c)).toBe("C'est fait : retiré « Vis inox 4 × 40 », ajouté « Colle C2 », 10 sacs, « Liteau sapin traité 18×40 » passe à 200 m.");
  });
  it("les formes courantes d'une quantité", () => {
    expect(interpreter("mets 1300 ardoises", LIGNES)[0]).toMatchObject({ type: "quantite", cle: "a", quantite: "1300" });
    expect(interpreter("1300 au lieu de 1200 pour les ardoises", LIGNES)[0]).toMatchObject({ type: "quantite", cle: "a", quantite: "1300" });
    expect(interpreter("écran : 4 rouleaux", LIGNES)[0]).toMatchObject({ type: "quantite", cle: "e", quantite: "4", unite: "rouleaux" });
    expect(interpreter("change la ligne 3 à 1500", LIGNES)[0]).toMatchObject({ type: "quantite", cle: "c", quantite: "1500" });
  });
  it("aucune quantité inventée : un ajout sans nombre reste sans quantité", () => {
    expect(interpreter("il me faut du mastic", LIGNES)).toEqual([{ type: "ajouter", libelle: "Mastic", quantite: null, unite: null }]);
    expect(resumeConsignes(interpreter("ajoute une gouttière", LIGNES))).toBe("C'est fait : ajouté « Gouttière », 1.");
    expect(lireArticle("colle carrelage x10")).toEqual({ libelle: "Colle carrelage", quantite: "10", unite: null });
  });
  it("« mets 10 sacs de colle » sans ligne de colle : un ajout avec la quantité dite", () => {
    expect(interpreter("mets 10 sacs de colle", LIGNES)).toEqual([{ type: "ajouter", libelle: "Colle", quantite: "10", unite: "sacs" }]);
  });
  it("une cible ambiguë demande laquelle ; une phrase inconnue se dit", () => {
    const amb = interpreter("retire les vis", [...LIGNES, { cle: "f", libelle: "Vis bois 5 × 60" }])[0]!;
    expect(amb).toMatchObject({ type: "ambigu", candidats: [{ cle: "d" }, { cle: "f" }] });
    expect(interpreter("retire l'ardoise", LIGNES)[0]).toMatchObject({ type: "retirer", cle: "a" });
    expect(resumeConsignes(interpreter("bonjour toi", LIGNES))).toBe("Je n'ai pas compris « bonjour toi ». Dis-le autrement, ou touche la ligne dans le PDF.");
  });
  it("adresse, livraison, date, je ne sais pas, passer", () => {
    expect(interpreter("Lannion, rue du Port", LIGNES, "adresse")).toEqual([{ type: "adresse", texte: "Lannion, rue du Port" }]);
    expect(interpreter("l'adresse est 3 rue du Port 22300 Lannion", LIGNES)).toEqual([{ type: "adresse", texte: "3 rue du Port 22300 Lannion" }]);
    expect(interpreter("oui, demain", LIGNES, "livraison")).toEqual([{ type: "livraison", texte: `${LIVRAISON_CHANTIER}, demain` }]);
    expect(interpreter("non", LIGNES, "livraison")).toEqual([{ type: "livraison", texte: RETRAIT_DEPOT }]);
    expect(interpreter("je passe au dépôt", LIGNES)).toEqual([{ type: "livraison", texte: RETRAIT_DEPOT }]);
    expect(interpreter("livraison sur chantier le 12 novembre", LIGNES)).toEqual([{ type: "livraison", texte: `${LIVRAISON_CHANTIER}, le 12 novembre` }]);
    expect(interpreter("je ne sais pas", LIGNES, "adresse")).toEqual([{ type: "ne_sait_pas" }]);
    expect(interpreter("Passer", LIGNES, "adresse")).toEqual([{ type: "passer" }]);
    expect(interpreter("annuler", LIGNES)).toEqual([{ type: "annuler" }]);
    expect(dateDite("Mardi matin")).toBe("Mardi matin");
  });
  it("répondre à plusieurs questions d'un coup", () => {
    const c = interpreter("3 rue du Port 22300 Lannion. Livraison sur chantier la semaine prochaine", LIGNES, "adresse");
    expect(c).toEqual([
      { type: "adresse", texte: "3 rue du Port 22300 Lannion" },
      { type: "livraison", texte: `${LIVRAISON_CHANTIER}, la semaine prochaine` },
    ]);
  });
  it("la ligne visée : mots du comptoir, pluriel, numéro", () => {
    expect(ligneVisee("les crochets", LIGNES)).toEqual({ ligne: LIGNES[2] });
    expect(ligneVisee("ligne 1", LIGNES)).toEqual({ ligne: LIGNES[0] });
    expect(ligneVisee("tuiles", LIGNES)).toBeNull();
  });
});

describe("Décris ton chantier (texte ou voix)", () => {
  it("garde les quantités dites, rend à part ce qui n'en a pas, n'invente rien", () => {
    const r = lireDescription("Je refais une salle de bain. Il me faut 40 m² de placo BA13, 3 rouleaux de laine de verre 100 mm et un WC suspendu, plus de la colle carrelage");
    expect(r.lignes).toEqual([
      { libelle: "Placo BA13", quantite: "40", unite: "m²" },
      { libelle: "Laine de verre 100 mm", quantite: "3", unite: "rouleaux" },
    ]);
    // Nombre en lettres ou pas de nombre : proposé, l'artisan coche.
    expect(r.aConfirmer).toEqual([
      { libelle: "Salle de bain", quantite: "1", unite: null },
      { libelle: "WC suspendu", quantite: "1", unite: null },
      { libelle: "Colle carrelage", quantite: null, unite: null },
    ]);
  });
  it("une dictée sans ponctuation, des mètres, des sacs", () => {
    const r = lireDescription("je vais poser 24 mètres de gouttière zinc et 6 sacs de mortier");
    expect(r.lignes).toEqual([
      { libelle: "Gouttière zinc", quantite: "24", unite: "m" },
      { libelle: "Mortier", quantite: "6", unite: "sacs" },
    ]);
  });
});
