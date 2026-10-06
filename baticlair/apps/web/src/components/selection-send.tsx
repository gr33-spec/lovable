"use client";

import { Send } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import { api, ApiError, newActionKey, type PriceRequest, type Supplier } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * §48.5 « ENVOYER UNE SÉLECTION À UN AUTRE FOURNISSEUR » (usage occasionnel : devis multi-lots ou multi-métiers). Rien ne
 * change à l'écran tant que l'artisan ne touche pas le petit bouton ; les lignes déjà envoyées à part restent dans la
 * liste, en gris « Envoyé · fournisseur ». L'envoi normal, lui, part toujours d'un coup au fournisseur habituel.
 */
export interface SelectionSend {
  /** Clé de l'article (« quote:<clé> » pour une ligne à faire chiffrer) → fournisseur(s) qui l'ont reçue à part. */
  sent: ReadonlyMap<string, string>;
  send: (articles: string[], supplierId: string) => Promise<void>;
}

export function useSelectionSend(projectId: string, onSent?: () => void): SelectionSend {
  const fetchRequests = useCallback((signal: AbortSignal) => api<{ items: PriceRequest[] }>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests`, { signal }), [projectId]);
  const requests = useResource(fetchRequests);
  const fetchSettings = useCallback((signal: AbortSignal) => api<{ deliversEmail: boolean }>("/v1/price-requests/settings", { signal }), []);
  const deliversEmail = useResource(fetchSettings).data?.deliversEmail ?? false;
  const sent = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests.data?.items ?? []) {
      const names = r.recipients.map((x) => x.supplier.name).join(", ");
      for (const key of r.articles ?? []) map.set(key, map.has(key) ? `${map.get(key)}, ${names}` : names);
    }
    return map;
  }, [requests.data]);
  const send = async (articles: string[], supplierId: string) => {
    let request = await api<PriceRequest>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests`, {
      method: "POST",
      body: { supplierIds: [supplierId], articles },
      idempotencyKey: newActionKey(),
    });
    // Le serveur envoie les mails : la sélection part tout de suite ; sinon elle attend dans « Fournisseurs », à envoyer.
    if (deliversEmail) for (const r of request.recipients) request = await api<PriceRequest>(`/v1/price-request-recipients/${r.id}/send`, { method: "POST" });
    requests.reload();
    onSent?.();
  };
  return { sent, send };
}

/** La barre du bas en mode sélection : combien de lignes, à quel fournisseur, « Envoyer », « Annuler ». */
export function SelectionBar({ count, onSend, onCancel }: { count: number; onSend: (supplierId: string) => Promise<void>; onCancel: () => void }) {
  const id = useId();
  const fetchSuppliers = useCallback((signal: AbortSignal) => api<{ items: Supplier[] }>("/v1/suppliers", { signal }), []);
  const suppliers = useResource(fetchSuppliers).data?.items ?? null;
  const [supplierId, setSupplierId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const chosen = supplierId || (suppliers?.length === 1 ? suppliers[0]!.id : "");
  return (
    <section aria-label="Envoyer la sélection" className="flex flex-col gap-2 rounded-[22px] bg-surface p-3 shadow-card">
      <p className="text-[14px] font-extrabold">
        {count === 0 ? "Coche les lignes à envoyer" : `${count} ligne${count > 1 ? "s" : ""} cochée${count > 1 ? "s" : ""}`}
      </p>
      {suppliers && suppliers.length === 0 ? (
        <p className="text-[13px] text-muted">Ajoute d&apos;abord ce fournisseur dans « Fournisseurs ».</p>
      ) : (
        <>
          <label htmlFor={id} className="sr-only">
            Fournisseur
          </label>
          <select id={id} value={chosen} onChange={(e) => setSupplierId(e.target.value)} className="min-h-12 rounded-2xl bg-ground px-3 text-[15px] font-bold text-ink">
            <option value="">Choisir le fournisseur…</option>
            {(suppliers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      )}
      {error ? <ErrorNotice error={error} /> : null}
      <div className="flex gap-2">
        <Button className="grow" variant="secondary" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button
          className="grow"
          pending={pending}
          disabled={count === 0 || !chosen}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              await onSend(chosen);
            } catch (e) {
              setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
            } finally {
              setPending(false);
            }
          }}
        >
          <Send size={18} aria-hidden="true" />
          Envoyer
        </Button>
      </div>
    </section>
  );
}
