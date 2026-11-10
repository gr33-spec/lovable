/**
 * MISSIONS ENTRE ENTREPRISES (Greg, 10 novembre 2026, prompt maître) : les règles du domaine. Jamais de contact libre ;
 * coordonnées après l'accord des DEUX ; tarif et budget toujours indicatifs ; une pièce jointe est jugée sur son contenu ;
 * la cloche ne porte que des alertes courtes ; la boîte garde les deux circuits (Missions, négoces) séparés.
 */
import { describe, expect, it } from "vitest";
import {
  alerteNouveauMessage,
  alertePropositionNegoce,
  budgetLisible,
  categorieDuLien,
  chercherMetier,
  COORDONNEES_MASQUEES,
  etatCoordonnees,
  fauteFichier,
  fauteMessage,
  fautesDisponibilite,
  fautesMission,
  fautesReponse,
  filtrerBoite,
  groupesBoite,
  masquerCoordonnees,
  METIERS_BATIMENT,
  NEGOCES_PAR_ENVOI,
  periodeLisible,
  peutAnnonce,
  quandBoite,
  refusOuverture,
  tarifLisible,
  typeReel,
  type ContexteOuverture,
  type ElementBoite,
} from "../src/index.js";

const AUJ = "2026-11-10";
const MISSION = { metier: "Couverture - Toiture", lieu: "Plouha", codePostal: "22580", debut: "2026-11-14", fin: "2026-11-16", types: ["sous-traitance"], description: "Pose d'ardoises naturelles sur une maison." };
const DISPO = { metier: "Zinguerie", ville: "Lannion", codePostal: "22300", rayonKm: 40, debut: "2026-11-18", types: ["renfort"], presentation: "Équipe de 2 personnes disponible." };

describe("annonces", () => {
  it("une mission complète passe ; chaque manque est nommé, dans l'ordre de l'écran", () => {
    expect(fautesMission(MISSION, AUJ)).toEqual([]);
    expect(fautesMission({ ...MISSION, metier: "", debut: "2026-11-01", fin: "2026-10-30", types: [], description: "court" }, AUJ).map((f) => f.champ)).toEqual(["metier", "debut", "fin", "types", "description"]);
    expect(fautesMission({ ...MISSION, budgetMin: 500, budgetMax: 400 }, AUJ).map((f) => f.champ)).toEqual(["budgetMax"]);
    expect(fautesMission({ ...MISSION, types: ["inconnu"] }, AUJ)).toHaveLength(1);
  });
  it("une disponibilité : le tarif est facultatif, mais donné il dit pour qui il vaut", () => {
    expect(fautesDisponibilite(DISPO, AUJ)).toEqual([]);
    expect(fautesDisponibilite({ ...DISPO, tarifJour: 420 }, AUJ).map((f) => f.champ)).toEqual(["tarifUnite"]);
    expect(fautesDisponibilite({ ...DISPO, tarifJour: 420, tarifUnite: "personne", dureeMinJours: 2 }, AUJ)).toEqual([]);
    expect(fautesDisponibilite({ ...DISPO, rayonKm: 2, fin: "2026-11-01" }, AUJ).map((f) => f.champ)).toEqual(["rayonKm", "fin"]);
  });
  it("une réponse : niveau, expérience et équipe déclarés, un message", () => {
    expect(fautesReponse({ niveau: "confirme", experienceAns: 8, equipe: 2, message: "Disponibles." })).toEqual([]);
    expect(fautesReponse({ niveau: "", experienceAns: -1, equipe: 0, message: "" }).map((f) => f.champ)).toEqual(["niveau", "experienceAns", "equipe", "message"]);
  });
  it("suspendre, reprendre, fermer ; fermée, plus rien", () => {
    expect(peutAnnonce("publiee", "suspendre")).toBe(true);
    expect(peutAnnonce("publiee", "reprendre")).toBe(false);
    expect(peutAnnonce("suspendue", "reprendre")).toBe(true);
    expect(["suspendre", "reprendre", "fermer", "modifier"].some((a) => peutAnnonce("fermee", a as never))).toBe(false);
  });
  it("les textes : période, tarif, budget, toujours « HT »", () => {
    expect(periodeLisible("2026-11-14", "2026-11-16")).toBe("14 au 16 novembre");
    expect(periodeLisible("2026-11-28", "2026-12-02")).toBe("28 novembre au 2 décembre");
    expect(periodeLisible("2026-12-01", null)).toBe("1er décembre");
    expect(tarifLisible(420, "personne")).toBe("420 € HT / jour / personne");
    expect(tarifLisible(900, "equipe")).toBe("900 € HT / jour pour l'équipe");
    expect(budgetLisible("jour", 400, 500)).toBe("400 à 500 € HT / jour");
    expect(budgetLisible("forfait", 2000, 2000)).toBe("2 000 € HT");
    expect(budgetLisible("a-convenir", null, null)).toBe("À convenir");
    expect(budgetLisible("jour", null, null)).toBeNull();
  });
  it("tous les métiers restent accessibles par la recherche, sans accent ni casse", () => {
    expect(chercherMetier("etanch")).toEqual(["Étanchéité"]);
    expect(chercherMetier("PLAQU")).toEqual(["Plâtrerie - Plaquiste"]);
    expect(chercherMetier("")).toHaveLength(METIERS_BATIMENT.length);
    expect(new Set(METIERS_BATIMENT).size).toBe(METIERS_BATIMENT.length);
  });
});

