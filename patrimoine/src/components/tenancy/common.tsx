"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Eraser, FileText, Loader2, Share, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { leaseVersionFor, type LegalVersion } from "@/lib/legal/versions";
import { useStore } from "@/lib/store";
import { cx } from "../ui";
import { openDocument } from "../pdf-viewer";

// ——— Signature manuscrite à l'écran ———

export function SignaturePad({ value, onChange, label }: { value?: string; onChange: (v: string | undefined) => void; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b2545";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const save = () => {
    const c = ref.current;
    if (!c || !dirty.current) return;
    // Export réduit (PNG ~10 Ko) pour ne pas alourdir les données.
    const out = document.createElement("canvas");
    out.width = 480;
    out.height = Math.round((480 * c.height) / c.width);
    out.getContext("2d")!.drawImage(c, 0, 0, out.width, out.height);
    onChange(out.toDataURL("image/png"));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1 text-[13px] font-medium text-ink-2">
        <span>{label}</span>
        {value && (
          <button
            type="button"
            onClick={() => {
              const c = ref.current!;
              c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
              dirty.current = false;
              setDrawn(false);
              onChange(undefined);
            }}
            className="flex items-center gap-1 text-series-1"
          >
            <Eraser size={14} /> Effacer
          </button>
        )}
      </div>
      <div className="relative h-36 overflow-hidden rounded-2xl border border-line bg-card">
        {value && !drawn && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Signature enregistrée" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        )}
        <canvas
          ref={ref}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={(e) => {
            drawing.current = true;
            dirty.current = true;
            setDrawn(true);
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            const ctx = ref.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = ref.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.lineTo(x, y);
            ctx.stroke();
          }}
          onPointerUp={() => {
            drawing.current = false;
            save();
          }}
        />
        {!value && <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-muted">Signez avec le doigt</div>}
      </div>
    </div>
  );
}

// ——— Photos (compressées dans le navigateur, stockées côté serveur) ———

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Photo illisible"))), "image/jpeg", 0.8));
}

export async function uploadPhoto(file: File): Promise<string> {
  const blob = await compress(file);
  const init = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name.replace(/\.\w+$/, ".jpg"), size: blob.size, mime: "image/jpeg" }),
  });
  const meta = await init.json();
  if (!init.ok) throw new Error(meta.error ?? "Envoi impossible");
  const res = await fetch(`/api/files/${meta.id}?i=0`, { method: "PUT", body: blob });
  if (!res.ok) throw new Error("Envoi interrompu");
  return meta.id as string;
}

export function PhotoStrip({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ids.map((id) => (
        <div key={id} className="relative h-16 w-16 overflow-hidden rounded-xl bg-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${id}`} alt="Photo" className="h-full w-full object-cover" />
          <button type="button" aria-label="Retirer la photo" onClick={() => onChange(ids.filter((x) => x !== id))} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
            <X size={12} />
          </button>
        </div>
      ))}
      <label className={cx("flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line text-[10px] text-muted", busy && "opacity-50")}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
        Photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (!files.length) return;
            setBusy(true);
            setError(null);
            try {
              const added: string[] = [];
              for (const f of files) added.push(await uploadPhoto(f));
              onChange([...ids, ...added]);
            } catch (err) {
              setError((err as Error).message);
            }
            setBusy(false);
          }}
        />
      </label>
      {error && <span className="text-xs text-neg">{error}</span>}
    </div>
  );
}

// ——— Documents PDF ———

export function documentUrl(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  return `/api/documents?${q.toString()}`;
}

/** Partage du PDF (feuille de partage iOS : Mail, Messages, AirDrop…), sinon ouverture. */
export async function sharePdf(url: string, fileName: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return j.error ?? "Document indisponible";
  }
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return null;
    } catch {
      return null;
    }
  }
  openDocument(url, fileName);
  return null;
}

export function DocRow({
  title,
  subtitle,
  url,
  fileName,
  status,
  tone = "neutral",
  action,
}: {
  title: string;
  subtitle?: string;
  url?: string;
  fileName?: string;
  status?: string;
  tone?: "neutral" | "pos" | "warn";
  action?: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const buttons = (action || url) && (
    <div className="flex shrink-0 items-center gap-1.5">
      {action}
      {url && (
        <>
          <button type="button" onClick={() => openDocument(url, fileName)} className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-navy">
            PDF
          </button>
          <button
            type="button"
            aria-label="Envoyer"
            onClick={async () => setError(await sharePdf(url, fileName ?? "document.pdf"))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-navy"
          >
            <Share size={15} />
          </button>
        </>
      )}
    </div>
  );
  // Plusieurs boutons : ils passent sous le titre pour ne pas le tronquer.
  const stacked = !!action && !!url;
  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft text-navy">
          <FileText size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium leading-snug text-ink">{title}</div>
          {(subtitle || status) && (
            <div className="text-[13px] leading-snug text-muted">
              {status && <span className={cx("font-semibold", tone === "pos" ? "text-pos" : tone === "warn" ? "text-warn" : "")}>{status}</span>}
              {status && subtitle ? " · " : ""}
              {subtitle}
            </div>
          )}
        </div>
        {!stacked && buttons}
      </div>
      {stacked && <div className="mt-2 flex justify-end pl-[52px]">{buttons}</div>}
      {error && <div className="mt-1 pl-[52px] text-xs text-neg">{error}</div>}
    </div>
  );
}

/** Rappel du modèle juridique appliqué et de son état de vérification. */
export function LegalBadge({ refDate }: { refDate?: string }) {
  const v: LegalVersion = leaseVersionFor(refDate);
  const { role } = useStore();
  return (
    <Link href={role === "gestion" ? "#" : "/plus/cadre-juridique"} className={cx("flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[12px]", v.verified ? "bg-pos/10 text-pos" : "bg-warn/10 text-warn")}>
      <ShieldAlert size={15} className="mt-0.5 shrink-0" />
      <span>
        <b>{v.id === "nue-2026" ? "Bail modèle 2026" : "Bail modèle 2015"}</b> — {v.label}.{" "}
        {v.verified ? "Rédaction vérifiée." : "Rédaction à contrôler avec le texte officiel avant signature."}
      </span>
    </Link>
  );
}
