"use client";

import { useState, useTransition } from "react";
import { stripeAccountAction } from "@/app/admin/actions";
import { Notice } from "./ui";

type Account = { id: string; displayName: string; email: string | null; country: string | null; chargesEnabled: boolean; livemode: boolean };

/** Vérification explicite du compte Stripe connecté et du mode (test / réel). */
export function StripeStatus({ configured, problem, environment }: { configured: { provider: string; mode: string } | null; problem: string | null; environment: string }) {
  const [result, setResult] = useState<{ account: Account; mode: string; matchesExpected: boolean | null } | { error: string } | null>(null);
  const [pending, start] = useTransition();
  if (!configured) {
    return (
      <Notice tone="danger">
        <strong>Paiement non configuré.</strong> {problem} Les clientes ne peuvent pas payer tant que ce n&apos;est pas corrigé (voir le guide de mise en ligne).
      </Notice>
    );
  }
  return (
    <div className="card space-y-4 p-5">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Mode :</span>
        {configured.provider === "fake" ? (
          <span className="badge bg-warning-bg text-warning">Simulateur (développement)</span>
        ) : configured.mode === "live" ? (
          <span className="badge bg-success-bg text-success">Réel — les paiements sont encaissés</span>
        ) : (
          <span className="badge bg-warning-bg text-warning">Test — aucun argent réel</span>
        )}
        <span className="text-sm text-text-2">· environnement : {environment === "production" ? "site en ligne" : environment}</span>
      </p>
      <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => setResult(await stripeAccountAction().then((r) => (r.ok ? r : { error: r.error }))))}>
        Vérifier le compte connecté
      </button>
      {result && "error" in result && <Notice tone="danger">{result.error}</Notice>}
      {result && "account" in result && (
        <dl className="grid gap-1 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="text-text-2">Compte</dt>
          <dd className="font-semibold">{result.account.displayName}</dd>
          <dt className="text-text-2">Identifiant</dt>
          <dd>{result.account.id}</dd>
          {result.account.email && (
            <>
              <dt className="text-text-2">E-mail du compte</dt>
              <dd>{result.account.email}</dd>
            </>
          )}
          <dt className="text-text-2">Paiements activés</dt>
          <dd>{result.account.chargesEnabled ? "Oui" : "Non — terminez l'activation dans Stripe"}</dd>
          <dt className="text-text-2">Compte attendu</dt>
          <dd>{result.matchesExpected === null ? "Non vérifié (STRIPE_ACCOUNT_ID absent)" : result.matchesExpected ? "✓ C'est bien le compte officiel" : "✗ Ce n'est PAS le compte attendu : paiement bloqué"}</dd>
        </dl>
      )}
    </div>
  );
}
