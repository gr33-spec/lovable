/**
 * LOT FINAL, point 6 (Greg, 29 octobre 2026) : relances à mi-délai et la veille pour l'artisan, à mi-délai pour le
 * négoce ; jamais après une réponse ou un refus ; au plus deux rappels par négoce et par demande.
 */
import { describe, expect, it } from "vitest";
import { mailRelanceDemande, phraseCompteARebours, phraseRelanceArtisan, relancesDues, TON } from "../src/index.js";

const envoyeLe = new Date("2026-11-02T09:00:00Z");
const dateLimite = new Date("2026-11-06T09:00:00Z");
const base = { envoyeLe, dateLimite, reponduLe: null, refuseLe: null, rappelMiLe: null, rappelVeilleLe: null, relanceNegoceLe: null };

describe("relances : mi-délai, veille, et jamais au-delà", () => {
  it("avant mi-délai, rien ; à mi-délai, l'artisan et le négoce ; la veille, l'artisan encore", () => {
    expect(relancesDues(base, new Date("2026-11-03T09:00:00Z"))).toEqual({ artisan: null, negoce: false });
    expect(relancesDues(base, new Date("2026-11-04T10:00:00Z"))).toEqual({ artisan: "mi", negoce: true });
    const apresMi = { ...base, rappelMiLe: new Date("2026-11-04T10:00:00Z"), relanceNegoceLe: new Date("2026-11-04T10:00:00Z") };
    expect(relancesDues(apresMi, new Date("2026-11-04T20:00:00Z"))).toEqual({ artisan: null, negoce: false });
    expect(relancesDues(apresMi, new Date("2026-11-05T10:00:00Z"))).toEqual({ artisan: "veille", negoce: false });
    const deux = { ...apresMi, rappelVeilleLe: new Date("2026-11-05T10:00:00Z") };
    expect(relancesDues(deux, new Date("2026-11-05T20:00:00Z"))).toEqual({ artisan: null, negoce: false });
  });
  it("mi-délai et veille le même jour : un seul message à l'artisan", () => {
    const court = { ...base, dateLimite: new Date("2026-11-03T09:00:00Z") };
    expect(relancesDues(court, new Date("2026-11-02T22:00:00Z"))).toEqual({ artisan: "veille", negoce: true });
    expect(relancesDues({ ...court, rappelVeilleLe: new Date("2026-11-02T22:00:00Z"), relanceNegoceLe: new Date() }, new Date("2026-11-03T08:00:00Z")).artisan).toBeNull();
  });
  it("date limite lointaine : le négoce est rappelé au plus tard à 48 h ouvrées, l'artisan suit la date", () => {
    const loin = { ...base, dateLimite: new Date("2026-12-30T00:00:00Z"), relanceNegoceAuPlusTard: new Date("2026-11-04T09:00:00Z") };
    expect(relancesDues(loin, new Date("2026-11-04T10:00:00Z"))).toEqual({ artisan: null, negoce: true });
  });
  it("après une réponse, un refus ou la date limite : plus rien", () => {
    const t = new Date("2026-11-05T10:00:00Z");
    expect(relancesDues({ ...base, reponduLe: new Date("2026-11-03T09:00:00Z") }, t)).toEqual({ artisan: null, negoce: false });
    expect(relancesDues({ ...base, refuseLe: new Date("2026-11-03T09:00:00Z") }, t)).toEqual({ artisan: null, negoce: false });
    expect(relancesDues(base, new Date("2026-11-06T09:00:00Z"))).toEqual({ artisan: null, negoce: false });
  });
  it("les mots : Greg mot pour mot", () => {
    expect(phraseRelanceArtisan("Point P Lannion")).toBe("Point P Lannion n'a pas encore répondu. Appelle ton commercial : ta demande est peut-être dans ses spams.");
    expect(TON.relanceGroupe).toBe("Plus il y a de négoces qui répondent, meilleur est le prix pour tout le groupe.");
    const m = mailRelanceDemande({ entreprise: "Entreprise Dupont", dateLimite, lien: "https://x/chiffrer/j", prenomCommercial: "Paul" });
    expect(m.objet).toBe("Entreprise Dupont attend votre offre");
    expect(m.texte).toContain("Bonjour Paul,\n\nVotre client Entreprise Dupont attend votre offre. Les réponses sont closes le 6 novembre.");
    expect(m.texte).toContain("Répondre en ligne, sans inscription : https://x/chiffrer/j");
    expect(m.texte).not.toMatch(/commission|inscrivez/i);
  });
  it("point 7 : le compte à rebours de la page du négoce", () => {
    const limite = new Date("2026-11-06T09:00:00Z");
    expect(phraseCompteARebours(limite, new Date("2026-11-03T20:00:00Z"))).toBe("Plus que 2 jours pour répondre");
    expect(phraseCompteARebours(limite, new Date("2026-11-05T08:00:00Z"))).toBe("Plus que 1 jour pour répondre");
    expect(phraseCompteARebours(limite, new Date("2026-11-05T10:00:00Z"))).toBe("Dernier jour pour répondre");
    expect(phraseCompteARebours(limite, limite)).toBeNull();
  });

  it("demande individuelle (Greg, 12 novembre 2026) : cordial, la date choisie comme un souhait, aucune date inventée, pas la signature des achats groupés", () => {
    const avec = mailRelanceDemande({ entreprise: "Entreprise Dupont", dateLimite: new Date("2026-11-06T12:00:00Z"), lien: "https://mobiiz.fr/chiffrer/abc", prenomCommercial: "Paul", individuelle: true });
    expect(avec.objet).toBe("Entreprise Dupont : votre proposition tarifaire");
    expect(avec.texte).toContain("Bonjour Paul,\n\nJe me permets de revenir vers vous au sujet de la demande de prix de Entreprise Dupont. Dans la mesure du possible, une réponse avant le 6 novembre lui rendrait service.");
    expect(avec.texte.indexOf("répondre directement à cet e-mail")).toBeLessThan(avec.texte.indexOf("chiffrer en ligne"));
    const sans = mailRelanceDemande({ entreprise: "Entreprise Dupont", dateLimite: new Date("2026-12-06T12:00:00Z"), lien: null, individuelle: true, sansDate: true });
    expect(sans.texte).toContain("restée sans réponse pour le moment.");
    for (const t of [avec.texte, sans.texte]) expect(t).not.toMatch(/closes|achètent ensemble|plusieurs (négoces|fournisseurs)/);
    expect(sans.texte).not.toMatch(/avant le|décembre/);
  });
});
