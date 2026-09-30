"use client";

import { Check, ChevronDown, Sparkles, TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge, Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type Comparison, type ComparisonSupplier, type ItemFlag, type Offer, type OfferLine, type PriceRequest } from "@/lib/api";
import { euros } from "@/lib/fr";
import { useResource } from "@/lib/use-resource";

function toError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError("internal_error", 500);
}

/**
 * Devis reçu d'un fournisseur : « Lire ce devis » (l'IA le lit une fois,
 * 1 analyse), puis un résumé et le détail ligne par ligne, où l'artisan
 * corrige une correspondance d'un geste.
 */
export function OfferPanel({
  recipientId,
  offer,
  aiAvailable,
  request,
  archived,
  onChange,
}: {
  recipientId: string;
  offer: Offer | null;
  aiAvailable: boolean;
  request: PriceRequest;
  archived: boolean;
  onChange: (offer: Offer) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [open, setOpen] = useState(false);

  async function read() {
    setPending(true);
    setError(null);
    try {
      onChange(await api<Offer>(`/v1/price-request-recipients/${recipientId}/analysis`, { method: "POST" }));
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(false);
    }
  }

  if (!offer) {
    if (archived) return null;
    return (
      <div className="flex flex-col gap-2">
        {error ? <ErrorNotice error={error} /> : null}
        {aiAvailable ? (
          <Button variant="accent" pending={pending} onClick={() => void read()}>
            <Sparkles size={18} aria-hidden="true" />
            {pending ? "L'IA lit le devis… (jusqu'à une minute)" : "Lire ce devis (1 analyse)"}
          </Button>
        ) : (
          <p className="text-sm text-muted">La lecture par l&apos;IA n&apos;est pas encore activée sur ce compte.</p>
        )}
      </div>
    );
  }

  const doubts = offer.lines.filter((l) => l.aiDoubt && !l.edited).length;
  const missing = offer.requestedCount - offer.answeredCount;

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-ground p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold">
          Devis lu · {offer.answeredCount}/{offer.requestedCount} articles
        </span>
        <span className="text-[15px] font-extrabold">{euros(offer.computedTotalHT)} HT</span>
      </div>
      {missing > 0 ? <p className="text-sm font-semibold text-warn">Il manque {missing} article{missing > 1 ? "s" : ""} de votre liste.</p> : null}
      {offer.arithmetic.status === "inconsistent" ? (
        <p className="flex items-start gap-1.5 text-sm font-semibold text-warn">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Les totaux du devis ne tombent pas juste : vérifiez les lignes signalées.
        </p>
      ) : null}
      {doubts > 0 ? <p className="text-sm font-semibold text-warn">L&apos;IA a un doute sur {doubts} ligne{doubts > 1 ? "s" : ""}.</p> : null}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex min-h-10 items-center gap-1 self-start text-sm font-bold text-accent-text">
        <ChevronDown size={16} className={open ? "rotate-180" : ""} aria-hidden="true" />
        {open ? "Masquer le détail" : "Voir le détail"}
      </button>
      {open ? <OfferLines offer={offer} request={request} archived={archived} onChange={onChange} /> : null}
    </div>
  );
}

const KIND_LABEL: Partial<Record<OfferLine["kind"], string>> = {
  substitution: "Produit remplacé",
  variant: "Variante",
  option: "Option",
  fee: "Frais",
  deposit: "Consigne",
};

