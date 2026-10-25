"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OffresAbonnement } from "@/components/offres-abonnement";
import { Button, Card } from "@/components/ui";
import { api, messageErreur, EVENEMENT_ABONNEMENT_REQUIS, type Abonnement, type Formule } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * L'ABONNEMENT ARTISAN (Greg, 24 octobre 2026) côté écran : le bandeau « Essai gratuit : encore 12 jours » (rouge après un
 * paiement refusé), le paywall « Ton essai est terminé » ouvert par toute action payante refusée (`abonnement_requis`), et
 * « Je continue » qui mène au paiement (simulé ou Stripe).
 */
export function useAbonnement() {
  const charger = useCallback((signal: AbortSignal) => api<Abonnement>("/v1/abonnement", { signal }), []);
  return useResource(charger);
}

/** « Je continue » : la page de paiement (simulée, ou Stripe Checkout) de la formule choisie. */
export async function continuerAbonnement(formule: Formule = "annuel"): Promise<void> {
  const { url } = await api<{ url: string }>("/v1/abonnement/payer", { method: "POST", body: { formule } });
  window.location.assign(url);
}

/** Le bandeau en haut de chaque écran de l'app : l'essai qui court, ou la grâce après un paiement refusé. */
export function BandeauAbonnement() {
  const { data } = useAbonnement();
  if (!data?.actif || !data.bandeau) return null;
  return (
    <Link
      href="/abonnement"
      className={`flex min-h-11 items-center justify-between gap-3 rounded-xl px-4 py-2 text-[15px] font-semibold ${data.bandeauRouge ? "bg-danger-bg text-danger" : "bg-accent-soft text-ink"}`}
    >
      <span>{data.bandeau}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

/**
 * Le contenu du paywall, mot pour mot : la phrase, l'économie réelle du premier cycle, les deux formules (l'annuel coché
 * d'office, Greg, 24 octobre 2026), « Je continue », « Pas maintenant ».
 */
export function ContenuPaywall({ abonnement, onFermer, phrase = null }: { abonnement: Abonnement; onFermer: () => void; phrase?: string | null }) {
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [formule, setFormule] = useState<Formule>("annuel");
  async function continuer() {
    setPending(true);
    setErreur(null);
    try {
      await continuerAbonnement(formule);
    } catch (e) {
      setErreur(messageErreur(e));
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <h2 id="paywall-titre" className="font-display text-[28px] leading-[1.08] font-extrabold tracking-[-0.03em]">
        {phrase ?? abonnement.paywall.phrase}
      </h2>
      {abonnement.paywall.economie ? <p className="rounded-xl bg-ok-bg p-4 text-[17px] font-bold text-ok">{abonnement.paywall.economie}</p> : null}
      <OffresAbonnement offres={abonnement.offres} choisie={formule} onChoisir={setFormule} />
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <Button onClick={() => void continuer()} pending={pending} disabled={pending} className="w-full">
        Je continue
      </Button>
      <button type="button" onClick={onFermer} className="min-h-11 self-center text-[15px] font-semibold text-muted underline">
        Pas maintenant
      </button>
    </div>
  );
}

/** Le paywall plein écran : il s'ouvre quand l'API refuse une action payante (déposer, voir les prix, commander, recommander). */
export function PaywallAbonnement() {
  // Rien n'est chargé tant qu'aucune action n'a été refusée : l'écran ne lit l'abonnement qu'à l'ouverture.
  const [data, setData] = useState<Abonnement | null>(null);
  const [phrase, setPhrase] = useState<string | null>(null);
  useEffect(() => {
    const ouvrir = (e: Event) => {
      setPhrase((e as CustomEvent<{ phrase: string | null } | null>).detail?.phrase ?? null);
      void api<Abonnement>("/v1/abonnement").then(setData, () => undefined);
    };
    window.addEventListener(EVENEMENT_ABONNEMENT_REQUIS, ouvrir);
    return () => window.removeEventListener(EVENEMENT_ABONNEMENT_REQUIS, ouvrir);
  }, []);
  if (!data) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="paywall-titre" className="fixed top-0 right-0 left-0 z-50 flex h-dvh items-end justify-center bg-ink/50 p-4 sm:items-center">
      <Card className="w-full max-w-md p-6">
        <ContenuPaywall abonnement={data} phrase={phrase} onFermer={() => setData(null)} />
      </Card>
    </div>
  );
}

/** Compte : l'abonnement en une ligne, et le lien vers « Mon abonnement » et « Mes factures ». */
export function ResumeAbonnement() {
  const { data } = useAbonnement();
  const ligne = !data ? "\u00a0" : !data.actif ? "Tout est ouvert" : data.acces === "abonne" ? `Abonné, ${data.prixHt} HT ${data.periode}` : data.acces === "grace" ? "Paiement refusé" : data.acces === "bloque" ? "Essai terminé" : "Essai gratuit";
  return (
    <Card className="flex flex-col gap-1.5 p-4">
      <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">ABONNEMENT</span>
      <span className="text-[17px] font-extrabold">{ligne}</span>
      {data?.bandeau ? <span className="text-sm text-muted">{data.bandeau}</span> : null}
      <Link href="/abonnement" className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-accent-text">
        Mon abonnement et mes factures
      </Link>
    </Card>
  );
}

const CLE_INSTALLATION = "mobiiz.installationComptee";
/**
 * L'app ouverte depuis l'écran d'accueil : comptée une fois par appareil (tableau de bord, « installations »). Rien sur la
 * personne n'est envoyé : un nombre par jour.
 */
export function CompterInstallation() {
  useEffect(() => {
    try {
      const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!standalone || localStorage.getItem(CLE_INSTALLATION)) return;
      localStorage.setItem(CLE_INSTALLATION, "1");
      void api("/v1/me/installation", { method: "POST" }).catch(() => undefined);
    } catch {
      /* navigation privée : rien à compter */
    }
  }, []);
  return null;
}

