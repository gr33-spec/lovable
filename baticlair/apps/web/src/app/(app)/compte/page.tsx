"use client";

import { AideBouton } from "@/components/aide";
import { viderCacheAppareil } from "@/components/service-worker";
import { useRouter } from "next/navigation";
import { CarteAlertesAchats, CarteSiretAchatGroupe, LienMesPrix } from "@/components/profil-achat-groupe";
import { useEffect, useId, useState } from "react";
import { AdresseMobiizCard } from "@/components/adresse-mobiiz";
import { EconomiesGroupeCard } from "@/components/economies-groupe";
import { NotificationsCard } from "@/components/notifications-card";
import { PartnerKeysCard } from "@/components/partner-keys-card";
import { BandeauAbonnement, ResumeAbonnement } from "@/components/abonnement";
import { CarteIdentite } from "@/components/envoi-negoces";
import { PlanSummary } from "@/components/paywall";
import { TradePicker } from "@/components/trade-picker";
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Field,
  PageTitle,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { nom, NOM_APP } from "@/lib/nom";
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
      await viderCacheAppareil();
      router.replace("/connexion");
    }
  }

  return (
    <>
      {/* Achat groupé (Greg, 27 octobre 2026, point 10) : « Profil », sans Retour (c'est un onglet), le bandeau de l'essai
          ici seulement, « Modifier » qui mène aux coordonnées, Mes prix, les alertes, les liens légaux en bas (pied commun). */}
      <div className="flex items-start justify-between gap-3">
        <PageTitle>Profil</PageTitle>
        <AideBouton sujet="compte" />
      </div>
      <BandeauAbonnement />
      {error ? <ErrorNotice error={error} /> : null}
      {/* Ordinateur (Greg, 31 octobre 2026, soir) : les cartes du profil sur deux colonnes, chacune entière. Téléphone :
          une colonne, l'ordre d'avant. */}
      <div className="contents lg:block lg:columns-2 lg:gap-6 lg:[&>*]:mb-6 lg:[&>*]:break-inside-avoid">
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
      {/* L'abonnement artisan (24 octobre 2026) remplace l'ancienne carte des formules (`PlanSummary`, gardée dans paywall.tsx). */}
      <ResumeAbonnement />
      {/* Lot final, point 1 : l'identité demandée au premier envoi, modifiable ici. */}
      <CarteIdentite />
      <PlanSummary />
      <Card className="flex flex-col gap-2 p-4">
        <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
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
        {company && company.role !== "viewer" ? (
          <a href="#coordonnees" className="pressable inline-flex min-h-12 items-center justify-center self-start rounded-full border border-line bg-surface px-5 text-[15px] font-semibold">
            Modifier
          </a>
        ) : null}
      </Card>
      <LienMesPrix />
      <CarteSiretAchatGroupe />
      <CarteAlertesAchats />
      {company && company.role !== "viewer" ? (
        <CompanyProfileCard signatureName={me.user.name} />
      ) : null}
      {company ? <AdresseMobiizCard /> : null}
      {company && company.role !== "viewer" ? (
        <TradesCard initial={company.trades} />
      ) : null}
      <MetiersCard />
      <NotificationsCard />
      <PartnerKeysCard />
      {company && company.role !== "viewer" ? <MemoryCard /> : null}
      {/* Sous la ligne de flottaison : la carte arrive après le chargement sans décaler le haut de l'écran (CLS), mais
          avant la déconnexion et la suppression du compte (revue à froid, 21 octobre). */}
      <EconomiesGroupeCard />
      <Button
        variant="secondary"
        pending={leaving}
        onClick={() => void signOut()}
      >
        Se déconnecter
      </Button>
      <MyData onDeleted={() => router.replace("/connexion?compte=supprime")} />
      </div>
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
      link.download = `mobiiz-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
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
      await viderCacheAppareil();
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
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
        href="/v1/me/export.pdf"
        download
        className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-accent-text"
      >
        En PDF
      </a>
      <EmailsActifs />
      <a
        href="/confidentialite"
        className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-accent-text"
      >
        Ce que {NOM_APP} garde, et combien de temps
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
              className="min-h-12 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none focus-visible:border-accent"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={deleting || word.trim().toUpperCase() !== "SUPPRIMER"}
              onClick={() => void remove()}
              className="pressable inline-flex min-h-11 items-center rounded-full bg-danger px-4 text-[14px] font-semibold text-white disabled:opacity-50"
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
          className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-danger"
        >
          Supprimer mon compte
        </button>
      )}
    </Card>
  );
}

interface MetierCouvert {
  metier: string;
  nom: string;
  etat: "brouillon" | "en validation" | "relu";
  source: "fiche" | "tiroir";
  ratios: number | null;
}

const ETATS: Record<MetierCouvert["etat"], { label: string; className: string }> = {
  relu: { label: "Relu par un artisan", className: "bg-ok-bg text-ok" },
  "en validation": { label: "En validation", className: "bg-warn-bg text-warn" },
  brouillon: { label: "Ratios en cours de validation", className: "bg-ground text-muted" },
};

/**
 * §52 (mission du fondateur, 2026-10-19) : les métiers que BatiClair sait lire et calculer, et l'état de chacun. Un
 * métier relu par un artisan perd la mention « Ratios en cours de validation » sur sa liste et chez le fournisseur.
 */
function MetiersCard() {
  const [metiers, setMetiers] = useState<MetierCouvert[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    api<{ metiers: MetierCouvert[] }>("/v1/metiers").then(
      (r) => setMetiers(r.metiers),
      (e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)),
    );
  }, []);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        MÉTIERS COUVERTS
      </h2>
      <p className="text-sm text-muted">
        Les métiers dont {NOM_APP} sait lire le devis et calculer la liste.
      </p>
      {error ? <ErrorNotice error={error} /> : null}
      {/* Revue à froid (21 octobre) : vingt-cinq lignes « ratios en cours de validation » noyaient le compte ; la liste se replie. */}
      {metiers ? (
        <details className="group">
          <summary className="min-h-10 cursor-pointer list-none py-2 text-sm font-bold text-accent-text">
            <span className="group-open:hidden">Voir les {metiers.length} métiers</span>
            <span className="hidden group-open:inline">Replier</span>
          </summary>
        <ul aria-label="Métiers couverts" className="flex flex-col divide-y divide-line">
          {metiers.map((m) => (
            <li key={m.metier} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 text-sm font-bold">{m.nom}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${ETATS[m.etat].className}`}>{ETATS[m.etat].label}</span>
            </li>
          ))}
        </ul>
        </details>
      ) : (
        // Lighthouse (CLS) : la place du bouton « Voir les N métiers » est réservée pendant le chargement.
        <p aria-busy="true" className="min-h-10 py-2" />
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
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        {`Ce que ${NOM_APP} a appris`}
      </h2>
      <p className="text-sm text-muted">
        Tes habitudes (« je façonne », la qualité d&apos;ardoise…), les ajouts
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
          className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-accent-text"
        >
          Effacer ce que {NOM_APP} a appris
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
        {NOM_APP} s&apos;en sert pour mieux lire tes devis. S&apos;applique aux
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
  // Lighthouse (CLS) : la carte se dessine tout de suite, champs grisés, et se remplit sans décaler l'écran.
  const charge = profile !== null;
  const vu: CompanyProfile = profile ?? { name: "", address: null, siret: null, phone: null, email: null, hasLogo: false };
  const changed =
    charge &&
    (draft.name !== profile.name ||
    draft.address !== (profile.address ?? "") ||
    draft.siret !== (profile.siret ?? "") ||
    draft.phone !== (profile.phone ?? "") ||
      draft.email !== (profile.email ?? ""));
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
    [signatureName, vu.name].filter(Boolean).join(" "),
    vu.phone,
    vu.email,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card id="coordonnees" className="flex scroll-mt-4 flex-col gap-3 p-4" aria-busy={!charge}>
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        TES DEMANDES DE DEVIS
      </h2>
      <p className="text-sm text-muted">
        En tête du PDF envoyé au fournisseur, et en signature du mail.
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-2xl bg-ground">
          {vu.hasLogo ? (
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
            {vu.hasLogo ? "Changer le logo" : "Ajouter le logo"}
          </label>
          <input
            id={ids.logo}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            disabled={!charge}
            onChange={(e) => void uploadLogo(e.target.files?.[0])}
          />
          {vu.hasLogo ? (
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
        disabled={!charge}
        label="Nom de l'entreprise"
        value={draft.name}
        onChange={set("name")}
        autoComplete="organization"
      />
      <Field
        id={ids.address}
        disabled={!charge}
        label="Adresse"
        value={draft.address}
        onChange={set("address")}
        autoComplete="street-address"
        placeholder="4 rue de Siam, 29200 Brest"
      />
      <Field
        id={ids.siret}
        disabled={!charge}
        label="SIRET"
        value={draft.siret}
        onChange={set("siret")}
        inputMode="numeric"
        placeholder="14 chiffres"
      />
      <Field
        id={ids.phone}
        disabled={!charge}
        label="Téléphone"
        value={draft.phone}
        onChange={set("phone")}
        type="tel"
        autoComplete="tel"
      />
      <Field
        id={ids.email}
        disabled={!charge}
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

/**
 * « Ne plus recevoir ces e-mails » (RGPD, 24 octobre 2026) : le même réglage que le lien en bas de chaque e-mail. Coupés,
 * seuls les bons de commande partent encore.
 */
function EmailsActifs() {
  const [actifs, setActifs] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    api<{ actifs: boolean }>("/v1/me/emails")
      .then((r) => setActifs(r.actifs))
      .catch(() => setActifs(null));
  }, []);
  if (actifs === null) return null;
  async function changer(v: boolean) {
    setPending(true);
    setActifs(v);
    try {
      setActifs((await api<{ actifs: boolean }>("/v1/me/emails", { method: "PUT", body: { actifs: v } })).actifs);
    } catch {
      setActifs(!v);
    } finally {
      setPending(false);
    }
  }
  return (
    <label className="flex min-h-11 items-center gap-3 text-[15px]">
      <input type="checkbox" checked={actifs} disabled={pending} onChange={(e) => void changer(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
      Recevoir les e-mails du {nom}
    </label>
  );
}
