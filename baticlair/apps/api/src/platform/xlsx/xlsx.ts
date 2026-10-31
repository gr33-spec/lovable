import { deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * UN CLASSEUR EXCEL (.xlsx) SANS DÉPENDANCE (Greg, 28 octobre 2026, point 3 : le négoce exporte la demande en Excel, la
 * remplit, la redépose ; lue par le code, sans IA). Un .xlsx est un zip de XML : on l'écrit (feuilles, colonnes
 * protégées sauf celles à remplir, feuille cachée) et on le relit (chaînes partagées ou en ligne, nombres, formules par
 * leur valeur), tel qu'Excel, LibreOffice ou Numbers le sauvent. Tests : `test/xlsx.test.ts`.
 */

export type Cellule = string | number | null;

export interface FeuilleXlsx {
  nom: string;
  lignes: readonly (readonly Cellule[])[];
  /** Les colonnes (0 = A) que l'on peut remplir quand la feuille est protégée. */
  colonnesLibres?: readonly number[];
  protegee?: boolean;
  cachee?: boolean;
  /** Largeurs des colonnes, en caractères. */
  largeurs?: readonly number[];
  /** La première ligne en gras (en-tête). */
  enTete?: boolean;
}

/* --------------------------------------------------------------------------------------------------- le zip */
const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c;
}
export function crc32(buf: Uint8Array): number {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function zip(fichiers: readonly { nom: string; contenu: Buffer }[]): Buffer {
  const parties: Buffer[] = [];
  const centrale: Buffer[] = [];
  let offset = 0;
  for (const f of fichiers) {
    const nom = Buffer.from(f.nom, "utf8");
    const comprime = deflateRawSync(f.contenu);
    const crc = crc32(f.contenu);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprime.length, 18);
    local.writeUInt32LE(f.contenu.length, 22);
    local.writeUInt16LE(nom.length, 26);
    local.writeUInt16LE(0, 28);
    parties.push(local, nom, comprime);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(0x21, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comprime.length, 20);
    c.writeUInt32LE(f.contenu.length, 24);
    c.writeUInt16LE(nom.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(offset, 42);
    centrale.push(c, nom);
    offset += local.length + nom.length + comprime.length;
  }
  const cd = Buffer.concat(centrale);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(fichiers.length, 8);
  fin.writeUInt16LE(fichiers.length, 10);
  fin.writeUInt32LE(cd.length, 12);
  fin.writeUInt32LE(offset, 16);
  fin.writeUInt16LE(0, 20);
  return Buffer.concat([...parties, cd, fin]);
}

export function dezip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70_000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("zip : fin de répertoire introuvable");
  const n = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip : répertoire central corrompu");
    const methode = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nomLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nom = buf.subarray(p + 46, p + 46 + nomLen).toString("utf8");
    const lnom = buf.readUInt16LE(local + 26);
    const lextra = buf.readUInt16LE(local + 28);
    const debut = local + 30 + lnom + lextra;
    const donnees = buf.subarray(debut, debut + csize);
    if (methode === 0) out.set(nom, Buffer.from(donnees));
    else if (methode === 8) out.set(nom, inflateRawSync(donnees, { maxOutputLength: Math.max(usize, 1) * 4 + 1024 }));
    else throw new Error(`zip : méthode ${methode} non gérée`);
    p += 46 + nomLen + extraLen + commLen;
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ écrire */
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const colonne = (i: number) => {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function feuilleXml(f: FeuilleXlsx): string {
  const libres = new Set(f.colonnesLibres ?? []);
  const cellules: string[] = [];
  f.lignes.forEach((ligne, r) => {
    const cs = ligne
      .map((v, c) => {
        if (v === null || v === undefined || v === "") return "";
        const ref = `${colonne(c)}${r + 1}`;
        const style = f.enTete && r === 0 ? 2 : libres.has(c) ? 1 : 0;
        if (typeof v === "number") return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
        return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      })
      .join("");
    // Une cellule vide mais à remplir garde son style (déverrouillée) : Excel ne la laisse pas verrouillée.
    const vides = [...libres].filter((c) => !ligne[c] && ligne[c] !== 0 && r > 0).map((c) => `<c r="${colonne(c)}${r + 1}" s="1"/>`).join("");
    cellules.push(`<row r="${r + 1}">${cs}${vides}</row>`);
  });
  const cols = f.largeurs?.length ? `<cols>${f.largeurs.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const protection = f.protegee ? `<sheetProtection sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${cellules.join("")}</sheetData>${protection}</worksheet>`;
}

export function ecrireXlsx(feuilles: readonly FeuilleXlsx[]): Buffer {
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3B8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1" applyProtection="1"><protection locked="0"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${feuilles.map((f, i) => `<sheet name="${xml(f.nom)}" sheetId="${i + 1}"${f.cachee ? ' state="hidden"' : ""} r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${feuilles.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${feuilles.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${feuilles.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const racine = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  return zip([
    { nom: "[Content_Types].xml", contenu: Buffer.from(types) },
    { nom: "_rels/.rels", contenu: Buffer.from(racine) },
    { nom: "xl/workbook.xml", contenu: Buffer.from(workbook) },
    { nom: "xl/_rels/workbook.xml.rels", contenu: Buffer.from(rels) },
    { nom: "xl/styles.xml", contenu: Buffer.from(styles) },
    ...feuilles.map((f, i) => ({ nom: `xl/worksheets/sheet${i + 1}.xml`, contenu: Buffer.from(feuilleXml(f)) })),
  ]);
}

/* -------------------------------------------------------------------------------------------------- lire */
const desXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");
const texteDe = (fragment: string) => desXml([...fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]!).join(""));
export const indexColonne = (lettres: string) => [...lettres].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;

export interface FeuilleLue {
  nom: string;
  lignes: Cellule[][];
}

/** Le classeur tel qu'il est : chaque feuille, chaque ligne, chaque cellule (texte, nombre, ou null). */
export function lireXlsx(buf: Buffer): FeuilleLue[] {
  const fichiers = dezip(buf);
  const lire = (nom: string) => fichiers.get(nom)?.toString("utf8") ?? "";
  const partagees = [...lire("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texteDe(m[1]!));
  const rels = new Map([...lire("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => [/Id="([^"]+)"/.exec(m[1]!)?.[1] ?? "", /Target="([^"]+)"/.exec(m[1]!)?.[1] ?? ""]));
  const feuilles: FeuilleLue[] = [];
  for (const m of lire("xl/workbook.xml").matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = m[1]!;
    const nom = desXml(/name="([^"]*)"/.exec(attrs)?.[1] ?? "");
    const rid = /r:id="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const cible = (rels.get(rid) ?? "").replace(/^\/?(xl\/)?/, "");
    const x = lire(`xl/${cible}`);
    const lignes: Cellule[][] = [];
    for (const row of x.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      for (const c of row[1]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const a = c[1]!;
        const ref = /r="([A-Z]+)(\d+)"/.exec(a);
        if (!ref) continue;
        const col = indexColonne(ref[1]!);
        const r = Number(ref[2]) - 1;
        const type = /t="([^"]+)"/.exec(a)?.[1];
        const corps = c[2] ?? "";
        let valeur: Cellule = null;
        if (type === "s") valeur = partagees[Number(/<v>([\s\S]*?)<\/v>/.exec(corps)?.[1] ?? -1)] ?? null;
        else if (type === "inlineStr") valeur = texteDe(corps);
        else if (type === "str" || type === "e") valeur = desXml(/<v>([\s\S]*?)<\/v>/.exec(corps)?.[1] ?? "");
        else if (type === "b") valeur = /<v>1<\/v>/.test(corps) ? "oui" : "non";
        else {
          const v = /<v>([\s\S]*?)<\/v>/.exec(corps)?.[1];
          const formule = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(corps)?.[1];
          // Une formule sans valeur calculée (un tableur qui n'évalue pas) se lit comme son texte : illisible, pas vide.
          valeur = v === undefined || v === "" ? (formule ? `=${desXml(formule)}` : null) : Number(v);
          if (typeof valeur === "number" && Number.isNaN(valeur)) valeur = desXml(v!);
        }
        while (lignes.length <= r) lignes.push([]);
        lignes[r]![col] = valeur;
      }
    }
    feuilles.push({ nom, lignes: lignes.map((l) => Array.from(l, (v) => v ?? null)) });
  }
  return feuilles;
}
