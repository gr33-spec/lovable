/**
 * PHOTOS PAR DÉFAUT (Greg, 17 novembre 2026) : chaque métier a sa vraie photo, une entreprise de plusieurs métiers prend
 * la photo neutre, le choix dans la galerie passe devant, et le crédit suit la licence.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTOS_DEFAUT, photoDefautDe, photoPubliqueDefaut, photosNeutres, TRADES } from "../src/index.js";

const PUBLIC = join(__dirname, "../../../apps/web/public");

describe("photos par défaut", () => {
  it("une photo par métier du catalogue, sinon la neutre", () => {
    for (const t of TRADES) {
      const p = photoDefautDe(null, [t.id]);
      expect(p, t.id).not.toBeNull();
    }
    expect(photoDefautDe(null, ["roofing"])?.id).toBe("roofing");
    expect(photoDefautDe(null, ["electrical"])?.id).toBe("electrical");
    expect(photoDefautDe(null, ["drywall"])?.id).toBe("drywall");
    expect(photoDefautDe(null, ["interior_joinery"])?.id).toBe("joinery");
    expect(photoDefautDe(null, ["hvac"])?.metier).toBeNull();
  });

  it("plusieurs métiers : la photo neutre du bâtiment ; le métier principal répété n'en fait qu'un", () => {
    expect(photoDefautDe(null, ["roofing", "painting"])?.id).toBe(photosNeutres()[0]!.id);
    expect(photoDefautDe(null, ["roofing", "roofing", "other"])?.id).toBe("roofing");
    expect(photoDefautDe(null, [])?.metier).toBeNull();
  });

  it("le choix de la galerie passe devant ; un choix inconnu est ignoré", () => {
    expect(photoDefautDe("neutre-3", ["roofing"])?.id).toBe("neutre-3");
    expect(photoDefautDe("inconnue", ["roofing"])?.id).toBe("roofing");
  });

  it("au moins quatre neutres ; chaque fichier existe en WebP et AVIF, 800 et grand", () => {
    expect(photosNeutres().length).toBeGreaterThanOrEqual(4);
    for (const p of PHOTOS_DEFAUT) {
      for (const v of photoPubliqueDefaut(p).variantes) {
        expect(existsSync(join(PUBLIC, v.webp)), v.webp).toBe(true);
        expect(existsSync(join(PUBLIC, v.avif)), v.avif).toBe(true);
      }
      expect(p.largeur).toBeGreaterThanOrEqual(1600);
    }
  });

  it("identifiants uniques ; un crédit nomme l'auteur et la licence", () => {
    expect(new Set(PHOTOS_DEFAUT.map((p) => p.id)).size).toBe(PHOTOS_DEFAUT.length);
    for (const p of PHOTOS_DEFAUT) if (p.credit) expect(p.credit).toMatch(/CC BY/);
  });
});