describe("conversations : jamais de contact libre", () => {
  const base: ContexteOuverture = { type: "mission", statut: "publiee", demandeurEstAuteur: true, reponseExiste: true, bloque: false, demandeurVerifie: true, ouvertesAujourdHui: 0 };
  it("mission : l'auteur, avec une entreprise qui a répondu, et rien d'autre", () => {
    expect(refusOuverture(base)).toBeNull();
    expect(refusOuverture({ ...base, reponseExiste: false })).toBe("sans_reponse");
    expect(refusOuverture({ ...base, demandeurEstAuteur: false })).toBe("sans_reponse");
    expect(refusOuverture({ ...base, statut: "fermee" })).toBe("annonce_fermee");
    expect(refusOuverture({ ...base, statut: "suspendue" })).toBeNull();
  });
  it("disponibilité publiée : une entreprise vérifiée écrit à son auteur ; jamais l'inverse, jamais suspendue", () => {
    const d: ContexteOuverture = { ...base, type: "disponibilite", demandeurEstAuteur: false, reponseExiste: false };
    expect(refusOuverture(d)).toBeNull();
    expect(refusOuverture({ ...d, demandeurEstAuteur: true })).toBe("soi_meme");
    expect(refusOuverture({ ...d, statut: "suspendue" })).toBe("annonce_fermee");
  });
  it("bloqué, non vérifié, ou trop de conversations ouvertes dans la journée : refusé", () => {
    expect(refusOuverture({ ...base, bloque: true })).toBe("bloque");
    expect(refusOuverture({ ...base, demandeurVerifie: false })).toBe("non_verifie");
    expect(refusOuverture({ ...base, ouvertesAujourdHui: 10 })).toBe("trop");
  });
  it("coordonnées : un seul accord ne montre rien ; un numéro ou un e-mail écrit est masqué", () => {
    expect([etatCoordonnees(false, false), etatCoordonnees(true, false), etatCoordonnees(false, true), etatCoordonnees(true, true)]).toEqual(["privees", "proposees_par_moi", "proposees_par_l_autre", "partagees"]);
    for (const t of ["06 12 34 56 78", "0612345678", "+33 6 12 34 56 78", "06.12.34.56.78", "martin@toitures.fr"]) expect(masquerCoordonnees(`Écris-moi : ${t} merci`)).toBe(`Écris-moi : ${COORDONNEES_MASQUEES} merci`);
    expect(masquerCoordonnees("Rendez-vous le 14 à 8 h, 36 m de liteaux 27 × 40")).toBe("Rendez-vous le 14 à 8 h, 36 m de liteaux 27 × 40");
    expect(fauteMessage("  ")).not.toBeNull();
    expect(fauteMessage("x".repeat(2001))).not.toBeNull();
    expect(fauteMessage("Bonjour")).toBeNull();
  });
});

describe("pièces jointes : type, taille et contenu", () => {
  const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d];
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d];
  it("le type réel vient des octets", () => {
    expect(typeReel(pdf)).toBe("application/pdf");
    expect(typeReel([0xff, 0xd8, 0xff, 0xe0])).toBe("image/jpeg");
    expect(typeReel(png)).toBe("image/png");
    expect(typeReel([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])).toBe("image/webp");
    expect(typeReel([0x4d, 0x5a])).toBeNull();
  });
  it("refusé : vide, trop lourd, format hors liste, contenu qui n'est pas celui du format, nom à chemin", () => {
    expect(fauteFichier({ nom: "cv.pdf", type: "application/pdf", taille: 1000 }, pdf)).toBeNull();
    expect(fauteFichier({ nom: "cv.pdf", type: "application/pdf", taille: 0 }, pdf)).toBe("vide");
    expect(fauteFichier({ nom: "cv.pdf", type: "application/pdf", taille: 4 * 1024 * 1024 + 1 }, pdf)).toBe("trop_lourd");
    expect(fauteFichier({ nom: "a.exe", type: "application/x-msdownload", taille: 10 }, [0x4d, 0x5a])).toBe("type_refuse");
    expect(fauteFichier({ nom: "a.svg", type: "image/svg+xml", taille: 10 }, [0x3c, 0x73])).toBe("type_refuse");
    expect(fauteFichier({ nom: "faux.pdf", type: "application/pdf", taille: 10 }, png)).toBe("contenu_different");
    expect(fauteFichier({ nom: "../../etc/passwd", type: "application/pdf", taille: 10 }, pdf)).toBe("nom");
  });
});

