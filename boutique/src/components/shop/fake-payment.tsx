"use client";

import { useState } from "react";

export function FakePaymentPage({ sessionId, email, total, successUrl, cancelUrl, lines }: { sessionId: string; email: string; total: string; successUrl: string; cancelUrl: string; lines: string[] }) {
  const [busy, setBusy] = useState(false);
  const act = async (action: "pay" | "expire", duplicate = false) => {
    setBusy(true);
    await fetch("/api/dev/fake-pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, action, duplicate }) });
    window.location.assign(action === "pay" ? successUrl.replace(/^https?:\/\/[^/]+/, "") : cancelUrl.replace(/^https?:\/\/[^/]+/, ""));
  };
  return (
    <main className="mx-auto max-w-md p-6">
      <p className="rounded-xl bg-warning-bg p-3 text-sm font-semibold text-warning">Simulateur de paiement — développement uniquement. En production, cette page est celle de Stripe.</p>
      <h1 className="mt-6 text-3xl">Payer {total}</h1>
      <p className="text-text-2">{email}</p>
      <ul className="mt-4 text-sm">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <div className="mt-6 grid gap-3">
        <button className="btn btn-primary" disabled={busy} onClick={() => act("pay")}>Payer (succès)</button>
        <button className="btn btn-outline" disabled={busy} onClick={() => act("pay", true)}>Payer + webhook envoyé deux fois</button>
        <button className="btn btn-outline" disabled={busy} onClick={() => window.location.assign(cancelUrl.replace(/^https?:\/\/[^/]+/, ""))}>Revenir sans payer</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => act("expire")}>Faire expirer la session</button>
      </div>
    </main>
  );
}
