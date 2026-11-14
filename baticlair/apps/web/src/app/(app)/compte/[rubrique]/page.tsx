"use client";

import { ChevronRight, Mail } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ResumeAbonnement } from "@/components/abonnement";
import { AdresseMobiizCard } from "@/components/adresse-mobiiz";
import { EditeurApparence } from "@/components/apparence-editeur";
import { DossierProfessionnel, GuideEtChantierFictif, OuLireLesReponses, ProfilPublicEditeur, ReglagesNotifications } from "@/components/compte-missions";
import { ButtonLink } from "@/components/ui";
import { EnTeteRubrique } from "@/components/en-tete-rubrique";
import { CompteursAnalyses } from "@/components/coup-de-main-ia";
import { CarteIdentite } from "@/components/envoi-negoces";
import { NotificationsCard } from "@/components/notifications-card";
import { PartnerKeysCard } from "@/components/partner-keys-card";
import { PlanSummary } from "@/components/paywall";
import { CarteAlertesAchats, CarteSiretAchatGroupe, LienMesPrix } from "@/components/profil-achat-groupe";
import { CompanyProfileCard, EmailsActifs, MemoryCard, MetiersCard, MyData, TradesCard } from "@/components/profil-cartes";
import { viderCacheAppareil } from "@/components/service-worker";
import { Badge, Button, Card, ErrorNotice } from "@/components/ui";
import { AIDES } from "@/lib/aide";
import { api, ApiError } from "@/lib/api";
import { EDITEUR, PAGES_LEGALES } from "@/lib/legal";
import { NOM_APP } from "@/lib/nom";
import { useRubriquesMasquees } from "@/lib/missions";
import { ligneProfil, type RubriqueProfil } from "@/lib/rubriques-profil";
import { useResource } from "@/lib/use-resource";
import { useSession } from "@/lib/session";

/**
 * UNE RUBRIQUE DE « PROFIL ET PARAMÈTRES » (Greg, 1er novembre 2026) : une flèche retour, le titre, puis les cartes
 * d'avant, rangées par sujet. Aucune logique n'est réécrite ici : chaque carte garde ses routes et ses droits.
 */
export default function RubriquePage() {
  const { rubrique } = useParams<{ rubrique: string }>();
  const trouvee = ligneProfil(rubrique);
  const masquees = useRubriquesMasquees();
  // Une rubrique sortie du MVP (Greg, 12 novembre 2026) ne s'ouvre pas non plus par son ancienne adresse.
  const ligne = trouvee?.masquable && masquees[trouvee.masquable] ? null : trouvee;
  if (!ligne) {
    return (
      <>
        <EnTeteRubrique titre={trouvee ? "Rubrique indisponible" : "Rubrique introuvable"} />
        {trouvee ? <p className="text-[15px] text-muted">Cette rubrique n&apos;est pas proposée pour le moment.</p> : null}
        <Link href="/compte" className="text-[15px] font-semibold text-accent-text">
          Revenir à Profil et paramètres
        </Link>
      </>
    );
  }
  // Apparence a son propre écran (onglets, aperçu, enregistrement) : son retour demande confirmation s'il reste un changement.
  if (ligne.id === "apparence") return <EditeurApparence />;
  return (
    <>
      <EnTeteRubrique titre={ligne.titre} />
      <div className="grid grid-cols-1 gap-4 lg:max-w-3xl">
        <Contenu id={ligne.id} />
      </div>
    </>
  );
}