describe("la cloche et la boîte", () => {
  it("une alerte est courte, ouvre la bonne action, et sa clé ne s'écrit qu'une fois", () => {
    const a = alerteNouveauMessage({ conversationId: "c1", entreprise: "Toitures Martin", sujet: "Couverture - Toiture · Plouha", messageId: "m1" });
    expect(a).toMatchObject({ titre: "Nouveau message", action: "Ouvrir la conversation", href: "/messages/c1", cle: "message:m1", categorie: "missions", genre: "action" });
    expect(alerteNouveauMessage({ conversationId: "c", entreprise: "x".repeat(200), sujet: "y", messageId: "m" }).detail.length).toBeLessThanOrEqual(80);
    expect(alertePropositionNegoce({ emailId: "e1", negoce: "Point.P", chantier: "Chantier Plouha" })).toMatchObject({ detail: "Point.P · Chantier Plouha", href: "/messages/negoce/e1", categorie: "prix" });
  });
  it("la catégorie d'une notification vient de l'écran qu'elle ouvre", () => {
    expect(categorieDuLien("/messages/abc")).toBe("missions");
    expect(categorieDuLien("/missions/abc/reponses")).toBe("missions");
    expect(categorieDuLien("/messages/negoce/abc")).toBe("prix");
    expect(categorieDuLien("/chantiers/abc#fournisseurs")).toBe("prix");
    expect(categorieDuLien("/achats-groupes/besoins/abc")).toBe("groupe");
    expect(categorieDuLien("/compte")).toBeNull();
  });
  const items: ElementBoite[] = [
    { cle: "mission:1", sorte: "mission", titre: "Toitures Martin", sujet: "Mission · Plouha", extrait: "La mission est toujours disponible", le: "2026-11-10T08:42:00Z", nonLu: true, href: "/messages/1" },
    { cle: "negoce:2", sorte: "negoce", titre: "Point.P Lannion", sujet: "Nouvelle proposition · Chantier Plouha", extrait: "Devis.pdf", le: "2026-11-10T07:17:00Z", nonLu: true, href: "/messages/negoce/2" },
    { cle: "mission:3", sorte: "mission", titre: "Armor Littoral", sujet: null, extrait: "Disponible à partir du 18", le: "2026-11-09T10:00:00Z", nonLu: false, href: "/messages/3" },
  ];
  it("Tous, Missions, Négoces, Non lus ; la recherche ; les plus récents d'abord", () => {
    expect(filtrerBoite(items, "tous").map((i) => i.cle)).toEqual(["mission:1", "negoce:2", "mission:3"]);
    expect(filtrerBoite(items, "missions").map((i) => i.cle)).toEqual(["mission:1", "mission:3"]);
    expect(filtrerBoite(items, "negoces").map((i) => i.cle)).toEqual(["negoce:2"]);
    expect(filtrerBoite(items, "non-lus").map((i) => i.cle)).toEqual(["mission:1", "negoce:2"]);
    expect(filtrerBoite(items, "tous", "plouha").map((i) => i.cle)).toEqual(["mission:1", "negoce:2"]);
  });
  it("« Aujourd'hui » puis « Plus tôt », à l'heure de Paris", () => {
    const maintenant = new Date("2026-11-10T12:00:00Z");
    expect(groupesBoite(items, maintenant).map((g) => [g.titre, g.items.length])).toEqual([["Aujourd'hui", 2], ["Plus tôt", 1]]);
    expect(quandBoite("2026-11-10T08:42:00Z", maintenant)).toBe("09:42");
    expect(quandBoite("2026-11-09T10:00:00Z", maintenant)).toBe("hier");
    expect(quandBoite("2026-11-06T10:00:00Z", maintenant)).toBe("vendredi");
    expect(quandBoite("2026-10-20T10:00:00Z", maintenant)).toBe("20 oct.");
  });
  it("trois négoces au plus par envoi", () => {
    expect(NEGOCES_PAR_ENVOI).toBe(3);
  });
});
