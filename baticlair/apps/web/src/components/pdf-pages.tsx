"use client";

import { useEffect, useRef, useState } from "react";

/** Une page rendue : l'image et sa taille réelle (points PDF). */
interface Rendered {
  url: string;
  width: number;
  height: number;
}

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjs: Promise<PdfJs> | undefined;
/** pdf.js, chargé une fois, sans fichier « worker » à servir : le même montage que la lecture côté API. */
function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= (async () => {
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
    return import("pdfjs-dist/legacy/build/pdf.mjs");
  })();
  return pdfjs;
}

const MAX_ZOOM = 4;

/**
 * LE PDF EN ENTIER (retour du fondateur, 2026-10-11 : « quand le PDF s'ouvre, qu'on le voie en entier ; on zoome si on
 * veut plus grand »). Sur iPhone, le PDF dans un cadre s'ouvrait à sa taille réelle, coupé à droite. Ici chaque page est
 * dessinée à la taille de l'écran, entière en largeur et en hauteur ; deux doigts zooment, un double tap aussi.
 * Si le dessin échoue, `onError` rend la main à l'afficheur du téléphone.
 */
export function PdfPages({ file, title, onError }: { file: Blob; title: string; onError: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Rendered[] | null>(null);
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const lastTap = useRef(0);

  // La place disponible, suivie si l'écran tourne.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setFit({ w: el.clientWidth - 16, h: el.clientHeight - 16 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    void (async () => {
      try {
        const lib = await loadPdfJs();
        const task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        const doc = await task.promise;
        const out: Rendered[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          // Assez fin pour rester net quand on zoome : jusqu'à 3 fois la largeur d'un téléphone.
          const scale = Math.min(3, (1200 * Math.min(window.devicePixelRatio || 1, 2)) / 2 / base.width) || 1;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (!blob) throw new Error("page");
          const url = URL.createObjectURL(blob);
          urls.push(url);
          out.push({ url, width: base.width, height: base.height });
          if (cancelled) return;
        }
        await task.destroy();
        if (!cancelled) setPages(out);
      } catch {
        if (!cancelled) onError();
      }
    })();
    return () => {
      cancelled = true;
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [file, onError]);

  const distance = (t: React.TouchList) => Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY);

  const ready = pages && fit;
  return (
    <div
      ref={box}
      aria-label={title}
      className="h-full w-full overflow-auto overscroll-contain [touch-action:pan-x_pan-y]"
      onTouchStart={(e) => {
        if (e.touches.length === 2) pinch.current = { distance: distance(e.touches), zoom };
        else if (e.touches.length === 1) {
          const now = Date.now();
          if (now - lastTap.current < 300) setZoom((z) => (z > 1 ? 1 : 2.5));
          lastTap.current = now;
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 2 || !pinch.current) return;
        const next = (pinch.current.zoom * distance(e.touches)) / pinch.current.distance;
        setZoom(Math.min(MAX_ZOOM, Math.max(1, next)));
      }}
      onTouchEnd={() => {
        pinch.current = null;
      }}
    >
      {!ready ? (
        <div className="flex h-full items-center justify-center">
          <span className="size-8 animate-spin rounded-full border-4 border-white/30 border-t-white" aria-label="Chargement du document" />
        </div>
      ) : (
        <div className="flex min-h-full flex-col items-center justify-center gap-3 p-2" style={{ width: zoom > 1 ? `${zoom * 100}%` : undefined }}>
          {pages.map((p, i) => {
            // En entier : la page tient dans la largeur ET dans la hauteur de l'écran.
            const w = Math.min(fit.w, (fit.h * p.width) / p.height) * zoom;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.url}
                src={p.url}
                alt={`Page ${i + 1}`}
                draggable={false}
                className="shrink-0 rounded-lg bg-white shadow-card select-none"
                style={{ width: w, height: (w * p.height) / p.width }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
