"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { PlanSummary } from "@/components/paywall";
import { TradePicker } from "@/components/trade-picker";
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
      <PlanSummary />
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
      {company && company.role !== "viewer" ? <TradesCard initial={company.trades} /> : null}
      <Button variant="secondary" pending={leaving} onClick={() => void signOut()}>
        Se déconnecter
      </Button>
      <MyData onDeleted={() => router.replace("/connexion?compte=supprime")} />
    </>
  );
}

/**
 * Mes données (RGPD) : les emporter (un fichier), ou tout effacer. La suppression demande de
 * taper SUPPRIMER : rien ne part sur un appui distrait.
 */
function MyData({ onDeleted }: { onDeleted: () => void }) {
  const id = useId();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [word, setWord] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function download() {
    setExporting(true);
    setError(null);
    try {
      const data = await api<unknown>("/v1/me/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `baticlair-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setExporting(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      await api("/v1/me", { method: "DELETE", body: { confirm: word.trim().toUpperCase() } });
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">MES DONNÉES</h2>
      {error ? <ErrorNotice error={error} /> : null}
      <Button variant="secondary" pending={exporting} onClick={() => void download()}>
        Télécharger mes données
      </Button>
      <a href="/confidentialite" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-accent-text">
        Ce que BatiClair garde, et combien de temps
      </a>
      {confirming ? (
        <div role="group" aria-label="Confirmer la suppression du compte" className="flex flex-col gap-3 rounded-2xl bg-danger-bg p-3">
          <p className="text-sm font-semibold">
            Tout sera effacé : vos chantiers, vos devis, vos listes, vos fournisseurs. C&apos;est définitif. Téléchargez vos données avant si vous voulez les garder.
          </p>
          <label htmlFor={id} className="flex flex-col gap-1 text-sm font-bold">
            Tapez SUPPRIMER pour confirmer
            <input id={id} value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" className="min-h-12 rounded-2xl bg-surface px-3 text-base" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={deleting || word.trim().toUpperCase() !== "SUPPRIMER"}
              onClick={() => void remove()}
              className="inline-flex min-h-11 items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center px-4 text-sm font-bold">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center self-start text-sm font-bold text-danger">
          Supprimer mon compte
        </button>
      )}
    </Card>
  );
}

/** Métiers de l'entreprise : ils adaptent la lecture des prochains devis, rien d'autre ne change. */
function TradesCard({ initial }: { initial: string[] }) {
  const { refresh } = useSession();
  const [trades, setTrades] = useState(initial);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const changed = [...trades].sort().join() !== [...initial].sort().join();

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await api<{ trades: string[] }>("/v1/company/trades", { method: "PATCH", body: { trades } });
      setTrades(res.trades);
      setSaved(true);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <TradePicker
        label="Vos métiers"
        value={trades}
        onChange={(v) => {
          setTrades(v);
          setSaved(false);
        }}
      />
      <p className="text-sm text-muted">BatiClair s&apos;en sert pour mieux lire vos devis. S&apos;applique aux prochains devis déposés.</p>
      {error ? <ErrorNotice error={error} /> : null}
      {saved && !changed ? (
        <p role="status" className="text-sm font-semibold text-ok">
          Métiers enregistrés.
        </p>
      ) : null}
      {changed ? (
        <Button variant="secondary" pending={pending} onClick={() => void save()}>
          Enregistrer mes métiers
        </Button>
      ) : null}
    </Card>
  );
}