function OfferLines({ offer, request, archived, onChange }: { offer: Offer; request: PriceRequest; archived: boolean; onChange: (o: Offer) => void }) {
  const [error, setError] = useState<ApiError | null>(null);
  const issueLines = new Set(offer.arithmetic.issues.map((i) => i.lineId).filter(Boolean));

  async function setMatch(line: OfferLine, value: string) {
    setError(null);
    try {
      const updated = await api<Offer>(`/v1/offer-lines/${line.id}`, { method: "PATCH", body: { requestLine: value === "" ? null : Number(value) } });
      onChange({ ...updated, recipientId: offer.recipientId });
    } catch (e) {
      setError(toError(e));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <ErrorNotice error={error} /> : null}
      <ul className="flex flex-col divide-y divide-line rounded-2xl bg-surface px-3">
        {offer.lines
          .filter((l) => l.kind !== "info")
          .map((l) => (
            <li key={l.id} className="flex flex-col gap-1 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-sm leading-snug font-bold">{l.designation}</span>
                <span className="shrink-0 text-sm font-extrabold">{euros(l.amount)}</span>
              </div>
              <span className="text-[13px] text-muted">
                {[l.quantity, l.unit].filter(Boolean).join(" ")}
                {l.unitPrice ? ` × ${euros(l.unitPrice)}` : ""}
                {l.discountRate ? ` · remise ${Math.round(Number(l.discountRate) * 1000) / 10} %` : ""}
                {KIND_LABEL[l.kind] ? ` · ${KIND_LABEL[l.kind]}` : ""}
              </span>
              {issueLines.has(l.id) ? <span className="text-[13px] font-semibold text-warn">Le total de cette ligne ne correspond pas au calcul.</span> : null}
              {l.aiDoubt && !l.edited ? <span className="text-[13px] font-semibold text-warn">L&apos;IA hésite : {l.aiDoubt}</span> : null}
              {l.kind !== "fee" && l.kind !== "deposit" ? (
                <label className="flex items-center gap-2 text-[13px]">
                  <span className="shrink-0 text-muted">Correspond à</span>
                  <select
                    value={l.requestLine ?? ""}
                    disabled={archived}
                    onChange={(e) => void setMatch(l, e.target.value)}
                    className={`min-h-9 min-w-0 grow rounded-lg bg-ground px-2 text-[13px] font-semibold ${
                      l.requestLine !== null && l.matchConfidence === "unsure" && !l.matchConfirmed ? "ring-2 ring-warn" : ""
                    }`}
                  >
                    <option value="">Aucun article demandé</option>
                    {request.lines.map((r, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}. {r.designation}
                      </option>
                    ))}
                  </select>
                  {l.matchConfirmed ? <Check size={16} className="shrink-0 text-ok" aria-label="vérifiée par vous" /> : null}
                </label>
              ) : null}
            </li>
          ))}
      </ul>
      <p className="text-[13px] text-muted">
        Total imprimé : {euros(offer.printed.totalHT)} HT · recalculé : {euros(offer.computedTotalHT)} HT
        {offer.deliveryIncluded === true ? " · livraison incluse" : offer.deliveryIncluded === false ? " · livraison en sus" : ""}
      </p>
    </div>
  );
}

const FLAG_LABEL: Record<ItemFlag, string> = {
  SUBSTITUTION: "autre produit",
  QUANTITY_LOWER: "quantité inférieure",
  QUANTITY_HIGHER: "quantité supérieure",
  UNIT_NOT_COMPARABLE: "unité différente",
  ONLY_AS_VARIANT: "seulement en variante",
  NOT_PRICED: "sans prix",
};

function supplierVerdict(s: ComparisonSupplier): string[] {
  const parts: string[] = [];
  if (s.missingCount > 0) {
    parts.push(`il manque ${s.missingCount} article${s.missingCount > 1 ? "s" : ""}${s.estimatedPartHT && Number(s.estimatedPartHT) > 0 ? ` (estimé${s.missingCount > 1 ? "s" : ""} ${euros(s.estimatedPartHT)})` : ""}`);
  } else parts.push("liste complète");
  if (s.feesHT && Number(s.feesHT) > 0) parts.push(`frais ${euros(s.feesHT)}`);
  if (s.uncertainCount > 0) parts.push(`${s.uncertainCount} correspondance${s.uncertainCount > 1 ? "s" : ""} à vérifier`);
  if (s.arithmetic === "inconsistent") parts.push("totaux à vérifier");
  return parts;
}

/**
 * Comparaison : un total honnête par fournisseur (toute la liste couverte,
 * manquants estimés, frais compris), le détail ligne à ligne, puis
 * « Classé ». Tous les montants viennent du moteur de calcul, pas de l'IA.
 */
