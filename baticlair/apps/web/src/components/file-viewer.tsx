"use client";

import { Download, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getActiveCompanyId } from "@/lib/api";
import { OPEN_FILE_EVENT, type OpenFileRequest } from "@/lib/open-document";

type Loaded = OpenFileRequest & { objectUrl: string; file: File };

/** Une réponse de l'API ne dépasse pas 4,5 Mo chez l'hébergeur : un gros fichier se relit par plages de 3 Mo. */
const RANGE_BYTES = 3_000_000;

async function fetchWhole(url: string, headers: Record<string, string>): Promise<Blob> {
  const get = async (start: number) => {
    const res = await fetch(url, { headers: { ...headers, range: `bytes=${start}-${start + RANGE_BYTES - 1}` }, credentials: "same-origin" });
    if (!res.ok) throw new Error(String(res.status));
    return res;
  };
  const first = await get(0);
  const total = Number(/\/(\d+)$/.exec(first.headers.get("content-range") ?? "")?.[1]);
  // 200 : le fichier entier d'un coup (document généré, petit fichier).
  if (first.status !== 206 || !total) return first.blob();
  const type = first.headers.get("content-type") ?? "";
  const pieces: Blob[] = [await first.blob()];
  for (let at = RANGE_BYTES; at < total; at += RANGE_BYTES) pieces.push(await (await get(at)).blob());
  return new Blob(pieces, { type });
}

/**
 * L'AFFICHEUR DE DOCUMENTS : le PDF ou la photo s'ouvre par-dessus l'écran, avec une barre qui ne disparaît jamais :
 * « Fermer » en haut, « Partager » (Mail, WhatsApp, Fichiers… : la feuille de partage du téléphone) et « Télécharger »
 * en bas. On ne reste jamais coincé dans un PDF.
 */
export function FileViewer() {
  const [request, setRequest] = useState<OpenFileRequest | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);

  const close = useCallback(() => {
    setRequest(null);
    setError(false);
    setLoaded((current) => {
      if (current) URL.revokeObjectURL(current.objectUrl);
      return null;
    });
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenFileRequest>).detail;
      setLoaded((current) => {
        if (current) URL.revokeObjectURL(current.objectUrl);
        return null;
      });
      setError(false);
      setRequest(detail);
    };
    window.addEventListener(OPEN_FILE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FILE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    const headers: Record<string, string> = {};
    const companyId = getActiveCompanyId();
    if (companyId) headers["x-company-id"] = companyId;
    fetchWhole(request.url, headers)
      .then((blob) => {
        if (cancelled) return;
        const file = new File([blob], request.fileName, { type: blob.type || "application/pdf" });
        setLoaded({ ...request, objectUrl: URL.createObjectURL(file), file });
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, close]);

  if (!request) return null;
  const isImage = loaded?.file.type.startsWith("image/");
  const canShare = loaded && typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [loaded.file] });
  const share = async () => {
    if (!loaded) return;
    try {
      await navigator.share({ files: [loaded.file], title: loaded.title });
    } catch {
      // Partage annulé par l'artisan : rien à faire.
    }
  };
  const bar = "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-extrabold";

  return (
    <div role="dialog" aria-modal="true" aria-label={request.title} className="fixed inset-0 z-[60] flex flex-col bg-ink/95">
      <div className="flex items-center gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2 text-white">
        <button type="button" onClick={close} aria-label="Fermer le document" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/15 px-4 text-[15px] font-bold active:bg-white/25">
          <X size={20} aria-hidden="true" />
          Fermer
        </button>
        <span className="min-w-0 grow truncate text-right text-sm font-semibold text-white/80">{request.title}</span>
      </div>
      <div className="flex min-h-0 grow items-stretch justify-center px-2">
        {error ? (
          <p role="alert" className="self-center px-6 text-center text-white">
            Le document n&apos;a pas pu s&apos;ouvrir. Vérifiez la connexion et réessayez.
          </p>
        ) : !loaded ? (
          <span className="size-8 animate-spin self-center rounded-full border-4 border-white/30 border-t-white" aria-label="Chargement du document" />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loaded.objectUrl} alt={loaded.title} className="max-h-full max-w-full self-center rounded-xl object-contain" />
        ) : (
          <iframe title={loaded.title} src={loaded.objectUrl} className="h-full w-full max-w-3xl rounded-xl bg-white" />
        )}
      </div>
      <div className="flex gap-2 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        {canShare ? (
          <button type="button" onClick={() => void share()} className={`${bar} bg-white/15 text-white active:bg-white/25`}>
            <Share2 size={18} aria-hidden="true" />
            Partager
          </button>
        ) : null}
        {loaded ? (
          <a href={loaded.objectUrl} download={loaded.fileName} className={`${bar} bg-cta text-white`}>
            <Download size={18} aria-hidden="true" />
            Télécharger
          </a>
        ) : null}
      </div>
    </div>
  );
}
