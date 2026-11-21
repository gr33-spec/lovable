import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colonne, crc32, dezip, ecrireXlsx, indexColonne, lireXlsx } from "../src/platform/xlsx/xlsx.js";

/**
 * LE CLASSEUR EXCEL SANS DÉPENDANCE (Greg, 28 octobre 2026, point 3) : ce qu'on écrit se relit tel quel ; ce qu'un vrai
 * tableur écrit (openpyxl, chaînes partagées) se lit aussi ; les colonnes protégées et la feuille cachée sont là.
 */
describe("le classeur .xlsx", () => {
  it("écrit puis relit : feuilles, textes, nombres, cellules vides, feuille cachée", () => {
    const buf = ecrireXlsx([
      { nom: "Demande", enTete: true, protegee: true, colonnesLibres: [4, 5], largeurs: [16, 40, 10, 10, 16, 14], lignes: [["Référence", "Désignation", "Quantité", "Unité", "Prix unitaire HT", "Disponible (oui/non)"], ["ardoise:32x22", "Ardoise 32×22 Espagne 1er choix", 2700, "pièces", null, null], ["liteau:27x38", "Liteaux 27×38 & co", 400, "m", 0.62, "oui"]] },
      { nom: "Conditions", lignes: [["Livraison incluse"], ["Délai : 10 jours"]] },
      { nom: "_mobiiz", cachee: true, lignes: [["id-de-test-123"]] },
    ]);
    expect(buf.subarray(0, 4).readUInt32LE(0)).toBe(0x04034b50);
    const f = lireXlsx(buf);
    expect(f.map((x) => x.nom)).toEqual(["Demande", "Conditions", "_mobiiz"]);
    expect(f[0]!.lignes[1]).toEqual(["ardoise:32x22", "Ardoise 32×22 Espagne 1er choix", 2700, "pièces", null, null]);
    expect(f[0]!.lignes[2]).toEqual(["liteau:27x38", "Liteaux 27×38 & co", 400, "m", 0.62, "oui"]);
    expect(f[2]!.lignes[0]).toEqual(["id-de-test-123"]);
    const entrees = dezip(buf);
    expect(entrees.get("xl/worksheets/sheet1.xml")!.toString("utf8")).toContain("sheetProtection");
    expect(entrees.get("xl/workbook.xml")!.toString("utf8")).toContain('state="hidden"');
  });
  it("colonnes et CRC", () => {
    expect([colonne(0), colonne(25), colonne(26), colonne(27)]).toEqual(["A", "Z", "AA", "AB"]);
    expect([indexColonne("A"), indexColonne("Z"), indexColonne("AA")]).toEqual([0, 25, 26]);
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });
  it("lit un classeur rempli par un vrai tableur (openpyxl : chaînes partagées, nombres, formule), quand il est là", () => {
    let python: string | null = "/usr/bin/python3";
    try {
      execFileSync(python, ["-c", "import openpyxl"], { stdio: "ignore" });
    } catch {
      python = null;
    }
    if (!python) return;
    const dir = mkdtempSync(path.join(tmpdir(), "xlsx-"));
    const gabarit = path.join(dir, "gabarit.xlsx");
    writeFileSync(gabarit, ecrireXlsx([{ nom: "Demande", enTete: true, protegee: true, colonnesLibres: [4, 5], lignes: [["Référence", "Désignation", "Quantité", "Unité", "Prix unitaire HT", "Disponible (oui/non)"], ["ardoise:32x22", "Ardoise", 2700, "pièces", null, null], ["liteau:27x38", "Liteaux", 400, "m", null, null]] }, { nom: "_mobiiz", cachee: true, lignes: [["id-xyz"]] }]));
    const rempli = path.join(dir, "rempli.xlsx");
    execFileSync(python, ["-I", "-c", `
import openpyxl
wb = openpyxl.load_workbook(${JSON.stringify(gabarit)})
ws = wb["Demande"]
ws["E2"] = 1.1
ws["F2"] = "oui"
ws["E3"] = "=0.31*2"
ws["F3"] = "non"
wb.save(${JSON.stringify(rempli)})
`]);
    const f = lireXlsx(readFileSync(rempli));
    const demande = f.find((x) => x.nom === "Demande")!;
    expect(demande.lignes[0]!.slice(0, 2)).toEqual(["Référence", "Désignation"]);
    expect(demande.lignes[1]!.slice(0, 6)).toEqual(["ardoise:32x22", "Ardoise", 2700, "pièces", 1.1, "oui"]);
    // Une formule sans valeur calculée (openpyxl n'évalue pas) se lit comme texte : « illisible » pour le prix.
    expect(typeof demande.lignes[2]![4]).toBe("string");
    expect(f.find((x) => x.nom === "_mobiiz")!.lignes[0]![0]).toBe("id-xyz");
  });
});
