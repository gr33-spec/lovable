import type * as PdfJsModule from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PdfContent, PdfPageContent } from "../domain/document.js";
import { PdfReadError, type PdfReader } from "../application/pdf-reader.js";

/** Fragment de texte positionné, tel que fourni par pdf.js. */
interface TextFragment {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type PdfJs = typeof PdfJsModule;

/** Erreurs de pdf.js qui mettent en cause le contenu du fichier. */
const FILE_ERRORS = new Set(["InvalidPDFException", "FormatError", "MissingPDFException", "UnknownErrorException"]);
let pdfjs: Promise<PdfJs> | undefined;

/**
 * Charge pdf.js une seule fois. Le « worker » est importé explicitement et
 * exposé à pdf.js : pas de chargement dynamique de fichier à l'exécution
 * (compatible avec les fonctions serverless, qui n'embarquent que ce qui
 * est importé).
 */
function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= (async () => {
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
    return import("pdfjs-dist/legacy/build/pdf.mjs");
  })();
  return pdfjs;
}

/**
 * Reconstitue les lignes d'une page : fragments regroupés par hauteur (même
 * ligne visuelle), puis triés de gauche à droite. Un grand espace entre
 * deux fragments (colonne de tableau) devient deux espaces, pour que les
 * colonnes restent distinctes.
 */
export function fragmentsToLines(fragments: readonly TextFragment[]): string[] {
  const items = fragments.filter((f) => f.str.trim().length > 0);
  if (items.length === 0) return [];
  const byTop = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextFragment[][] = [];
  for (const f of byTop) {
    const row = rows.at(-1);
    const ref = row?.[0];
    // Même ligne si l'écart vertical est inférieur à la moitié de la hauteur du texte.
    const tolerance = Math.max(2, Math.min(f.height || 10, ref?.height || 10) * 0.5);
    if (row && ref && Math.abs(ref.y - f.y) <= tolerance) row.push(f);
    else rows.push([f]);
  }
  return rows.map((row) => {
    const sorted = row.sort((a, b) => a.x - b.x);
    let line = "";
    let end = -Infinity;
    for (const f of sorted) {
      const gap = f.x - end;
      if (line.length > 0) line += gap > Math.max(6, (f.height || 10) * 1.2) ? "  " : gap > 0.5 ? " " : "";
      line += f.str;
      end = f.x + f.width;
    }
    return line.replace(/\s+$/, "");
  });
}

export class PdfJsPdfReader implements PdfReader {
  async read(bytes: Uint8Array, options: { maxPages: number }): Promise<PdfContent> {
    const lib = await loadPdfJs();
    // pdf.js prend possession du tampon : on lui donne une copie.
    const task = lib.getDocument({
      data: new Uint8Array(bytes),
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    });
    let doc: Awaited<typeof task.promise>;
    try {
      doc = await task.promise;
    } catch (error) {
      const name = (error as { name?: string }).name;
      if (name === "PasswordException") throw new PdfReadError("encrypted", "PDF protégé par un mot de passe");
      // Seules les erreurs qui décrivent le fichier le déclarent abîmé ; les
      // autres (pdf.js indisponible, mémoire…) sont des pannes de notre côté.
      if (name && FILE_ERRORS.has(name)) throw new PdfReadError("corrupted", `PDF illisible : ${name}`);
      throw error;
    }
    try {
      if (doc.numPages > options.maxPages) {
        throw new PdfReadError("too_many_pages", `${doc.numPages} pages (maximum ${options.maxPages})`);
      }
      const pages: PdfPageContent[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const fragments: TextFragment[] = [];
        for (const item of content.items) {
          if (!("str" in item)) continue;
          fragments.push({
            str: item.str,
            x: item.transform[4] as number,
            y: item.transform[5] as number,
            width: item.width,
            height: item.height,
          });
        }
        pages.push({
          pageNumber: n,
          widthPt: Math.round(viewport.width * 100) / 100,
          heightPt: Math.round(viewport.height * 100) / 100,
          lines: fragmentsToLines(fragments),
        });
        page.cleanup();
      }
      return { pageCount: doc.numPages, pages };
    } finally {
      await doc.destroy();
    }
  }
}