export function ProjectComparison({
  request,
  version,
  archived,
  onRequestChange,
}: {
  request: PriceRequest;
  version: number;
  archived: boolean;
  onRequestChange: (r: PriceRequest) => void;
}) {
  const fetchComparison = useCallback(
    (signal: AbortSignal) => {
      void version; // relit la comparaison après chaque lecture ou correction
      return api<Comparison>(`/v1/price-requests/${request.id}/comparison`, { signal });
    },
    [request.id, version],
  );
  const { data, error, reload } = useResource(fetchComparison);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  if (data.suppliers.length === 0) return null;

  const ranked = [...data.suppliers].sort((a, b) => Number(a.comparableTotalHT ?? Infinity) - Number(b.comparableTotalHT ?? Infinity));
  const best = ranked[0]!;
  const names = new Map(data.suppliers.map((s) => [s.supplierId, s.name]));

  return (
    <section id="comparer" aria-labelledby="compare-title" className="flex scroll-mt-4 flex-col gap-3">
      <h2 id="compare-title" className="text-xs font-extrabold tracking-[0.04em] text-muted">
        COMPARER
      </h2>
      <p className="text-sm text-muted">Coût pour toute votre liste, hors taxes, frais compris. Un article manquant est estimé au prix des autres, jamais compté à zéro.</p>
      <ol className="flex flex-col gap-2">
        {ranked.map((s, i) => (
          <li key={s.supplierId}>
            <Card className={`flex flex-col gap-1 p-4 ${i === 0 && ranked.length > 1 ? "ring-2 ring-ok" : ""}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[17px] font-extrabold">{s.name}</span>
                <span className="text-[17px] font-extrabold">{euros(s.comparableTotalHT)}</span>
              </div>
              <span className={`text-sm ${s.missingCount > 0 || s.arithmetic === "inconsistent" ? "font-semibold text-warn" : "text-muted"}`}>{supplierVerdict(s).join(" · ")}</span>
              {i === 0 && ranked.length > 1 ? (
                <Badge tone="ok">{s.missingCount > 0 ? "Le moins cher, estimation comprise" : "Le moins cher"}</Badge>
              ) : null}
            </Card>
          </li>
        ))}
      </ol>
      {ranked.length > 1 && best.missingCount > 0 ? (
        <p className="text-sm font-semibold text-warn">Attention : {best.name} n&apos;a pas chiffré toute la liste. Demandez-lui le reste avant de choisir.</p>
      ) : null}

      <details className="rounded-2xl bg-surface p-4 text-sm shadow-card">
        <summary className="cursor-pointer font-bold">Détail ligne par ligne</summary>
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {data.items.map((item) => (
            <li key={item.index} className="flex flex-col gap-1 py-2.5">
              <span className="font-bold">
                {item.index}. {item.designation}
                <span className="font-normal text-muted"> · {[item.quantity, item.unit].filter(Boolean).join(" ")}</span>
              </span>
              {item.offers.map((o) => {
                const lowest = o.supplierId === item.lowestSupplierId && data.suppliers.length > 1;
                return (
                  <span key={o.supplierId} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate text-muted">
                      {names.get(o.supplierId)}
                      {o.flags.length > 0 ? ` · ${o.flags.map((f) => FLAG_LABEL[f]).join(", ")}` : ""}
                      {o.confidence === "to_verify" ? " · à vérifier" : ""}
                    </span>
                    {o.status === "missing" ? (
                      <span className="shrink-0 font-semibold text-warn">manquant</span>
                    ) : (
                      <span className={`shrink-0 ${lowest ? "font-extrabold text-ok" : "font-semibold"}`}>{euros(o.comparableAmount)}</span>
                    )}
                  </span>
                );
              })}
            </li>
          ))}
        </ul>
      </details>

      <Classify request={request} suppliers={ranked} archived={archived} onChange={onRequestChange} />
    </section>
  );
}

/** « Classé » : l'artisan a fait son choix ; indiquer le ou les fournisseurs retenus est facultatif. */
function Classify({
  request,
  suppliers,
  archived,
  onChange,
}: {
  request: PriceRequest;
  suppliers: ComparisonSupplier[];
  archived: boolean;
  onChange: (r: PriceRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [retained, setRetained] = useState<Set<string>>(new Set(request.retainedSupplierIds));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function save(classified: boolean) {
    setPending(true);
    setError(null);
    try {
      onChange(
        await api<PriceRequest>(`/v1/price-requests/${request.id}/classification`, {
          method: "PATCH",
          body: { classified, retainedSupplierIds: classified ? [...retained] : [] },
        }),
      );
      setOpen(false);
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(false);
    }
  }

  if (request.classifiedAt) {
    const names = suppliers.filter((s) => request.retainedSupplierIds.includes(s.supplierId)).map((s) => s.name);
    return (
      <Card className="flex flex-col gap-2 p-4">
        <span className="font-bold text-ok">
          ✓ Classé le {new Date(request.classifiedAt).toLocaleDateString("fr-FR")}
          {names.length > 0 ? ` · retenu : ${names.join(", ")}` : ""}
        </span>
        {error ? <ErrorNotice error={error} /> : null}
        {!archived ? (
          <button type="button" onClick={() => void save(false)} disabled={pending} className="inline-flex min-h-10 items-center self-start text-sm font-bold text-muted">
            Rouvrir
          </button>
        ) : null}
      </Card>
    );
  }
  if (archived) return null;
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Check size={18} aria-hidden="true" />
        Classer
      </Button>
    );
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <span className="font-bold">Fournisseur retenu (facultatif)</span>
      {suppliers.map((s) => (
        <label key={s.supplierId} className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={retained.has(s.supplierId)}
            onChange={(e) =>
              setRetained((prev) => {
                const next = new Set(prev);
                if (e.target.checked) next.add(s.supplierId);
                else next.delete(s.supplierId);
                return next;
              })
            }
            className="size-5 accent-[#ff5a1f]"
          />
          {s.name}
        </label>
      ))}
      {error ? <ErrorNotice error={error} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          Annuler
        </Button>
        <Button pending={pending} onClick={() => void save(true)}>
          Classer
        </Button>
      </div>
    </Card>
  );
}
