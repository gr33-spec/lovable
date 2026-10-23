"use client";

import Link from "next/link";
import { useCallback, useId, useState, useSyncExternalStore } from "react";
import { Button, Field } from "@/components/ui";
import { api, ApiError, newActionKey } from "@/lib/api";
import { messageAuNegoceEnBoucle } from "@/lib/boucle";
import { useResource } from "@/lib/use-resource";
import { useSuggestions, type NegoceVue, type SuggestionNegoce } from "@/components/mes-negoces";

/**
 * « METS TON NÉGOCE DANS LA BOUCLE » (Greg, 23 octobre 2026). Sur l'accueil (sous le bloc du mois) et dans l'onglet
 * Commande commune, à côté d'« Inviter un collègue » : un champ e-mail (le nom, facultatif, se cherche dans Sirene et
 * apporte le SIRET), un seul bouton « Ajouter mon négoce ». Le négoce entre dans la base couverture du département,
 * jamais en double (SIRET ou e-mail) ; ajouté avant la clôture, il reçoit la commande du mois en cours, sinon la suivante.
 * Une fois ajouté : « Ton négoce X est dans la boucle », et de quoi le prévenir tout de suite (WhatsApp, SMS, copier).
 */
interface Reponse {
  negoce: { id: string; nom: string; email: string; departement: string };
  dejaLa: boolean;
  mois: { mois: string; de: string; clotureLe: string } | null;
}

const bouton = "pressable inline-flex min-h-12 items-center justify-center rounded-full px-5 text-[15px] font-semibold";

export function BoucleNegoce({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const fetchNegoces = useCallback((signal: AbortSignal) => api<{ negoces: NegoceVue[] }>("/v1/groupe/negoces", { signal }), []);
  const liste = useResource(fetchNegoces);
  const [nom, setNom] = useState("");
  const [choisi, setChoisi] = useState<SuggestionNegoce | null>(null);
  const [email, setEmail] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajoute, setAjoute] = useState<Reponse | null>(null);
  const suggestions = useSuggestions(nom, choisi === null);

  // Le groupé n'existe pas pour cette entreprise (drapeau éteint, 404) : rien ; et rien non plus avant de savoir (pas de
  // formulaire qui saute quand la liste arrive).
  if (liste.error || !liste.data) return null;
  const dansLaBoucle = (liste.data?.negoces ?? []).filter((n) => n.familles.includes("couverture") && !n.stop);

  const submit = async () => {
    setPending(true);
    setErreur(null);
    try {
      const r = await api<Reponse>("/v1/groupe/negoces/boucle", {
        method: "POST",
        body: { email: email.trim(), nom: nom.trim() || null, siret: choisi?.siret ?? null, departement: choisi?.departement ?? null },
        idempotencyKey: newActionKey(),
      });
      setAjoute(r);
      setNom("");
      setChoisi(null);
      setEmail("");
      setOuvert(false);
      liste.reload();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("internal_error", 500);
      setErreur(
        err.reason === "departement_requis"
          ? "departement"
          : err.status === 400
            ? "Vérifie l'e-mail du négoce."
            : err.status === 0
              ? "Pas de connexion internet. Rien n'est perdu : réessaie dans un instant."
              : "Ça n'a pas marché. Réessaie dans un instant.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label="Mets ton négoce dans la boucle" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-[18px] font-extrabold tracking-[-0.01em]">Mets ton négoce dans la boucle</h2>
        <p className="text-[14px] leading-relaxed text-muted">Ton négoce habituel n&apos;est pas encore dans la commande ? Ajoute-le : il recevra tout le volume du mois et pourra faire son prix.</p>
      </div>

      {dansLaBoucle.length > 0 ? (
        <ul aria-label="Négoces dans la boucle" className="flex flex-col gap-2">
          {dansLaBoucle.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-xl bg-ok-bg px-4 py-3 text-[15px] font-semibold text-ok">
              <span aria-hidden="true">✓</span>
              <span>
                Ton négoce {n.nom} est dans la boucle
                {ajoute && ajoute.negoce.id === n.id && ajoute.mois ? <span className="font-normal"> : il recevra la commande {ajoute.mois.de}.</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {ajoute ? <Prevenir negoce={ajoute.negoce} /> : null}

      {ouvert || dansLaBoucle.length === 0 ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {compact ? null : (
            <>
              <Field id={`${id}-nom`} label="Nom du négoce (facultatif)" maxLength={120} value={nom} autoComplete="off" placeholder="Tape 3 lettres, on cherche dans la base Sirene" onChange={(e) => (setNom(e.target.value), setChoisi(null))} hint={choisi ? `${choisi.adresse ? `${choisi.adresse}, ` : ""}${choisi.codePostal} ${choisi.commune} · Sirene` : undefined} />
              {suggestions.length > 0 ? (
                <ul aria-label="Négoces connus (Sirene)" className="flex flex-col divide-y divide-line rounded-xl bg-surface shadow-card">
                  {suggestions.map((s) => (
                    <li key={s.siret}>
                      <button
                        type="button"
                        className="flex min-h-12 w-full flex-col items-start gap-0.5 px-4 py-2 text-left"
                        onClick={() => {
                          setChoisi(s);
                          setNom(s.nom);
                        }}
                      >
                        <span className="text-[15px] font-bold">{s.nom}</span>
                        <span className="text-[13px] text-muted">
                          {s.adresse ? `${s.adresse}, ` : ""}
                          {s.codePostal} {s.commune}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
          <Field id={`${id}-email`} label="E-mail de ton négoce" type="email" inputMode="email" required maxLength={200} value={email} placeholder="agence@negoce.fr" onChange={(e) => setEmail(e.target.value)} error={erreur && erreur !== "departement" ? erreur : undefined} />
          {erreur === "departement" ? (
            <p className="text-[14px] font-semibold text-danger">
              Il manque l&apos;adresse de ton entreprise pour savoir dans quel département il travaille.{" "}
              <Link href="/compte" className="underline">
                Renseigne-la dans Compte
              </Link>
              .
            </p>
          ) : null}
          <Button type="submit" pending={pending} className="self-start">
            Ajouter mon négoce
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => setOuvert(true)} className="self-start text-[15px] font-semibold text-accent-text underline-offset-4 hover:underline">
          Ajouter un autre négoce
        </button>
      )}
    </section>
  );
}

/** Le négoce vient d'entrer : le prévenir tout de suite, avec le message vouvoyé (WhatsApp, SMS, copier). Rien ne part seul. */
function Prevenir({ negoce }: { negoce: { nom: string; email: string } }) {
  const lien = useSyncExternalStore(
    () => () => undefined,
    () => `${window.location.origin}/`,
    () => "/",
  );
  const [copie, setCopie] = useState(false);
  const message = messageAuNegoceEnBoucle(lien);
  async function copier() {
    try {
      await navigator.clipboard.writeText(message);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  }
  return (
    <div aria-label={`Prévenir ${negoce.nom}`} role="group" className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">Préviens-le toi-même, il te connaît :</p>
      <p className="rounded-xl bg-ground px-4 py-3 text-[14px] leading-relaxed">{message}</p>
      <div className="flex flex-wrap gap-3">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={`${bouton} bg-accent text-white hover:bg-accent-text`}>
          Envoyer sur WhatsApp
        </a>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className={`${bouton} border border-line bg-surface text-ink hover:border-ink`}>
          Envoyer par SMS
        </a>
        <button type="button" onClick={copier} className={`${bouton} border border-line bg-surface text-ink hover:border-ink`}>
          {copie ? "Message copié" : "Copier le message"}
        </button>
      </div>
    </div>
  );
}
