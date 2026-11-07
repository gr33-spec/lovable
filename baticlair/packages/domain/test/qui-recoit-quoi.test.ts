/**
 * « QUI REÇOIT QUOI » (Greg, 1er novembre 2026) : un spécialisé ne reçoit que ses lots, un généraliste peut tout recevoir,
 * un lot sans négoce compatible est signalé avec la phrase de Greg, un envoi hors spécialité n'existe que confirmé.
 */
import { describe, expect, it } from "vitest";
import { articlesPour, phraseLotSansNegoce, quiRecoitQuoi, specialiteDuMetier, type LotAEnvoyer } from "../src/index.js";

const lots: LotAEnvoyer[] = [
  { cle: "roofing", libelle: "Couverture", specialite: "couverture", articles: ["a1", "a2", "a3"] },
  { cle: "masonry", libelle: "Maçonnerie", specialite: "maconnerie", articles: ["m1", "m2"] },
];

describe("qui reçoit quoi", () => {
  it("un spécialisé ne reçoit que son lot ; un généraliste reçoit tout", () => {
    const r = quiRecoitQuoi(lots, [
      { id: "kerbrat", nom: "Kerbrat", specialites: ["couverture"] },
      { id: "gedimat", nom: "Gédimat", specialites: ["generaliste"] },
    ]);
    expect(r.negoces.find((n) => n.id === "kerbrat")!.lots).toEqual(["roofing"]);
    expect(r.negoces.find((n) => n.id === "gedimat")!.lots).toEqual(["roofing", "masonry"]);
    expect(articlesPour(r, lots, "kerbrat")).toEqual(["a1", "a2", "a3"]);
    expect(r.alertes).toEqual([]);
  });

  it("un lot sans négoce compatible : la phrase de Greg ; un négoce sans lot est signalé", () => {
    const r = quiRecoitQuoi(lots, [{ id: "kerbrat", nom: "Kerbrat", specialites: ["couverture"] }]);
    expect(r.lots.find((l) => l.cle === "masonry")!.couvert).toBe(false);
    expect(r.alertes).toEqual(["Deux lignes de maçonnerie n'ont actuellement aucun négoce compatible. Ajoute un négoce généraliste ou un négoce spécialisé pour demander leur chiffrage."]);
    const seul = quiRecoitQuoi([lots[1]!], [{ id: "kerbrat", nom: "Kerbrat", specialites: ["couverture"] }]);
    expect(seul.negoces[0]!.sansLot).toBe(true);
  });

  it("forcé après l'avertissement : le lot part, noté « forcé » ; sans spécialité déclarée : tout part, « à préciser »", () => {
    const r = quiRecoitQuoi(lots, [{ id: "kerbrat", nom: "Kerbrat", specialites: ["couverture"] }], new Set(["kerbrat:masonry"]));
    expect(r.negoces[0]!.lots).toEqual(["roofing", "masonry"]);
    expect(r.negoces[0]!.forces).toEqual(["masonry"]);
    expect(r.alertes).toEqual([]);
    const inconnu = quiRecoitQuoi(lots, [{ id: "x", nom: "X", specialites: [] }]);
    expect(inconnu.lots.every((l) => l.destinataires[0]!.compatibilite === "a_preciser")).toBe(true);
  });

  it("le métier de la liste donne la spécialité ; la phrase s'accorde", () => {
    expect(specialiteDuMetier("roofing")).toBe("couverture");
    expect(specialiteDuMetier("drywall")).toBe("isolation_platrerie");
    expect(specialiteDuMetier("inconnu")).toBe("autre");
    expect(phraseLotSansNegoce(1, "Électricité")).toBe("Une ligne d'électricité n'a actuellement aucun négoce compatible. Ajoute un négoce généraliste ou un négoce spécialisé pour demander leur chiffrage.");
  });
});
