import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CleDeChiffrementAbsente, Chiffreur, estChiffre, lireCle } from "../src/platform/chiffrement/chiffreur.js";

/**
 * Revue, lot B (Greg, 26 octobre 2026) : « Sans cette clé, rien ne doit pouvoir être chiffré. » Sans `CHIFFREMENT_CLE`, le
 * fichier reste tel quel ; avec, il est illisible en base ; un fichier chiffré ne se relit jamais sans la clé.
 */
describe("chiffrement des fichiers au repos (CHIFFREMENT_CLE)", () => {
  const pdf = Buffer.from("%PDF-1.7\nDevis client anonymisé\n%%EOF");

  it("sans clé : rien n'est chiffré, le fichier reste tel quel", () => {
    const sans = new Chiffreur(lireCle(undefined));
    expect(sans.actif).toBe(false);
    expect(sans.chiffrer(pdf).equals(pdf)).toBe(true);
    expect(lireCle("  ")).toBeNull();
  });

  it("avec la clé : illisible en base, relu à l'identique, jamais chiffré deux fois", () => {
    const c = new Chiffreur(lireCle(randomBytes(32).toString("base64")));
    const stocke = c.chiffrer(pdf);
    expect(estChiffre(stocke)).toBe(true);
    expect(stocke.includes(Buffer.from("Devis client"))).toBe(false);
    expect(c.chiffrer(stocke).equals(stocke)).toBe(true);
    expect(c.dechiffrer(stocke).equals(pdf)).toBe(true);
    // Un fichier déposé avant la clé se relit tel quel.
    expect(c.dechiffrer(pdf).equals(pdf)).toBe(true);
  });

  it("un fichier chiffré ne se relit pas sans la clé, ni avec une autre clé, ni altéré", () => {
    const c = new Chiffreur(lireCle(randomBytes(32).toString("base64")));
    const stocke = c.chiffrer(pdf);
    expect(() => new Chiffreur(null).dechiffrer(stocke)).toThrow(CleDeChiffrementAbsente);
    expect(() => new Chiffreur(randomBytes(32)).dechiffrer(stocke)).toThrow();
    const altere = Buffer.from(stocke);
    altere[altere.length - 1]! ^= 1;
    expect(() => c.dechiffrer(altere)).toThrow();
  });

  it("une clé de mauvaise longueur fait échouer le démarrage", () => {
    expect(() => lireCle(randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });
});
