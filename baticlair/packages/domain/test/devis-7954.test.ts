import { describe, expect, it } from "vitest";
import { DEVIS_7954 } from "./devis-reels/devis-7954.js";

/**
 * La transcription du devis 7954 (scan, relevé à la main) est juste : les comptes de points du §6 du référentiel
 * électricité (validés par le fondateur le 11 octobre 2026) retombent exactement.
 */
const total = (re: RegExp, section?: RegExp) =>
  DEVIS_7954.filter((l) => re.test(l.designation) && (!section || section.test(l.section))).reduce((s, l) => s + Number((l.quantity ?? "0").replace(",", ".")), 0);

describe("devis 7954 : la transcription retombe sur les comptes du §6", () => {
  it("points, prises, tableaux, terre et alimentations radiateur", () => {
    expect(total(/^LAMP(L)?E SIMPLE 1 POINT LUMINEUX$/)).toBe(58);
    expect(total(/^VA ET VIENT 1 POINT LUMINEUX$/)).toBe(13);
    expect(total(/^VA ET VIENT 2 POINTS LUMINEUX$/)).toBe(1);
    expect(total(/^TELERUPTEUR 1 POINT LUMINEUX$/)).toBe(1);
    expect(total(/^PRISE DE COURANT 16A\+T$/)).toBe(151);
    expect(total(/^PRISE RJ45$/)).toBe(28);
    expect(total(/^PRISE TV$/)).toBe(12);
    expect(total(/^PRISE FOUR$/)).toBe(10);
    expect(total(/^PRISE PLAQUE$/)).toBe(10);
    expect(total(/^PRISE REFRIGERATEUR$/)).toBe(10);
    expect(total(/^ALIMENTATION HOTTE$/)).toBe(10);
    expect(total(/^PRISE LAVE-VAISSELLE$/)).toBe(4);
    expect(total(/^PRISE MACHINE A LAVER$/)).toBe(8);
    expect(total(/^PRISE SECHE-LINGE$/)).toBe(3);
    expect(total(/^ALIMENTATION CHAUFFE-EAU$/)).toBe(8);
    expect(total(/^TABLEAU GENERAL ELECTRIQUE HAGER/)).toBe(10);
    expect(total(/^PRISE DE TERRE$/)).toBe(10);
    expect(total(/^ALIMENTATION RADIATEUR$/)).toBe(59);
  });

  it("anonymisé : ni prix, ni nom, ni adresse ; chaque ligne a son repère, dans l'ordre", () => {
    expect(DEVIS_7954.map((l) => l.ref)).toEqual(DEVIS_7954.map((_, i) => String(i + 1)));
    for (const l of DEVIS_7954) expect(`${l.section} ${l.designation}`).not.toMatch(/€|\d+,\d{2}\s*$|RUE|SIRET|MORELLEC|CARLIER/i);
  });
});
