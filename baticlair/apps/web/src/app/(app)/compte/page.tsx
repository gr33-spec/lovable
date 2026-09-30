"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiUsageCard } from "@/components/ai-usage-card";
import { BackButton, Badge, Button, Card, ErrorNotice, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function ComptePage() {
  const router = useRouter();
  const { me, company, features, chooseCompany } = useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function resendVerification() {
    setSending(true);
    setError(null);
    try {
      await api("/v1/auth/send-verification-email", { method: "POST", body: { email: me.user.email, callbackURL: "/" } });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    setLeaving(true);
    try {
      await api("/v1/auth/sign-out", { method: "POST", body: {} });
    } finally {
      router.replace("/connexion");
    }
  }

  return (
    <>
      <BackButton fallback="/" />
      <PageTitle>Mon compte</PageTitle>
      {error ? <ErrorNotice error={error} /> : null}
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col">
          <span className="text-[15px] font-bold">{me.user.name}</span>
          <span className="text-sm text-muted">{me.user.email}</span>
        </div>
        {me.user.emailVerified ? (
          <Badge tone="ok">✓ E-mail confirmé</Badge>
        ) : features.email ? (
          <div className="flex flex-col gap-2">
            <Badge tone="warn">E-mail à confirmer</Badge>
            {sent ? (
              <p role="status" className="text-sm font-semibold text-ok">
                E-mail envoyé. Ouvrez le lien qu&apos;il contient.
              </p>
            ) : (
              <Button variant="secondary" pending={sending} onClick={() => void resendVerification()}>
                Renvoyer l&apos;e-mail de confirmation
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">La confirmation par e-mail sera activée prochainement.</p>
        )}
      </Card>
      <Card className="flex flex-col gap-2 p-4">
        <span className="text-xs font-extrabold tracking-[0.04em] text-muted">ENTREPRISE</span>
        {me.companies.length > 1 ? (
          <div role="radiogroup" aria-label="Entreprise active" className="flex flex-col gap-2">
            {me.companies.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === company?.id}
                onClick={() => chooseCompany(c.id)}
                className={`min-h-12 rounded-2xl px-4 text-left font-bold ${c.id === company?.id ? "bg-ink text-white" : "bg-ground"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[15px] font-bold">{company?.name}</span>
        )}
      </Card>
      {company && (company.role === "owner" || company.role === "admin") ? <AiUsageCard companyId={company.id} /> : null}
      <Button variant="secondary" pending={leaving} onClick={() => void signOut()}>
        Se déconnecter
      </Button>
    </>
  );
}
