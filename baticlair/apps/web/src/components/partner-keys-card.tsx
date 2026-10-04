"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface PartnerKey {
  id: string;
  nom: string;
  prefixe: string;
  quotaMensuel: number;
  utilisesCeMois: number;
  creeLe: string;
  derniereUtilisation: string | null;
  revoqueeLe: string | null;
}

/**
 * CLÉS API PARTENAIRE (Compte) : une clé par intégration (Rappidos…), avec un quota mensuel de quantitatifs.
 * La clé complète n'est montrée qu'à sa création : on la copie tout de suite. Révoquer la coupe immédiatement.
 */
export function PartnerKeysCard() {
  const fetchKeys = useCallback((signal: AbortSignal) => api<{ items: PartnerKey[] }>("/v1/partner-keys", { signal }), []);
  const { data, setData, error, reload } = useResource(fetchKeys);
  const [name, setName] = useState("");
  const [quota, setQuota] = useState("500");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [fresh, setFresh] = useState<{ nom: string; cle: string } | null>(null);

  async function create() {
    setPending(true);
    setActionError(null);
    try {
      const k = await api<PartnerKey & { cle: string }>("/v1/partner-keys", { method: "POST", body: { nom: name.trim(), quotaMensuel: Number(quota) } });
      setFresh({ nom: k.nom, cle: k.cle });
      setName("");
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    setPending(true);
    setActionError(null);
    try {
      await api<void>(`/v1/partner-keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      setData((prev) => (prev ? { items: prev.items.map((k) => (k.id === id ? { ...k, revoqueeLe: new Date().toISOString() } : k)) } : prev));
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <KeyRound size={20} aria-hidden="true" className="text-accent-text" />
        <h2 className="text-base font-bold">Clés API partenaire</h2>
      </div>
      <p className="text-sm text-muted">Pour un logiciel qui envoie ses devis à BatiClair (porte /v1/quantitatifs). Chaque clé a un quota mensuel de quantitatifs.</p>
      {error && !data ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Spinner /> : null}
      {data ? (
        <ul className="flex flex-col gap-2">
          {data.items.length === 0 ? <li className="text-sm text-muted">Aucune clé pour l&apos;instant.</li> : null}
          {data.items.map((k) => (
            <li key={k.id} className={`flex items-center justify-between gap-3 rounded-2xl bg-ground px-3 py-2 text-sm ${k.revoqueeLe ? "opacity-60" : ""}`}>
              <div className="flex min-w-0 flex-col">
                <span className={`font-bold ${k.revoqueeLe ? "line-through" : ""}`}>{k.nom}</span>
                <span className="text-muted">
                  {k.prefixe}… · {k.utilisesCeMois} / {k.quotaMensuel} ce mois
                  {k.revoqueeLe ? " · révoquée" : ""}
                </span>
              </div>
              {!k.revoqueeLe ? (
                <button type="button" disabled={pending} onClick={() => void revoke(k.id)} aria-label={`Révoquer la clé ${k.nom}`} className="flex size-11 items-center justify-center rounded-full text-danger">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {fresh ? (
        <div role="status" className="flex flex-col gap-1 rounded-2xl bg-ok-bg p-3 text-sm">
          <span className="font-bold">Clé « {fresh.nom} » créée. Copiez-la maintenant : elle ne sera plus affichée.</span>
          <code className="font-mono text-[13px] break-all select-all">{fresh.cle}</code>
        </div>
      ) : null}
      {actionError ? <ErrorNotice error={actionError} /> : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex grow flex-col gap-1 text-sm font-semibold">
          Nom de l&apos;intégration
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Rappidos" className="min-h-11 rounded-2xl border border-line bg-surface px-3 text-base font-normal" />
        </label>
        <label className="flex w-28 flex-col gap-1 text-sm font-semibold">
          Quota / mois
          <input value={quota} onChange={(e) => setQuota(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="min-h-11 rounded-2xl border border-line bg-surface px-3 text-base font-normal" />
        </label>
        <Button pending={pending} disabled={!name.trim() || !Number(quota)} onClick={() => void create()}>
          Créer une clé
        </Button>
      </div>
    </Card>
  );
}
