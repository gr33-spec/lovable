"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { NotificationsCard } from "@/components/notifications-card";
import { PartnerKeysCard } from "@/components/partner-keys-card";
import { PlanSummary } from "@/components/paywall";
import { TradePicker } from "@/components/trade-picker";
import {
  BackButton,
  Badge,
  Button,
  Card,
  ErrorNotice,
  Field,
  PageTitle,
} from "@/components/ui";
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
      await api("/v1/auth/send-verification-email", {
        method: "POST",
        body: { email: me.user.email, callbackURL: "/" },
      });
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
              <Button
                variant="secondary"
                pending={sending}
                onClick={() => void resendVerification()}
              >
                Renvoyer l&apos;e-mail de confirmation
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            La confirmation par e-mail sera activée prochainement.
          </p>
        )}
      </Card>
      <PlanSummary />
      <Card className="flex flex-col gap-2 p-4">
        <span className="text-xs font-extrabold tracking-[0.04em] text-muted">
          ENTREPRISE
        </span>
        {me.companies.length > 1 ? (
          <div
            role="radiogroup"
            aria-label="Entreprise active"
            className="flex flex-col gap-2"
          >
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
      {company && company.role !== "viewer" ? (
        <CompanyProfileCard signatureName={me.user.name} />
      ) : null}
      {company && company.role !== "viewer" ? (
        <TradesCard initial={company.trades} />
      ) : null}
      <NotificationsCard />
      <PartnerKeysCard />
      {company && company.role !== "viewer" ? <MemoryCard /> : null}
      <Button
        variant="secondary"
        pending={leaving}
        onClick={() => void signOut()}
      >
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
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
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
      await api("/v1/me", {
        method: "DELETE",
        body: { confirm: word.trim().toUpperCase() },
      });
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">
        MES DONNÉES
      </h2>
      {error ? <ErrorNotice error={error} /> : null}
      <Button
        variant="secondary"
        pending={exporting}
        onClick={() => void download()}
      >
        Télécharger mes données
      </Button>
      <a
        href="/confidentialite"
        className="inline-flex min-h-11 items-center self-start text-sm font-bold text-accent-text"
      >
        Ce que BatiClair garde, et combien de temps
      </a>
      {confirming ? (
        <div
          role="group"
          aria-label="Confirmer la suppression du compte"
          className="flex flex-col gap-3 rounded-2xl bg-danger-bg p-3"
        >
          <p className="text-sm font-semibold">
            Tout sera effacé : tes chantiers, tes devis, tes listes, tes
            fournisseurs. C&apos;est définitif. Télécharge tes données avant si
            tu veux les garder.
          </p>
          <label htmlFor={id} className="flex flex-col gap-1 text-sm font-bold">
            Tapez SUPPRIMER pour confirmer
            <input
              id={id}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              autoComplete="off"
              className="min-h-12 rounded-2xl bg-surface px-3 text-base"
            />
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
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex min-h-11 items-center px-4 text-sm font-bold"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex min-h-11 items-center self-start text-sm font-bold text-danger"
        >
          Supprimer mon compte
        </button>
      )}
    </Card>
  );
}

/** Des essais faits au hasard ne doivent pas devenir des habitudes : on repart de zéro, les chantiers restent. */
function MemoryCard() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function forget() {
    setPending(true);
    setError(null);
    try {
      await api("/v1/memoire", { method: "DELETE" });
      setDone(true);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">
        CE QUE BATICLAIR A APPRIS
      </h2>
      <p className="text-sm text-muted">
        Vos habitudes (« je façonne », la qualité d&apos;ardoise…), les ajouts
        refusés et tes corrections. Tes chantiers restent tels quels.
      </p>
      {error ? <ErrorNotice error={error} /> : null}
      {done ? (
        <p role="status" className="text-sm font-bold text-ok">
          C&apos;est effacé. Les prochains chantiers reposeront les questions.
        </p>
      ) : null}
      {confirming ? (
        <div
          role="group"
          aria-label="Confirmer l'effacement"
          className="flex gap-2"
        >
          <Button
            variant="secondary"
            pending={pending}
            onClick={() => void forget()}
          >
            Oui, tout effacer
          </Button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="inline-flex min-h-11 items-center px-4 text-sm font-bold"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setConfirming(true);
          }}
          className="inline-flex min-h-11 items-center self-start text-sm font-bold text-accent-text"
        >
          Effacer ce que BatiClair a appris
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
      const res = await api<{ trades: string[] }>("/v1/company/trades", {
        method: "PATCH",
        body: { trades },
      });
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
        label="Tes métiers"
        value={trades}
        onChange={(v) => {
          setTrades(v);
          setSaved(false);
        }}
      />
      <p className="text-sm text-muted">
        BatiClair s&apos;en sert pour mieux lire tes devis. S&apos;applique aux
        prochains devis déposés.
      </p>
      {error ? <ErrorNotice error={error} /> : null}
      {saved && !changed ? (
        <p role="status" className="text-sm font-semibold text-ok">
          Métiers enregistrés.
        </p>
      ) : null}
      {changed ? (
        <Button
          variant="secondary"
          pending={pending}
          onClick={() => void save()}
        >
          Enregistrer mes métiers
        </Button>
      ) : null}
    </Card>
  );
}

