"use client";

import { Check, Copy, Inbox, Mail } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { Button, Card, ErrorNotice, Field, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur, type EtatAdresseMobiiz } from "@/lib/api";
import { NOM_APP } from "@/lib/nom";
import { phrasesAdresse } from "../../../../packages/domain/src/groupe/adresse-mobiiz";
import { useResource } from "@/lib/use-resource";

const PHRASES_ADRESSE = phrasesAdresse(NOM_APP);

/**
 * R7 (Greg, 27 octobre 2026) : L'ARTISAN DOIT COMPRENDRE SON ADRESSE. Trois endroits, les mêmes phrases : l'écran dédié
 * après l'inscription (« Voici ton adresse Mobiiz : … »), le bloc « Mon adresse Mobiiz » dans Compte (copier, « Donne-la
 * à tes négoces ») et le rappel en une ligne au premier envoi.
 */
export function useAdresseMobiiz() {
  const charger = useCallback((signal: AbortSignal) => api<EtatAdresseMobiiz>("/v1/company/adresse-mobiiz", { signal }), []);
  return useResource(charger);
}

/** L'adresse complète à montrer : avec le domaine, ou le nom seul quand l'application n'a pas encore de domaine. */
export const adresseAffichee = (e: EtatAdresseMobiiz): string => e.email ?? e.adresse;

function BoutonCopier({ texte, compact = false }: { texte: string; compact?: boolean }) {
  const [copie, setCopie] = useState(false);
  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      // Sans presse-papiers (ancien navigateur) : l'adresse est sélectionnable à la main.
      const z = document.createElement("textarea");
      z.value = texte;
      document.body.appendChild(z);
      z.select();
      try {
        document.execCommand("copy");
      } finally {
        z.remove();
      }
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }
  return (
    <Button type="button" variant={compact ? "secondary" : "primary"} onClick={() => void copier()} className={compact ? "min-h-11 px-3 text-[14px]" : "min-h-12"} aria-live="polite">
      {copie ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
      {copie ? "Copiée" : "Copier l'adresse"}
    </Button>
  );
}

/** L'adresse en gros, sélectionnable, qui tient sur un iPhone de 375 px (coupure autorisée au tiret). */
function AdresseEnGros({ adresse }: { adresse: string }) {
  return (
    <p className="rounded-2xl bg-ground px-4 py-3 font-display text-[20px] leading-tight font-extrabold break-all select-all" aria-label="Ton adresse Mobiiz">
      {adresse}
    </p>
  );
}

/**
 * L'ÉCRAN DÉDIÉ, juste après l'inscription (Greg, 27 octobre 2026, mot pour mot) : « Voici ton adresse Mobiiz : …
 * C'est elle qui envoie tes demandes de prix. Les réponses des négoces arrivent ici, dans Mobiiz. »
 */
export function EcranAdresseMobiiz({ onContinuer }: { onContinuer: () => void }) {
  const { data, error, reload } = useAdresseMobiiz();
  const [pending, setPending] = useState(false);
  async function compris() {
    setPending(true);
    try {
      await api("/v1/company/adresse-mobiiz/vue", { method: "POST" });
    } catch {
      // Déjà vue, ou réseau : on n'empêche jamais d'entrer dans l'application.
    }
    onContinuer();
  }
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={3} label="Préparation de ton adresse…" />;
  return (
    <section aria-label="Bienvenue : ton adresse" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-on-accent">
          <Mail size={24} aria-hidden="true" />
        </span>
        <h1 className="font-display text-[26px] leading-tight font-extrabold">{PHRASES_ADRESSE.titre}</h1>
      </div>
      <AdresseEnGros adresse={adresseAffichee(data)} />
      <p className="text-[17px] leading-relaxed">
        {PHRASES_ADRESSE.envoie} {PHRASES_ADRESSE.recoit}
      </p>
      {!data.email ? <p className="text-[14px] text-muted">Le domaine d&apos;e-mail n&apos;est pas encore branché sur cet environnement : rien n&apos;y arrive pour l&apos;instant.</p> : null}
      <div className="flex flex-col gap-2">
        <BoutonCopier texte={adresseAffichee(data)} />
        <Button type="button" variant="secondary" className="min-h-12" pending={pending} onClick={() => void compris()}>
          C&apos;est compris
        </Button>
        <Link href="/compte#adresse" className="inline-flex min-h-11 items-center justify-center text-[14px] font-bold text-accent-text">
          La modifier
        </Link>
      </div>
    </section>
  );
}

