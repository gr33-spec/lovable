"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type BillingPlan, type BillingStatus } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));

export function useBilling() {
  const fetchBilling = useCallback((signal: AbortSignal) => api<BillingStatus>("/v1/billing", { signal }), []);
  return useResource(fetchBilling);
}

const limitText = (p: BillingPlan) =>
  p.projectLimit === null ? "Chantiers illimités" : `Jusqu'à ${p.projectLimit} chantiers${p.period === "month" ? " / mois" : ""}`;

/**
 * Les formules, en mots d'artisan : un prix, un nombre de chantiers. Sans
 * paiement en ligne pour l'instant : « Choisir cette formule » nous prévient,
 * et un code d'activation (tests, premiers clients) l'active tout de suite.
 */
export function Paywall({ status, onChange }: { status: BillingStatus; onChange: (s: BillingStatus) => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const codeId = useId();
  const blocked = status.limitReached;
  const requested = status.offers.find((o) => o.key === status.requestedPlan) ?? null;

  async function run(key: string, action: () => Promise<BillingStatus>) {
    setPending(key);
    setError(null);
    try {
      onChange(await action());
    } catch (e) {
      setError(asError(e));
    } finally {
      setPending(null);
    }
  }
  const choose = (plan: string) => run(plan, () => api<BillingStatus>("/v1/billing/request", { method: "POST", body: { plan } }));
  const activate = () => run("code", () => api<BillingStatus>("/v1/billing/activate", { method: "POST", body: { code } }));

  return (
    <section aria-labelledby="paywall-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 id="paywall-title" className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em]">
          {blocked ? (status.plan.key === "trial" ? "Votre essai est terminé" : "Limite de votre formule atteinte") : "Nos formules"}
        </h1>
        <p className="text-[15px] text-muted">Continuez à utiliser BatiClair pour analyser vos devis et comparer vos fournisseurs.</p>
        {blocked ? <p className="text-sm text-muted">Vos chantiers en cours restent accessibles.</p> : null}
      </div>

      {error ? <ErrorNotice error={error} /> : null}
      {requested ? (
        <p role="status" className="rounded-2xl bg-ok-bg p-3 text-sm font-semibold text-ok">
          Merci ! Nous vous contactons très vite pour activer la formule {requested.label}.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3" aria-label="Formules">
        {status.offers.map((plan) => {
          const current = plan.key === status.plan.key;
          return (
            <li key={plan.key}>
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[20px] font-extrabold">{plan.label}</span>
                  {plan.priceEurMonth !== null ? (
                    <span className="text-[20px] font-extrabold">
                      {plan.priceEurMonth} €<span className="text-sm font-bold text-muted"> HT/mois</span>
                    </span>
                  ) : null}
                </div>
                <p className="text-[15px]">{limitText(plan)}</p>
                {current ? (
                  <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-ok">
                    <Check size={16} aria-hidden="true" />
                    Votre formule actuelle
                  </p>
                ) : status.requestedPlan === plan.key ? (
                  <p className="text-sm font-extrabold text-ok">✓ Demande envoyée</p>
                ) : (
                  <Button pending={pending === plan.key} disabled={pending !== null} onClick={() => void choose(plan.key)}>
                    Choisir cette formule
                  </Button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      {status.activationEnabled ? (
        showCode ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) void activate();
            }}
          >
            <label htmlFor={codeId} className="text-sm font-bold">
              Code d&apos;activation
            </label>
            <input
              id={codeId}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              className="min-h-12 rounded-2xl bg-surface px-3 text-base shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ink"
            />
            <Button type="submit" variant="secondary" pending={pending === "code"}>
              Activer
            </Button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowCode(true)} className="inline-flex min-h-11 items-center self-center text-sm font-bold text-muted">
            J&apos;ai un code d&apos;activation
          </button>
        )
      ) : null}
    </section>
  );
}

/** Page « Formules » : la formule actuelle et les offres. */
export function PlansScreen() {
  const { data, setData, error, reload } = useBilling();
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return <Paywall status={data} onChange={setData} />;
}

/** Compte : la formule en une ligne, et le lien vers les formules. */
export function PlanSummary() {
  const { data } = useBilling();
  if (!data) return null;
  const { plan, usage } = data;
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <span className="text-xs font-extrabold tracking-[0.04em] text-muted">FORMULE</span>
      <span className="text-[17px] font-extrabold">{plan.label}</span>
      {usage.limit !== null ? (
        <span className={`text-sm ${data.limitReached ? "font-semibold text-warn" : "text-muted"}`}>
          {usage.projects} chantier{usage.projects > 1 ? "s" : ""} sur {usage.limit}
          {plan.period === "month" ? " ce mois-ci" : ""}
        </span>
      ) : null}
      <Link href="/formules" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-accent-text">
        Voir les formules
      </Link>
    </Card>
  );
}
