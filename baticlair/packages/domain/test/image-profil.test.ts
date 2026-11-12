/**
 * L'IMAGE DU PROFIL MISSIONS (Greg, 12 novembre 2026, dossier de corrections UX, point 12) : le type réel du fichier,
 * son poids, sa forme carrée, sa taille, et le retrait des métadonnées sensibles (lieu, appareil, commentaire).
 */
import { describe, expect, it } from "vitest";
import { IMAGE_PROFIL_MAX_OCTETS, nettoyerImageProfil } from "../src/missions/image-profil.js";
import { jpeg, png } from "./images-profil.js";

const enTexte = (o: Uint8Array) => Buffer.from(o).toString("latin1");

describe("image du profil Missions", () => {
  it("JPEG carré : gardé, sans EXIF ni commentaire, l'image elle-même intacte", () => {
    const r = nettoyerImageProfil(jpeg(512, 512));
    if ("faute" in r) throw new Error(r.faute);
    expect(r.type).toBe("image/jpeg");
    expect(r.cote).toBe(512);
    const t = enTexte(r.contenu);
    expect(t).not.toMatch(/Exif|GPS|iPhone|Dupont|Ajoncs/);
    expect(t).toContain("JFIF");
    expect([...r.contenu.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect([...r.contenu.subarray(-5)]).toEqual([0x12, 0x34, 0x56, 0xff, 0xd9]);
    // Nettoyer une image déjà propre ne change plus rien.
    const encore = nettoyerImageProfil(r.contenu);
    expect("faute" in encore ? null : [...encore.contenu]).toEqual([...r.contenu]);
  });

  it("PNG carré : gardé, sans texte ni EXIF", () => {
    const r = nettoyerImageProfil(png(256, 256));
    if ("faute" in r) throw new Error(r.faute);
    expect(r.type).toBe("image/png");
    expect(r.cote).toBe(256);
    const t = enTexte(r.contenu);
    expect(t).not.toMatch(/tEXt|eXIf|Greg|GPS|06 12/);
    expect(t).toMatch(/IHDR[\s\S]*IDAT[\s\S]*IEND/);
  });

  it("refus : vide, trop lourde, autre chose qu'une image (même renommée), illisible, pas carrée, trop petite ou trop grande", () => {
    const faute = (o: Uint8Array) => {
      const r = nettoyerImageProfil(o);
      return "faute" in r ? r.faute : null;
    };
    expect(faute(new Uint8Array())).toBe("vide");
    expect(faute(new Uint8Array(IMAGE_PROFIL_MAX_OCTETS + 1).fill(0xff))).toBe("trop_lourde");
    expect(faute(new Uint8Array(Buffer.from("%PDF-1.4 faux logo.jpg")))).toBe("type");
    expect(faute(new Uint8Array(Buffer.from("<svg onload=alert(1)>")))).toBe("type");
    expect(faute(new Uint8Array(Buffer.from("GIF89a....")))).toBe("type");
    expect(faute(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2]))).toBe("illisible");
    expect(faute(png(256, 256).subarray(0, 40))).toBe("illisible");
    expect(faute(jpeg(640, 480))).toBe("carree");
    expect(faute(png(300, 200))).toBe("carree");
    expect(faute(jpeg(64, 64))).toBe("dimensions");
    expect(faute(png(2048, 2048))).toBe("dimensions");
  });
});
