"use client";

import { Check, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type Comparison, type ComparisonSupplier, type ItemFlag, type Offer, type OfferLine, type PriceRequest } from "@/lib/api";
import { euros } from "@/lib/fr";
import { useResource } from "@/lib/use-resource";
import { shortName } from "@/lib/labels";

function toError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError("internal_error", 500);
}

/**
 * L'action de l'étape « Réponses » : comparer les offres reçues. Derrière ce
 * seul bouton, BatiClair lit les devis pas encore lus (les autres sont
 * réutilisés), les rapproche de la liste et calcule les écarts.
 */
export function CompareQuotes({
  requestId,
  received,
  waiting,
  aiAvailable,
  onDone,
}: {
  requestId: string;
  /** Devis reçus (lus ou non). */
  received: number;
  /** Fournisseurs qui n'ont pas encore répondu. */
  waiting: number;
  aiAvailable: boolean;
  onDone: (result: { aiAvailable: boolean; items: Offer[] }) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [failed, setFailed] = useState<string[]>([]);

  if (!aiAvailable) return <p className="text-sm text-muted">La comparaison automatique n&apos;est pas encore activée sur ce compte.</p>;

  async function compare() {
    setPending(true);
    setError(null);
    setFailed([]);
    try {
      const result = await api<{ aiAvailable: boolean; items: Offer[]; failed: { supplier: string }[] }>(`/v1/price-requests/${requestId}/analysis`, {
        method: "POST",
      });
      setFailed(result.failed.map((f) => f.supplier));
      onDone(result);
      setTimeout(() => document.getElementById("comparer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (e) {
      setError(toError(e));
    } finally {
      setPending(false);
    }
  }

  const label = received > 1 ? (waiting > 0 ? `Comparer les ${received} devis reçus` : `Comparer les ${received} devis`) : "Voir l'offre reçue";
  return (
    <div className="flex flex-col gap-2">
      {error ? <ErrorNotice error={error} /> : null}
      {failed.length > 0 ? (
        <p role="alert" className="text-sm font-semibold text-warn">
          {failed.length > 1 ? `Les devis de ${failed.join(", ")} n'ont pas pu être lus.` : `Le devis de ${failed[0]} n'a pas pu être lu.`} Réessayez dans un
          instant.
        </p>
      ) : null}
      <Button variant="accent" pending={pending} onClick={() => void compare()}>
        <Sparkles size={18} aria-hidden="true" />
        {pending ? "Comparaison en cours… (jusqu'à une minute)" : label}
      </Button>
      {!pending && waiting > 0 ? (
        <p className="text-center text-[13px] text-muted">
          {waiting > 1 ? `${waiting} fournisseurs n'ont` : "1 fournisseur n'a"} pas encore répondu : vous pouvez aussi attendre.
        </p>
      ) : null}
    </div>
  );
}

/** Ce qu'on retient d'un devis lu, en une ligne : articles chiffrés, manques, points à vérifier. */
export function offerFacts(offer: Offer): { text: string; toCheck: boolean } {
  const doubts = offer.lines.filter((l) => l.aiDoubt && !l.edited).length + (offer.arithmetic.status === "inconsistent" ? 1 : 0);
  const missing = offer.requestedCount - offer.answeredCount;
  const parts = [`${offer.answeredCount}/${offer.requestedCount} articles chiffrés`];
  if (missing > 0) parts.push(`${missing} manquant${missing > 1 ? "s" : ""}`);
  if (doubts > 0) parts.push(`${doubts} à vérifier`);
  return { text: parts.join(" · "), toCheck: doubts > 0 };
}

const KIND_LABEL: Partial<Record<OfferLine["kind"], string>> = {
  substitution: "Produit remplacé",
  variant: "Variante",
  option: "Option",
  fee: "Frais",
  deposit: "Consigne",
};

export function OfferLines({ offer, request, archived, onChange }: { offer: Offer; request: PriceRequest; archived: boolean; onChange: (o: Offer) => void }) {
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
                <span className="min-w-0 text-sm leading-snug font-bold">{shortName(l.designation)}</span>
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
                        {i + 1}. {shortName(r.designation)}
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

const UNIT_TEXT: Record<string, string> = { U: "u", M: "m", ML: "ml", M2: "m²", M3: "m³", L: "L", KG: "kg", T: "t" };
function fmtQty(q: { value: string; unit: string }): string {
  const value = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(q.value));
  return `${value} ${UNIT_TEXT[q.unit] ?? q.unit.toLowerCase()}`;
}

const FLAG_LABEL: Record<ItemFlag, string> = {
  SUBSTITUTION: "autre produit",
  QUANTITY_LOWER: "quantité inférieure",
  QUANTITY_HIGHER: "quantité supérieure",
  UNIT_NOT_COMPARABLE: "unité différente",
  ONLY_AS_VARIANT: "seulement en variante",
  NOT_PRICED: "sans prix",
};

/** Faits sur un fournisseur, en mots simples : ce qu'il manque, ce qu'il faut vérifier. */
function supplierFacts(s: ComparisonSupplier): { text: string; warn: boolean }[] {
  const facts: { text: string; warn: boolean }[] = [];
  if (s.missingCount > 0) {
    const estimate = s.estimatedPartHT && Number(s.estimatedPartHT) > 0 ? ` (estimé${s.missingCount > 1 ? "s" : ""} ${euros(s.estimatedPartHT)})` : "";
    facts.push({ text: `${s.missingCount} article${s.missingCount > 1 ? "s" : ""} manquant${s.missingCount > 1 ? "s" : ""}${estimate}`, warn: true });
  } else facts.push({ text: "Toute la liste chiffrée", warn: false });
  if (s.feesHT && Number(s.feesHT) > 0) facts.push({ text: `Frais ${euros(s.feesHT)}`, warn: false });
  const toCheck = s.uncertainCount + (s.arithmetic === "inconsistent" ? 1 : 0);
  if (toCheck > 0) facts.push({ text: `${toCheck} point${toCheck > 1 ? "s" : ""} à vérifier`, warn: true });
  if (s.extrasCount > 0) facts.push({ text: `${s.extrasCount} ligne${s.extrasCount > 1 ? "s" : ""} non reconnue${s.extrasCount > 1 ? "s" : ""}`, warn: true });
  return facts;
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
      <p className="text-sm text-muted">Total HT pour toute votre liste, frais compris.</p>
      <ol className="flex flex-col gap-2">
        {ranked.map((s, i) => {
          const gap = i > 0 && s.comparableTotalHT && best.comparableTotalHT ? Number(s.comparableTotalHT) - Number(best.comparableTotalHT) : null;
          return (
            <li key={s.supplierId}>
              <Card className={`flex flex-col gap-1.5 p-4 ${i === 0 && ranked.length > 1 ? "ring-2 ring-ok" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[17px] font-extrabold">{s.name}</span>
                  <span className="text-[17px] font-extrabold">{euros(s.comparableTotalHT)}</span>
                </div>
                {ranked.length > 1 ? (
                  i === 0 ? (
                    <span className="text-sm font-bold text-ok">Moins cher sur le total</span>
                  ) : gap !== null ? (
                    <span className="text-sm font-bold text-muted">
                      +{euros(String(gap))} par rapport à {best.name}
                    </span>
                  ) : null
                ) : null}
                <ul className="flex flex-wrap gap-1.5">
                  {supplierFacts(s).map((f) => (
                    <li key={f.text} className={`rounded-full px-2.5 py-1 text-xs font-bold ${f.warn ? "bg-warn-bg text-warn" : "bg-ground text-muted"}`}>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>
      {ranked.length > 1 && best.missingCount > 0 ? (
        <p className="text-sm font-semibold text-warn">
          {best.name} n&apos;a pas chiffré toute la liste : son total comprend une estimation. Demandez-lui le reste avant de décider.
        </p>
      ) : null}
      {ranked.length === 1 ? <p className="text-sm text-muted">Un seul devis lu pour l&apos;instant : ajoutez-en un autre pour comparer.</p> : null}

      <details className="rounded-2xl bg-surface p-4 text-sm shadow-card">
        <summary className="cursor-pointer font-bold">Détail ligne par ligne</summary>
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {data.items.map((item) => (
            <li key={item.index} className="flex flex-col gap-1 py-2.5">
              <span className="font-bold">
                {item.index}. {shortName(item.designation)}
                <span className="font-normal text-muted"> · {[item.quantity, item.unit].filter(Boolean).join(" ")}</span>
              </span>
              {item.offers.map((o) => {
                const lowest = o.supplierId === item.lowestSupplierId && data.suppliers.length > 1;
                const notes = [...o.flags.map((f) => FLAG_LABEL[f]), ...(o.confidence === "to_verify" ? ["à vérifier"] : [])];
                return (
                  <span key={o.supplierId} className="flex flex-col">
                    <span className="flex justify-between gap-3">
                      <span className="min-w-0 truncate text-muted">{names.get(o.supplierId)}</span>
                      {o.status === "missing" ? (
                        <span className="shrink-0 font-semibold text-warn">manquant</span>
                      ) : (
                        <span className={`shrink-0 ${lowest ? "font-extrabold text-ok" : "font-semibold"}`}>{euros(o.comparableAmount)}</span>
                      )}
                    </span>
                    {o.status === "covered" && (o.offeredQuantity || notes.length > 0) ? (
                      <span className="text-xs text-muted">
                        {o.offeredQuantity && o.effectiveUnitPrice ? `${fmtQty(o.offeredQuantity)} à ${euros(o.effectiveUnitPrice)} net` : ""}
                        {notes.length > 0 ? (
                          <span className="font-semibold text-warn">
                            {o.offeredQuantity ? " · " : ""}
                            {notes.join(", ")}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
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