function Contenu({ id }: { id: Exclude<RubriqueProfil, "apparence"> }) {
  const { me, company } = useSession();
  const router = useRouter();
  const editeur = !!company && company.role !== "viewer";
  switch (id) {
    case "informations":
      return <Informations />;
    case "entreprise":
      return (
        <>
          <ChoixEntreprise />
          <CarteIdentite />
          {editeur ? <CompanyProfileCard signatureName={me.user.name} avecLogo={false} /> : null}
          <CarteSiretAchatGroupe />
          {editeur && company ? <TradesCard initial={company.trades} /> : null}
          <MetiersCard />
        </>
      );
    case "profil-public":
      return <ProfilPublicEditeur />;
    case "documents":
      return <DossierProfessionnel />;
    case "guide":
      return <GuideEtChantierFictif />;
    case "notifications":
      return (
        <>
          <ReglagesNotifications />
          <NotificationsCard />
          <CarteAlertesAchats />
          <Card className="flex flex-col gap-1 p-4">
            <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">E-mails</h2>
            <EmailsActifs />
            <p className="text-[13px] text-muted">Coupés, seuls les bons de commande partent encore.</p>
          </Card>
        </>
      );
    case "abonnement":
      return (
        <>
          <ResumeAbonnement />
          <Analyses />
          <PlanSummary />
          {/* Greg, 10 novembre 2026 : l'abonnement, les factures et les reçus de paiement au même endroit. */}
          <ButtonLink href="/abonnement" variant="secondary">
            Voir mes factures et reçus de paiement
          </ButtonLink>
        </>
      );
    case "adresse":
      return (
        <>
          {company ? <AdresseMobiizCard /> : null}
          <OuLireLesReponses />
          <LienMesPrix />
        </>
      );
    case "connexions":
      return <PartnerKeysCard />;
    case "preferences":
      return editeur ? (
        <MemoryCard />
      ) : (
        <Card className="p-4 text-[15px] text-muted">Seul un membre qui peut modifier l&apos;entreprise peut effacer ce que {NOM_APP} a appris.</Card>
      );
    case "donnees":
      return (
        <>
          <MyData avecEmails={false} onDeleted={() => router.replace("/connexion?compte=supprime")} />
          {/* La remise à zéro de ce que Mobiiz a retenu reste toujours disponible ici, rubrique « Mémoire » affichée ou non. */}
          {editeur ? <MemoryCard /> : null}
        </>
      );
    case "aide":
      return <Aide />;
  }
}

/** Nom, e-mail, sa confirmation (le renvoi du lien), et la déconnexion : repris tels quels de l'ancien Profil. */
function Informations() {
  const router = useRouter();
  const { me, features } = useSession();
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
      await viderCacheAppareil();
      router.replace("/connexion");
    }
  }

  return (
    <>
      {error ? <ErrorNotice error={error} /> : null}
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Nom</span>
          <span className="text-[16px] font-bold">{me.user.name}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">E-mail</span>
          <span className="text-[16px] break-all">{me.user.email}</span>
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
      <Card className="flex flex-col gap-1 p-4">
        <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Sécurité</h2>
        <p className="text-[14px] text-muted">
          Ton mot de passe se change depuis l&apos;écran de connexion, avec « Mot de passe oublié ? » : un lien t&apos;arrive par e-mail.
        </p>
      </Card>
      <Button variant="secondary" pending={leaving} onClick={() => void signOut()}>
        Se déconnecter
      </Button>
    </>
  );
}

/** Plusieurs entreprises : le choix de l'entreprise active (repris de l'ancien Profil). */
function ChoixEntreprise() {
  const { me, company, chooseCompany } = useSession();
  return (
    <Card className="flex flex-col gap-2 p-4">
      <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">ENTREPRISE</span>
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
  );
}

type Quotas = Parameters<typeof CompteursAnalyses>[0]["quotas"];

/** Les analyses restantes de l'offre (les mêmes compteurs que « Ma liste de matériaux »), quand l'offre en a. */
function Analyses() {
  const lire = useCallback((signal: AbortSignal) => api<{ quotas?: Quotas | null }>("/v1/ai-usage/jauge", { signal }).catch(() => null), []);
  const { data } = useResource(lire);
  if (!data?.quotas) return null;
  return (
    <Card className="p-4">
      <CompteursAnalyses quotas={data.quotas} />
    </Card>
  );
}

/** Aide et contact : les réponses courtes de l'aide (les mêmes que le « ? »), l'adresse de contact et les pages légales. */
function Aide() {
  return (
    <>
      <Card className="flex flex-col gap-4 p-4">
        {Object.values(AIDES).map((a) => (
          <section key={a.titre} aria-label={a.titre} className="flex flex-col gap-1">
            <h2 className="text-[15px] font-bold">{a.titre}</h2>
            {a.lignes.filter(Boolean).map((l) => (
              <p key={l} className="text-[14px] leading-snug text-muted">
                {l}
              </p>
            ))}
          </section>
        ))}
      </Card>
      <a href={`mailto:${EDITEUR.contact}`} className="pressable flex min-h-14 items-center gap-3 rounded-xl bg-surface px-4 shadow-card">
        <Mail size={20} aria-hidden="true" className="text-muted" />
        <span className="flex grow flex-col">
          <span className="text-[16px] font-semibold">Nous écrire</span>
          <span className="text-[13px] text-muted">{EDITEUR.contact}</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className="text-muted" />
      </a>
      <nav aria-label="Pages légales" className="flex flex-wrap gap-x-4 gap-y-1">
        {PAGES_LEGALES.map((p) => (
          <Link key={p.href} href={p.href} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent-text">
            {p.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
