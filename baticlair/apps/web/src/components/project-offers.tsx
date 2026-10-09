"use client";

import { Check, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { OrderFeedbackBox } from "@/components/order-feedback";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type Comparison, type ComparisonItem, type ComparisonSupplier, type ItemFlag, type Offer, type OfferLine, type PriceRequest } from "@/lib/api";
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

  const label = received > 1 ? "Comparer les offres" : "Voir l'offre reçue";
  return (
    <div className="flex flex-col gap-2">
      {error ? <ErrorNotice error={error} /> : null}
      {failed.length > 0 ? (
        <p role="alert" className="text-sm font-semibold text-warn">
          {failed.length > 1 ? `Les devis de ${failed.join(", ")} n'ont pas pu être lus.` : `Le devis de ${failed[0]} n'a pas pu être lu.`} Réessaie dans un
          instant.
        </p>
      ) : null}
      <Button variant="accent" pending={pending} onClick={() => void compare()}>
        <Sparkles size={18} aria-hidden="true" />
        {pending ? "Comparaison en cours… (jusqu'à une minute)" : label}
      </Button>
      {!pending ? (
        <p className="text-center text-[13px] text-muted">
          {waiting > 0 ? `${received} offre${received > 1 ? "s" : ""} reçue${received > 1 ? "s" : ""} sur ${received + waiting} · tu peux aussi attendre` : received > 1 ? `${received} offres reçues` : "1 offre reçue"}
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
              {l.aiDoubt && !l.edited ? <span className="text-[13px] font-semibold text-warn">À vérifier : {l.aiDoubt}</span> : null}
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
                  {l.matchConfirmed ? <Check size={16} className="shrink-0 text-ok" aria-label="vérifiée par toi" /> : null}
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

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Ce qui distingue l'offre d'un fournisseur, ligne à ligne : quantités, produits, points à vérifier. */
function supplierDiffs(s: ComparisonSupplier, items: ComparisonItem[]): { text: string; warn: boolean }[] {
  let quantity = 0;
  let product = 0;
  let check = s.uncertainCount + (s.arithmetic === "inconsistent" ? 1 : 0);
  for (const item of items) {
    const o = item.offers.find((x) => x.supplierId === s.supplierId);
    if (!o || o.status !== "covered") continue;
    if (o.flags.includes("QUANTITY_LOWER") || o.flags.includes("QUANTITY_HIGHER")) quantity++;
    if (o.flags.includes("SUBSTITUTION") || o.flags.includes("ONLY_AS_VARIANT")) product++;
    if (o.flags.includes("UNIT_NOT_COMPARABLE") || o.flags.includes("NOT_PRICED")) check++;
  }
  const facts: { text: string; warn: boolean }[] = [];
  if (quantity > 0) facts.push({ text: plural(quantity, "quantité différente", "quantités différentes"), warn: true });
  if (product > 0) facts.push({ text: plural(product, "produit différent", "produits différents"), warn: true });
  if (check > 0) facts.push({ text: plural(check, "point à vérifier", "points à vérifier"), warn: true });
  if (s.feesHT && Number(s.feesHT) > 0) facts.push({ text: `Livraison ${euros(s.feesHT)}`, warn: false });
  return facts;
}

/** Montant réellement chiffré par le fournisseur (frais compris), sans aucune estimation. */
function quotedHT(s: ComparisonSupplier): number | null {
  if (s.comparableTotalHT === null) return null;
  return Number(s.comparableTotalHT) - Number(s.estimatedPartHT ?? 0);
}

/**
 * Choisir un fournisseur : pour chacun, ce qu'il a vraiment chiffré. Une
 * offre incomplète n'est jamais « la moins chère » : ses manques sont dits
 * en clair, et son total estimé est présenté à part, comme une estimation.
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
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  if (data.suppliers.length === 0) return null;

  const byTotal = (a: ComparisonSupplier, b: ComparisonSupplier) => Number(a.comparableTotalHT ?? Infinity) - Number(b.comparableTotalHT ?? Infinity);
  // Les offres complètes d'abord : ce sont elles qu'on peut comparer sans réserve.
  const complete = data.suppliers.filter((s) => s.missingCount === 0).sort(byTotal);
  const incomplete = data.suppliers.filter((s) => s.missingCount > 0).sort(byTotal);
  const ranked = [...complete, ...incomplete];
  const reference = complete[0] ?? null;
  // Une offre incomplète moins chère « sur le papier » : le moins cher n'est vrai que parmi les offres complètes.
  const cheaperIncomplete = reference !== null && incomplete.some((s) => Number(s.comparableTotalHT ?? Infinity) < Number(reference.comparableTotalHT ?? Infinity));
  const refLabel = cheaperIncomplete ? "Le moins cher des offres complètes" : "Le moins cher";
  const names = new Map(data.suppliers.map((s) => [s.supplierId, s.name]));
  const chosen = request.classifiedAt ? new Set(request.retainedSupplierIds) : null;

  async function choose(supplierId: string | null) {
    setPending(supplierId ?? "reset");
    setActionError(null);
    try {
      onRequestChange(
        await api<PriceRequest>(`/v1/price-requests/${request.id}/classification`, {
          method: "PATCH",
          body: supplierId ? { classified: true, retainedSupplierIds: [supplierId] } : { classified: false, retainedSupplierIds: [] },
        }),
      );
    } catch (e) {
      setActionError(toError(e));
    } finally {
      setPending(null);
    }
  }

  return (
    <section id="comparer" aria-labelledby="compare-title" className="flex scroll-mt-4 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="compare-title" className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
          {chosen ? "Offre retenue" : ranked.length > 1 ? "Choisir un fournisseur" : "L'offre reçue"}
        </h2>
        <span className="text-xs font-bold text-muted">Prix HT</span>
      </div>
      {actionError ? <ErrorNotice error={actionError} /> : null}
      <ol className="flex flex-col gap-2" aria-label="Offres">
        {ranked.map((s) => {
          const isRef = reference?.supplierId === s.supplierId && complete.length > 0 && ranked.length > 1;
          const retained = chosen?.has(s.supplierId) ?? false;
          const quoted = quotedHT(s);
          const gap = reference && s.missingCount === 0 && !isRef && s.comparableTotalHT && reference.comparableTotalHT
            ? Number(s.comparableTotalHT) - Number(reference.comparableTotalHT)
            : null;
          const diffs = supplierDiffs(s, data.items);
          return (
            <li key={s.supplierId}>
              <Card className={`flex flex-col gap-2 p-4 ${retained ? "ring-2 ring-ok" : isRef && !chosen ? "ring-2 ring-ok/60" : ""} ${chosen && !retained ? "opacity-60" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-[17px] leading-snug font-extrabold">{s.name}</span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[19px] font-extrabold">{euros(quoted === null ? null : quoted.toFixed(2))}</span>
                    {s.missingCount > 0 ? <span className="block text-xs font-bold text-muted">chiffrés</span> : null}
                  </span>
                </div>
                {retained ? <span className="text-sm font-extrabold text-ok">✓ Offre retenue</span> : null}
                {retained && !archived ? <OrderFeedbackBox request={request} supplierId={s.supplierId} supplierName={s.name} onRequestChange={onRequestChange} /> : null}
                {!retained && isRef ? <span className="text-sm font-extrabold text-ok">{refLabel}</span> : null}
                {gap !== null && gap > 0 ? (
                  <span className="text-sm font-bold text-muted">
                    +{euros(gap.toFixed(2))} par rapport à {reference!.name}
                  </span>
                ) : null}
                {s.missingCount > 0 ? (
                  <div className="flex flex-col gap-0.5 rounded-2xl bg-warn-bg px-3 py-2">
                    <span className="text-sm font-extrabold text-warn">
                      ⚠️ {plural(s.missingCount, "article manquant", "articles manquants")}
                    </span>
                    {s.comparableTotalHT ? (
                      <span className="text-[13px] text-warn">
                        Total estimé avec {s.missingCount > 1 ? "les articles manquants" : "l'article manquant"} : {euros(s.comparableTotalHT)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {diffs.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {diffs.map((f) => (
                      <li key={f.text} className={`rounded-full px-2.5 py-1 text-xs font-bold ${f.warn ? "bg-warn-bg text-warn" : "bg-ground text-muted"}`}>
                        {f.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {!archived && !chosen && ranked.length > 1 ? (
                  <Button variant={isRef ? "primary" : "secondary"} pending={pending === s.supplierId} disabled={pending !== null} onClick={() => void choose(s.supplierId)}>
                    <Check size={18} aria-hidden="true" />
                    Retenir cette offre
                  </Button>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>
      {ranked.length === 1 ? <p className="text-sm text-muted">Une seule offre pour l&apos;instant : attends les autres pour comparer.</p> : null}
      {chosen && !archived ? (
        <button
          type="button"
          onClick={() => void choose(null)}
          disabled={pending !== null}
          className="inline-flex min-h-11 items-center self-center text-sm font-bold text-muted disabled:opacity-60"
        >
          Changer d&apos;avis
        </button>
      ) : null}

      <details className="rounded-2xl bg-surface p-4 text-sm shadow-card">
        <summary className="cursor-pointer font-bold">Voir le détail ligne par ligne</summary>
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {data.items.map((item) => (
            <li key={item.index} className="flex flex-col gap-1 py-2.5">
              <span className="font-bold">
                {shortName(item.designation)}
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
    </section>
  );
}
