/**
 * BATICLAIR GROUPÉ, ÉTAPE 5 : LA DEMANDE AUX NÉGOCES (document du fondateur, 2026-10-19, section 2 étape 5 ; décision du
 * 2026-10-20 : la commission de 2 % acceptée avant de répondre), en code pur : qui reçoit, l'objet, le texte et le HTML
 * (la phrase en gras), le PDF en deux parties sans nom de client, le contrat.
 */
import { describe, expect, it } from "vitest";
import { DELAI_REPONSE_JOURS, documentDemande, htmlDemande, negoceConcerne, objetDemande, PHRASE_ACCORD, PHRASE_COMMISSION, TAUX_COMMISSION_POURCENT, texteContrat, texteContratCommission, texteDemande, VERSION_CONTRAT, volumesDuLot, type LotADemander } from "../src/index.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const lot: LotADemander = {
  numero: 12,
  designation: "Carreau de sol 60×60 grès cérame rectifié",
  famille: "second_oeuvre",
  zone: "22",
  unite: "cartons",
  fenetre: { tot: d("2026-11-10"), tard: d("2026-11-20") },
  chantiers: [
    { adresse: "3 rue des Ajoncs, 22300 Lannion", quantite: "23", unite: "cartons", fenetre: { tot: d("2026-11-02"), tard: d("2026-11-20") }, ferme: true },
    { adresse: "12 rue de Kerampont, 22300 Lannion", quantite: "23", unite: "cartons", fenetre: { tot: d("2026-11-10"), tard: d("2026-11-30") }, ferme: true },
    { adresse: "8 rue du Port, 22500 Paimpol", quantite: "23", unite: "cartons", fenetre: { tot: d("2026-11-02"), tard: d("2026-11-20") }, ferme: false },
  ],
  lienReponse: "https://app.example/reponse/jeton-carrelage",
};
const liens = { pasConcerne: "https://app.example/negoces/lien/pc", stop: "https://app.example/negoces/lien/stop" };

describe("groupé, étape 5 : la demande aux négoces", () => {
  it("qui reçoit : le département du lot, la famille vendue, pas « stop » ; le volume ferme à part du probable", () => {
    expect(negoceConcerne({ departement: "22", familles: ["second_oeuvre"], stop: false }, lot)).toBe(true);
    expect(negoceConcerne({ departement: "22", familles: ["couverture", "second_oeuvre"], stop: false }, lot)).toBe(true);
    expect(negoceConcerne({ departement: "22", familles: ["plomberie"], stop: false }, lot)).toBe(false);
    expect(negoceConcerne({ departement: "29", familles: ["second_oeuvre"], stop: false }, lot)).toBe(false);
    expect(negoceConcerne({ departement: "22", familles: ["second_oeuvre"], stop: true }, lot)).toBe(false);
    expect(volumesDuLot(lot)).toEqual({ ferme: "46 cartons", probable: "23 cartons" });
  });

  it("l'e-mail : l'objet, le texte (phrase en capitales entre astérisques), le HTML (phrase en gras), les liens ; jamais un nom de client", () => {
    expect(objetDemande([lot], "22")).toBe("Regroupement : demande de prix, Carreau de sol 60×60 grès cérame rectifié (22)");
    expect(objetDemande([lot, { ...lot, numero: 13 }], "22")).toBe("Regroupement : 2 demandes de prix (22)");
    const texte = texteDemande([lot], liens);
    expect(texte).toContain(`** ${PHRASE_COMMISSION.toUpperCase()} **`);
    expect(texte).toContain("Lot n° 12 : Carreau de sol 60×60 grès cérame rectifié");
    expect(texte).toContain("Volume ferme : 46 cartons (2 chantiers) ; volume probable : 23 cartons.");
    expect(texte).toContain("Livraison entre le 10 novembre 2026 et le 20 novembre 2026");
    expect(texte).toContain(lot.lienReponse);
    expect(texte).toContain(`Réponse attendue sous ${DELAI_REPONSE_JOURS} jours.`);
    expect(texte).toContain(`Pas concerné : ${liens.pasConcerne}`);
    expect(texte).toContain(`Stop : ${liens.stop}`);
    const html = htmlDemande([lot], liens);
    expect(html).toContain(`<strong>${PHRASE_COMMISSION}</strong>`);
    expect(html).toContain(`<a href="${lot.lienReponse}">`);
    // Section 6, mot pour mot.
    // Greg, 24 octobre 2026 : plus de 2 %, la formule unique.
    expect(PHRASE_COMMISSION).toBe("Aucun frais pour l'instant. BATI INVEST pourra introduire une commission ultérieurement, avec un préavis de 60 jours et l'accord du négoce.");
    expect(PHRASE_COMMISSION).not.toContain(`${TAUX_COMMISSION_POURCENT} %`);
    expect(PHRASE_ACCORD).toBe("J'accepte les conditions du regroupement");
  });

  it("le PDF en deux parties : les lots (ferme / probable), puis chaque chantier (adresse, quantité, fenêtre, engagement), la phrase en pied", () => {
    const doc = documentDemande([lot], "22", d("2026-10-20"));
    expect(doc.titre).toBe("Regroupement : demande de prix, département 22, le 20 octobre 2026");
    expect(doc.partie1).toEqual([
      ["Lot", "Référence", "Famille", "Volume ferme", "Volume probable", "Livraison"],
      ["n° 12", "Carreau de sol 60×60 grès cérame rectifié", "Second œuvre (peinture, carrelage, plâtrerie, sols)", "46 cartons", "23 cartons", "du 10 novembre 2026 au 20 novembre 2026"],
    ]);
    expect(doc.partie2).toHaveLength(1);
    expect(doc.partie2[0]!.lignes).toEqual([
      ["Adresse de livraison", "Quantité", "Fenêtre", "Engagement"],
      ["3 rue des Ajoncs, 22300 Lannion", "23 cartons", "du 2 novembre 2026 au 20 novembre 2026", "ferme"],
      ["12 rue de Kerampont, 22300 Lannion", "23 cartons", "du 10 novembre 2026 au 30 novembre 2026", "ferme"],
      ["8 rue du Port, 22500 Paimpol", "23 cartons", "du 2 novembre 2026 au 20 novembre 2026", "probable"],
    ]);
    expect(doc.pied).toBe(PHRASE_COMMISSION);
  });

  it("le contrat : la version, aucun coût, l'acceptation par la case ; l'ancien contrat de commission reste lisible pour sa version", () => {
    const c = texteContrat();
    expect(c[0]).toContain(VERSION_CONTRAT);
    expect(c[0]).not.toContain("projet");
    expect(c.join("\n")).not.toMatch(/\d+ % du montant/);
    expect(c.join("\n")).toContain("Aucun frais pour l'instant");
    const ancien = texteContratCommission("2026-10-22");
    expect(ancien.join("\n")).toContain("2 % du montant hors taxes du lot");
    expect(ancien.join("\n")).toContain("payable à 30 jours");
    expect(ancien.join("\n")).toContain("en cochant la case");
  });
});