interface CompanyProfile {
  name: string;
  address: string | null;
  siret: string | null;
  phone: string | null;
  email: string | null;
  hasLogo: boolean;
}

/**
 * §45.2, §45.3 : les coordonnées et le logo de l'entreprise. Ils font l'en-tête de la demande de devis et la
 * signature du mail ; rien n'est à saisir au moment de l'envoi. Rien n'est obligatoire.
 */
function CompanyProfileCard({ signatureName }: { signatureName: string }) {
  const { refresh } = useSession();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    address: "",
    siret: "",
    phone: "",
    email: "",
  });
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const ids = {
    name: useId(),
    address: useId(),
    siret: useId(),
    phone: useId(),
    email: useId(),
    logo: useId(),
  };

  useEffect(() => {
    void api<CompanyProfile>("/v1/company/profile").then((p) => {
      setProfile(p);
      setDraft({
        name: p.name,
        address: p.address ?? "",
        siret: p.siret ?? "",
        phone: p.phone ?? "",
        email: p.email ?? "",
      });
    });
  }, []);
  if (!profile) return null;
  const changed =
    draft.name !== profile.name ||
    draft.address !== (profile.address ?? "") ||
    draft.siret !== (profile.siret ?? "") ||
    draft.phone !== (profile.phone ?? "") ||
    draft.email !== (profile.email ?? "");
  const set =
    (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft({ ...draft, [key]: e.target.value });
      setSaved(false);
    };

  async function save() {
    setPending(true);
    setError(null);
    try {
      const p = await api<CompanyProfile>("/v1/company/profile", {
        method: "PATCH",
        body: {
          name: draft.name,
          address: draft.address || null,
          siret: draft.siret || null,
          phone: draft.phone || null,
          email: draft.email || null,
        },
      });
      setProfile(p);
      setDraft({
        name: p.name,
        address: p.address ?? "",
        siret: p.siret ?? "",
        phone: p.phone ?? "",
        email: p.email ?? "",
      });
      setSaved(true);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      setProfile(
        await api<CompanyProfile>("/v1/company/logo", {
          method: "PUT",
          body: form,
        }),
      );
      setLogoVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    }
  }

  async function removeLogo() {
    setError(null);
    try {
      setProfile(
        await api<CompanyProfile>("/v1/company/logo", { method: "DELETE" }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    }
  }

  const signature = [
    [signatureName, profile.name].filter(Boolean).join(" "),
    profile.phone,
    profile.email,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">
        VOS DEMANDES DE DEVIS
      </h2>
      <p className="text-sm text-muted">
        En tête du PDF envoyé au fournisseur, et en signature du mail.
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-2xl bg-ground">
          {profile.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/v1/company/logo?v=${logoVersion}`}
              alt="Logo de l'entreprise"
              className="max-h-16 max-w-28 object-contain"
            />
          ) : (
            <span className="px-2 text-center text-xs font-bold text-muted">
              Pas de logo
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <label
            htmlFor={ids.logo}
            className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-accent-text"
          >
            {profile.hasLogo ? "Changer le logo" : "Ajouter le logo"}
          </label>
          <input
            id={ids.logo}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => void uploadLogo(e.target.files?.[0])}
          />
          {profile.hasLogo ? (
            <button
              type="button"
              onClick={() => void removeLogo()}
              className="inline-flex min-h-9 items-center text-sm font-bold text-muted"
            >
              Retirer
            </button>
          ) : (
            <span className="text-xs text-muted">
              PNG ou JPEG, 500 Ko au plus
            </span>
          )}
        </div>
      </div>
      <Field
        id={ids.name}
        label="Nom de l'entreprise"
        value={draft.name}
        onChange={set("name")}
        autoComplete="organization"
      />
      <Field
        id={ids.address}
        label="Adresse"
        value={draft.address}
        onChange={set("address")}
        autoComplete="street-address"
        placeholder="4 rue de Siam, 29200 Brest"
      />
      <Field
        id={ids.siret}
        label="SIRET"
        value={draft.siret}
        onChange={set("siret")}
        inputMode="numeric"
        placeholder="14 chiffres"
      />
      <Field
        id={ids.phone}
        label="Téléphone"
        value={draft.phone}
        onChange={set("phone")}
        type="tel"
        autoComplete="tel"
      />
      <Field
        id={ids.email}
        label="E-mail"
        value={draft.email}
        onChange={set("email")}
        type="email"
        autoComplete="email"
      />
      <p className="rounded-2xl bg-ground px-3 py-2 text-sm">
        <span className="font-bold">Signature : </span>
        {signature}
      </p>
      {error ? <ErrorNotice error={error} /> : null}
      {saved && !changed ? (
        <p role="status" className="text-sm font-semibold text-ok">
          Coordonnées enregistrées.
        </p>
      ) : null}
      {changed ? (
        <Button pending={pending} onClick={() => void save()}>
          Enregistrer
        </Button>
      ) : null}
    </Card>
  );
}
