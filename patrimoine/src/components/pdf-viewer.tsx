"use client";

import { openOverlay } from "@/lib/nav";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, LoaderCircle, Minus, Plus, Share, X } from "lucide-react";

// Visionneuse intégrée : dans l'application installée sur l'iPhone, un PDF
// ouvert « normalement » occupe tout l'écran sans bouton pour revenir. Ici le
// document s'affiche dans l'application, avec Fermer, Partager et Télécharger.

interface Doc {
  url: string;
  fileName: string;
}

let current: Doc | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Fichiers téléchargés plutôt qu'affichés (Excel, sauvegarde). */
const DOWNLOADS = [/^\/api\/export-excel/, /^\/api\/backup/];

/** Ouvre un document de l'application : PDF et images dans la visionneuse, le reste en téléchargement. */
export function openDocument(url: string, fileName?: string) {
  if (DOWNLOADS.some((r) => r.test(url))) {
    void downloadFile(url, fileName);
    return;
  }
  current = { url, fileName: fileName ?? guessName(url) };
  emit();
}

function closeDocument() {
  current = null;
  emit();
}

function guessName(url: string): string {
  if (url.startsWith("/api/dossier-banque")) return "Dossier banque.pdf";
  if (url.includes("type=revision")) return "Revision du loyer.pdf";
  if (url.includes("type=quittance")) return "Quittance.pdf";
  if (url.includes("type=bail")) return "Bail.pdf";
  return "Document.pdf";
}

function nameFromResponse(res: Response, fallback: string): string {
  const cd = res.headers.get("Content-Disposition") ?? "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  return m ? decodeURIComponent(m[1]) : fallback;
}

/** Partage (feuille iOS : Mail, Messages, Fichiers…) ou téléchargement d'un fichier. */
export async function shareOrDownload(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
    } catch {
      /* partage annulé */
    }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

export async function downloadFile(url: string, fileName?: string) {
  const res = await fetch(url);
  if (!res.ok) return;
  await shareOrDownload(await res.blob(), nameFromResponse(res, fileName ?? "export"));
}

export function PdfViewerHost() {
  const doc = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  if (!doc) return null;
  return <Viewer key={doc.url} doc={doc} />;
}

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvas: HTMLCanvasElement; viewport: unknown }) => { promise: Promise<void>; cancel: () => void } };

function Viewer({ doc }: { doc: Doc }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [name, setName] = useState(doc.fileName);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);

  // Retour arrière (geste iOS, bouton Android) : ferme la visionneuse.
  useEffect(() => {
    const release = openOverlay(() => closeDocument());
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDocument();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    // Tâche de chargement pdf.js : c'est elle qui libère le document et son worker.
    let task: { destroy: () => unknown } | null = null;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const res = await fetch(doc.url);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Document indisponible");
        }
        const b = await res.blob();
        if (!alive) return;
        setBlob(b);
        setName(nameFromResponse(res, doc.fileName));
        if (b.type.startsWith("image/")) {
          objectUrl = URL.createObjectURL(b);
          setImage(objectUrl);
          return;
        }
        // Version « legacy » : compatible avec les navigateurs plus anciens (iPhone compris).
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const loading = pdfjs.getDocument({ data: new Uint8Array(await b.arrayBuffer()), enableXfa: false });
        task = loading;
        const loaded = (await loading.promise) as unknown as PdfDoc;
        if (alive) setPdf(loaded);
      } catch (e) {
        if (alive) setError((e as Error).message || "Document illisible");
      }
    })();
    return () => {
      alive = false;
      void Promise.resolve(task?.destroy()).catch(() => undefined);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.url, doc.fileName]);

  const close = () => closeDocument();

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#1f2530]" role="dialog" aria-modal="true" aria-label={name}>
      <div className="safe-top shrink-0 bg-[#1f2530]/95 text-white backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={close} className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[15px] font-semibold active:bg-white/20">
            <X size={18} /> Fermer
          </button>
          <div className="min-w-0 flex-1 truncate px-1 text-center text-[14px] font-medium text-white/85">{name}</div>
          {pdf && (
            <div className="hidden items-center gap-1 sm:flex">
              <button aria-label="Réduire" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20">
                <Minus size={17} />
              </button>
              <button aria-label="Agrandir" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20">
                <Plus size={17} />
              </button>
            </div>
          )}
          <button
            aria-label="Partager ou enregistrer"
            disabled={!blob}
            onClick={() => blob && shareOrDownload(blob, name)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20 disabled:opacity-40"
          >
            {typeof navigator !== "undefined" && "share" in navigator ? <Share size={18} /> : <Download size={18} />}
          </button>
        </div>
      </div>

      <div ref={scroller} className="flex-1 overflow-auto overscroll-contain" onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}>
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
            <div className="text-[16px] font-semibold">{error}</div>
            <button onClick={close} className="rounded-full bg-white/15 px-4 py-2 text-[14px] font-semibold text-white">
              Fermer
            </button>
          </div>
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element -- fichier local (blob)
          <img src={image} alt={name} className="mx-auto block max-w-full p-3" />
        ) : !pdf ? (
          <div className="flex h-full items-center justify-center text-white/70">
            <LoaderCircle size={28} className="animate-spin" />
          </div>
        ) : (
          <div className="mx-auto flex flex-col items-center gap-3 px-2 py-3 pb-10" style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? 900 : undefined }}>
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <PageCanvas key={i} pdf={pdf} n={i + 1} zoom={zoom} />
            ))}
          </div>
        )}
      </div>
      {pdf && <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11.5px] text-white/45">{pdf.numPages} page{pdf.numPages > 1 ? "s" : ""} · toucher deux fois pour agrandir</div>}
    </div>
  );
}

function PageCanvas({ pdf, n, zoom }: { pdf: PdfDoc; n: number; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    let task: { cancel: () => void } | null = null;
    (async () => {
      const page = await pdf.getPage(n);
      const canvas = ref.current;
      if (!alive || !canvas) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      // Rendu net : largeur affichée × densité de l'écran.
      const width = (canvas.parentElement?.clientWidth ?? 800) * Math.min(3, window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: width / base.width });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const t = page.render({ canvas, viewport });
      task = t;
      await t.promise;
    })().catch((e) => {
      if ((e as Error)?.name !== "RenderingCancelledException") console.error("Affichage du PDF", e);
    });
    return () => {
      alive = false;
      task?.cancel();
    };
  }, [pdf, n, zoom]);
  return (
    <div className="w-full">
      <canvas ref={ref} className="block w-full rounded-sm bg-white shadow-lg" style={ratio ? { aspectRatio: `1 / ${ratio}` } : { aspectRatio: "1 / 1.414" }} />
    </div>
  );
}
