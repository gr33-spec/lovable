"use client";

import { Camera, Check, PenLine } from "lucide-react";
import { useRef, useState } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, type OrderGap, type PriceRequest } from "@/lib/api";
import { shortName } from "@/lib/labels";
import { isPhoto, MAX_QUOTE_PHOTOS, preparePhotos } from "@/lib/photos";
import { attachFile } from "@/lib/upload";

function toError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError("internal_error", 500);
}

const GAP_TEXT: Record<Exclude<OrderGap["kind"], "same">, string> = {
  changed: "quantité changée",
  removed: "pas commandé",
  added: "ajouté",
};

/**
 * §47.5 RETOUR FOURNISSEUR, sous l'offre retenue : d'un tap, « commandé tel quel » ou « modifié ». Modifié, l'artisan
 * colle son bon de commande ou le prend en photo ; les écarts avec la liste envoyée vont au journal des corrections
 * (« bon de commande ») et serviront à corriger les calculs. Une seule réponse par demande.
 */
export function OrderFeedbackBox({ request, supplierId, supplierName, onRequestChange }: { request: PriceRequest; supplierId: string; supplierName: string; onRequestChange: (r: PriceRequest) => void }) {
  const [mode, setMode] = useState<"ask" | "modified">("ask");
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const feedback = request.orderFeedback ?? null;

  async function run(key: string, call: () => Promise<PriceRequest>) {
    setPending(key);
    setError(null);
    try {
      onRequestChange(await call());
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(null);
    }
  }
  const send = (outcome: "as_is" | "modified") =>
    run(outcome, () => api<PriceRequest>(`/v1/price-requests/${request.id}/order`, { method: "POST", body: { supplierId, outcome, ...(outcome === "modified" ? { text } : {}) } }));
  const read = () => run("read", () => api<PriceRequest>(`/v1/price-requests/${request.id}/order/analysis`, { method: "POST" }));
  async function upload(list: FileList | null) {
    const files = [...(list ?? [])];
    if (files.length === 0) return;
    const photos = files.filter(isPhoto).slice(0, MAX_QUOTE_PHOTOS);
    if (photos.length === 0 && files[0]!.size > MAX_DOCUMENT_BYTES) {
      setError(new ApiError("payload_too_large", 413));
      return;
    }
    await run("photo", async () => {
      const form = new FormData();
      form.append("supplierId", supplierId);
      if (photos.length > 0) for (const file of await preparePhotos(photos)) form.append("file", file, file.name);
      else await attachFile(form, files[0]!);
      return api<PriceRequest>(`/v1/price-requests/${request.id}/order/document`, { method: "POST", body: form });
    });
    if (input.current) input.current.value = "";
  }

  if (feedback && feedback.supplierId !== supplierId) return null;
  if (feedback?.pendingReading) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-ground px-3 py-3">
        <span className="text-sm font-bold">Bon de commande reçu : il reste à le lire.</span>
        {error ? <ErrorNotice error={error} /> : null}
        <Button pending={pending === "read"} disabled={pending !== null} onClick={() => void read()}>
          Lire le bon de commande
        </Button>
      </div>
    );
  }
  if (feedback) {
    const gaps = feedback.gaps.filter((g) => g.kind !== "same");
    return (
      <div className="flex flex-col gap-1 rounded-2xl bg-ground px-3 py-3 text-sm" role="status">
        <span className="font-extrabold text-ok">
          ✓ {feedback.outcome === "as_is" ? "Commandé tel quel" : `Commande notée : ${gaps.length} écart${gaps.length > 1 ? "s" : ""} avec la liste`}
        </span>
        {gaps.length > 0 ? (
          <ul className="flex flex-col gap-0.5 text-muted">
            {gaps.slice(0, 8).map((g) => (
              <li key={`${g.kind}-${g.index ?? g.designation}`}>
                {shortName(g.designation)} · {GAP_TEXT[g.kind as Exclude<OrderGap["kind"], "same">]}
                {g.kind === "changed" ? ` (${g.sent} → ${g.ordered})` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <span className="text-xs text-muted">Noté pour améliorer les calculs de BatiClair.</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-ground px-3 py-3">
      <span className="text-sm font-bold">Vous avez commandé chez {supplierName} : tel quel ?</span>
      {error ? <ErrorNotice error={error} /> : null}
      {mode === "ask" ? (
        <div className="flex flex-wrap gap-2">
          <Button pending={pending === "as_is"} disabled={pending !== null} onClick={() => void send("as_is")}>
            <Check size={18} aria-hidden="true" />
            Commandé tel quel
          </Button>
          <Button variant="secondary" disabled={pending !== null} onClick={() => setMode("modified")}>
            <PenLine size={18} aria-hidden="true" />
            Modifié
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={`bon-${request.id}`} className="text-sm font-bold">
            Collez votre bon de commande (une ligne par article, avec sa quantité)
          </label>
          <textarea
            id={`bon-${request.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-line bg-surface p-3 text-[15px]"
            placeholder={"Ardoises 30x22 : 9 000 pièces\nLiteaux 18x40 2 100 ml"}
          />
          <div className="flex flex-wrap gap-2">
            <Button pending={pending === "modified"} disabled={pending !== null || text.trim() === ""} onClick={() => void send("modified")}>
              Enregistrer la commande
            </Button>
            <Button variant="secondary" pending={pending === "photo"} disabled={pending !== null} onClick={() => input.current?.click()}>
              <Camera size={18} aria-hidden="true" />
              Ou le prendre en photo
            </Button>
            <input ref={input} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => void upload(e.target.files)} aria-label="Photo du bon de commande" />
          </div>
        </div>
      )}
    </div>
  );
}
