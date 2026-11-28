"use client";

import { BellRing, Check, Copy, Mail, MessageCircle, MessageSquare, Share2, UserPlus, X } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * CHANTIER 05 (Greg, 28 novembre 2026), deux encarts discrets en bas de l'accueil, sous les actions prioritaires :
 * 1) LA LISTE D'ATTENTE, seulement quand le métier ou le département de l'entreprise n'est pas encore ouvert : inscrit,
 *    « On t'écrit dès que Mobiiz ouvre pour les plaquistes du 22 » et « Me désinscrire » ; pas inscrit, la question, la
 *    disponibilité réelle et une case à cocher (jamais cochée d'office), puis « M'inscrire ».
 * 2) « INVITE D'AUTRES ARTISANS » : le lien personnel, partagé par l'artisan lui-même (SMS, WhatsApp, e-mail, copier).
 *    Aucune récompense, aucun envoi à ses contacts. Fermable pour de bon sur cet appareil.
 */
interface Communaute {
  attente: { ouvert: boolean; inscrit: boolean; prevenu: boolean; phrase: string; question: string; disponibilite: string; consentement: string };
  invitation: { lien: string; message: string; phrase: string };
}

const CLE_INVITATION = "mobiiz.accueil.invitation";
const CLE_ATTENTE = "mobiiz.accueil.liste-attente";
const lire = (cle: string): string | null => {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
};
const ecrire = (cle: string, valeur: string) => {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    /* navigation privée : l'encart se refermera à la prochaine visite, rien ne casse */
  }
};
const sansAbonnement = () => () => {};

export function CommunauteAccueil() {
  const charger = useCallback((s: AbortSignal) => api<Communaute>("/v1/communaute", { signal: s }).catch(() => null), []);
  const { data, setData } = useResource(charger);
  if (!data) return null;
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-6">
      {!data.attente.ouvert ? <EncartAttente etat={data} surChange={setData} /> : null}
      <EncartInviter invitation={data.invitation} />
    </div>
  );
}

function Fermer({ etiquette, onClick }: { etiquette: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={etiquette} onClick={onClick} className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full">
      <X size={18} aria-hidden="true" />
    </button>
  );
}

function EncartAttente({ etat, surChange }: { etat: Communaute; surChange: (c: Communaute) => void }) {
  const a = etat.attente;
  const ferme = useSyncExternalStore(sansAbonnement, () => lire(CLE_ATTENTE) === "ferme", () => true);
  const [fermeIci, setFermeIci] = useState(false);
  const [coche, setCoche] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState(false);

  async function agir(inscrire: boolean) {
    setPending(true);
    setErreur(false);
    try {
      surChange(await api<Communaute>("/v1/communaute/liste-attente", inscrire ? { method: "POST", body: { consentement: true } } : { method: "DELETE" }));
      setCoche(false);
    } catch {
      setErreur(true);
    } finally {
      setPending(false);
    }
  }

  // Inscrit : l'état se voit toujours, il ne se ferme pas.
  if (a.inscrit) {
    return (
      <section aria-labelledby="t-liste-attente" className="accueil-apparait flex flex-col gap-2 rounded-[20px] bg-surface p-4 shadow-card">
        <h2 id="t-liste-attente" className="flex items-center gap-2 text-[15px] font-extrabold">
          <span className="grid size-7 place-items-center rounded-full bg-ok text-white" aria-hidden="true">
            <Check size={15} strokeWidth={3} />
          </span>
          Tu es sur la liste
        </h2>
        <p className="text-[15px] leading-snug">{a.phrase}</p>
        <p className="text-[14px] leading-snug text-muted">{a.disponibilite}</p>
        {erreur ? <p className="text-[14px] font-semibold text-danger">Ça n&apos;a pas marché. Réessaie dans un instant.</p> : null}
        <button type="button" onClick={() => void agir(false)} disabled={pending} className="flex min-h-11 items-center self-start text-[15px] font-semibold underline underline-offset-4 disabled:opacity-50">
          Me désinscrire
        </button>
      </section>
    );
  }
  if (ferme || fermeIci) return null;
  return (
    <section aria-labelledby="t-liste-attente" className="accueil-apparait flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h2 id="t-liste-attente" className="flex items-center gap-2 text-[15px] font-extrabold">
          <BellRing size={18} aria-hidden="true" />
          {a.question}
        </h2>
        <Fermer
          etiquette="Fermer la liste d'attente"
          onClick={() => {
            ecrire(CLE_ATTENTE, "ferme");
            setFermeIci(true);
          }}
        />
      </div>
      <p className="text-[14px] leading-snug text-muted">{a.disponibilite}</p>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px] leading-snug">
        <input type="checkbox" checked={coche} onChange={(e) => setCoche(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
        <span>{a.consentement}</span>
      </label>
      {erreur ? <p className="text-[14px] font-semibold text-danger">Ça n&apos;a pas marché. Réessaie dans un instant.</p> : null}
      <Button variant="secondary" disabled={!coche} pending={pending} onClick={() => void agir(true)} className="self-start">
        M&apos;inscrire
      </Button>
    </section>
  );
}

function EncartInviter({ invitation }: { invitation: Communaute["invitation"] }) {
  const ferme = useSyncExternalStore(sansAbonnement, () => lire(CLE_INVITATION) === "ferme", () => true);
  const [fermeIci, setFermeIci] = useState(false);
  const [copie, setCopie] = useState(false);
  const partageNatif = useSyncExternalStore(sansAbonnement, () => typeof navigator !== "undefined" && typeof navigator.share === "function", () => false);
  if (ferme || fermeIci) return null;
  const texte = encodeURIComponent(invitation.message);
  const lien = "pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold";

  async function copier() {
    try {
      await navigator.clipboard.writeText(invitation.lien);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  }

  return (
    <section aria-labelledby="t-inviter" className="accueil-apparait flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h2 id="t-inviter" className="flex items-center gap-2 text-[15px] font-extrabold">
          <UserPlus size={18} aria-hidden="true" />
          Invite d&apos;autres artisans
        </h2>
        <Fermer
          etiquette="Fermer l'invitation"
          onClick={() => {
            ecrire(CLE_INVITATION, "ferme");
            setFermeIci(true);
          }}
        />
      </div>
      <p className="text-[15px] leading-snug">{invitation.phrase}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Partager mon lien d'invitation">
        {partageNatif ? (
          <button type="button" className={lien} onClick={() => void navigator.share({ title: "Mobiiz", text: invitation.message }).catch(() => undefined)}>
            <Share2 size={17} aria-hidden="true" /> Partager
          </button>
        ) : null}
        <a className={lien} href={`sms:?&body=${texte}`}>
          <MessageSquare size={17} aria-hidden="true" /> SMS
        </a>
        <a className={lien} href={`https://wa.me/?text=${texte}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={17} aria-hidden="true" /> WhatsApp
        </a>
        <a className={lien} href={`mailto:?subject=${encodeURIComponent("Je t'invite sur Mobiiz")}&body=${texte}`}>
          <Mail size={17} aria-hidden="true" /> E-mail
        </a>
        <button type="button" className={lien} onClick={() => void copier()}>
          {copie ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />} {copie ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
    </section>
  );
}