/** Le bloc « Mon adresse Mobiiz » dans Compte : copier, « Donne-la à tes négoces », la changer une fois. */
export function AdresseMobiizCard() {
  const { data, setData, error, reload } = useAdresseMobiiz();
  const ids = { adresse: useId() };
  const [souhaitee, setSouhaitee] = useState("");
  const [verif, setVerif] = useState<{ adresse: string; libre: boolean; raison: string | null } | null>(null);
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);

  async function verifier() {
    setPending(true);
    setRefus(null);
    try {
      setVerif(await api("/v1/company/adresse-mobiiz/verifier", { method: "POST", body: { adresse: souhaitee.trim().toLowerCase() } }));
    } catch (e) {
      setRefus(messageErreur(e));
    } finally {
      setPending(false);
    }
  }
  async function changer() {
    setPending(true);
    setRefus(null);
    try {
      setData(await api<EtatAdresseMobiiz>("/v1/company/adresse-mobiiz", { method: "PUT", body: { adresse: souhaitee.trim().toLowerCase() } }));
      setOuvert(false);
      setSouhaitee("");
      setVerif(null);
    } catch (e) {
      setRefus(e instanceof ApiError ? messageErreur(e) : "Le changement n'a pas pu être enregistré.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card id="adresse" className="flex flex-col gap-3 p-4" aria-label="Mon adresse Mobiiz" aria-busy={!data && !error}>
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">MON ADRESSE {NOM_APP.toUpperCase()}</h2>
      {error && !data ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <AdresseEnGros adresse={adresseAffichee(data)} />
          <p className="text-[15px] leading-relaxed">{PHRASES_ADRESSE.donne}</p>
          <p className="text-[14px] text-muted">
            {PHRASES_ADRESSE.envoie} {PHRASES_ADRESSE.recoit}
          </p>
          {!data.email ? <p className="text-[14px] text-muted">Le domaine d&apos;e-mail n&apos;est pas encore branché sur cet environnement : rien n&apos;y arrive pour l&apos;instant.</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <BoutonCopier texte={adresseAffichee(data)} compact />
            <Link href="/recus" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[14px] font-bold">
              <Inbox size={16} aria-hidden="true" />
              Mes reçus
            </Link>
            {data.modifiable && !ouvert ? (
              <button type="button" onClick={() => setOuvert(true)} className="inline-flex min-h-11 items-center text-[14px] font-bold text-accent-text">
                La modifier
              </button>
            ) : null}
          </div>
          {data.anciennes.length ? (
            <p className="text-[13px] text-muted">
              Ancienne adresse, toujours valable : {data.anciennes.map((a) => (data.domaine ? `${a}@${data.domaine}` : a)).join(", ")}.
            </p>
          ) : null}
          {ouvert && data.modifiable ? (
            <form
              className="flex flex-col gap-3 rounded-2xl bg-ground p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void (verif?.libre && verif.adresse === souhaitee.trim().toLowerCase() ? changer() : verifier());
              }}
            >
              <Field
                id={ids.adresse}
                label="Nouvelle adresse (une seule fois)"
                hint={data.domaine ? `Lettres sans accent, chiffres et tirets, puis @${data.domaine}. L'ancienne reste valable.` : "Lettres sans accent, chiffres et tirets. L'ancienne reste valable."}
                value={souhaitee}
                onChange={(e) => {
                  setSouhaitee(e.target.value);
                  setVerif(null);
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                error={verif && !verif.libre ? (verif.raison ?? "Adresse refusée.") : refus ? refus : undefined}
              />
              {verif?.libre && verif.adresse === souhaitee.trim().toLowerCase() ? <p className="text-[14px] font-semibold text-ok">Libre.</p> : null}
              <div className="flex gap-2">
                <Button type="submit" className="min-h-11 px-4" pending={pending} disabled={souhaitee.trim().length < 3}>
                  {verif?.libre && verif.adresse === souhaitee.trim().toLowerCase() ? "Changer mon adresse" : "Vérifier"}
                </Button>
                <Button type="button" variant="secondary" className="min-h-11 px-4" onClick={() => setOuvert(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

/** Le rappel en une ligne au premier envoi (Greg, 27 octobre 2026). */
export function RappelAdresseMobiiz() {
  const { data } = useAdresseMobiiz();
  if (!data || data.envois > 0) return null;
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 text-[14px] shadow-card" role="note">
      <Mail size={16} aria-hidden="true" className="shrink-0 text-muted" />
      <span>
        {PHRASES_ADRESSE.rappel} <span className="font-semibold">{adresseAffichee(data)}</span>
      </span>
    </p>
  );
}
