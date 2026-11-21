"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button, Card, INPUT } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

const MIN = 10;

/** La phrase d'un refus, sans jamais dire plus que nécessaire (un mot de passe actuel faux ne dit rien d'autre). */
function phraseRefus(e: unknown): { champ: "actuel" | "nouveau" | null; phrase: string } {
  if (e instanceof ApiError) {
    if (e.status === 429) return { champ: null, phrase: "Trop d'essais. Réessaie dans une heure, ou passe par « Mot de passe oublié ? »." };
    if (e.code === "INVALID_PASSWORD" || e.code === "CREDENTIAL_ACCOUNT_NOT_FOUND")
      return { champ: "actuel", phrase: "Le mot de passe actuel ne correspond pas." };
    if (e.code === "PASSWORD_TOO_SHORT") return { champ: "nouveau", phrase: `Le nouveau mot de passe doit faire au moins ${MIN} caractères.` };
    if (e.code === "PASSWORD_TOO_LONG") return { champ: "nouveau", phrase: "Le nouveau mot de passe est trop long." };
    if (e.code === "PASSWORD_COMPROMISED") return { champ: "nouveau", phrase: "Ce mot de passe a déjà fuité sur Internet. Choisis-en un autre." };
    if (e.code === "network") return { champ: null, phrase: "Pas de connexion. Vérifie ton réseau, puis réessaie." };
  }
  return { champ: null, phrase: "Le mot de passe n'a pas pu être changé. Réessaie dans un instant." };
}

function Champ({
  id,
  label,
  valeur,
  onChange,
  autoComplete,
  erreur,
  aide,
}: {
  id: string;
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  autoComplete: string;
  erreur?: string | null;
  aide?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
          className={`${INPUT} w-full pr-14 ${erreur ? "border-danger" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Masquer : ${label}` : `Afficher : ${label}`}
          className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink"
        >
          {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
      {erreur ? (
        <p id={`${id}-erreur`} role="alert" className="text-[14px] font-semibold text-danger">
          {erreur}
        </p>
      ) : aide ? (
        <p id={`${id}-aide`} className="text-[13px] text-muted">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

/**
 * MODIFIER MON MOT DE PASSE (Greg, 15 novembre 2026, lot B, capture 3 : « le seul chemin proposé est Mot de passe oublié »).
 * Mot de passe actuel, nouveau, confirmation, afficher / masquer, règles visibles, erreurs sur leur champ. Le serveur
 * (Better Auth) vérifie l'actuel, refuse un mot de passe trop court ou déjà fuité, et limite les essais (5 par heure).
 * Sessions : cet appareil reste connecté ; « Déconnecter mes autres appareils » (coché d'office) ferme les autres.
 * Un compte créé avec Google ou Microsoft n'a pas de mot de passe ici : on le dit, sans formulaire inutile.
 */
export function ChangerMotDePasse() {
  const { data: comptes } = useResource(
    useCallback((s: AbortSignal) => api<{ providerId?: string; provider?: string }[]>("/v1/auth/list-accounts", { signal: s }).catch(() => null), []),
  );
  const [ouvert, setOuvert] = useState(false);
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [autres, setAutres] = useState(true);
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<{ champ: "actuel" | "nouveau" | "confirmation" | null; phrase: string } | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const fournisseurs = (comptes ?? []).map((c) => c.providerId ?? c.provider ?? "");
  const sansMotDePasse = comptes !== null && comptes !== undefined && comptes.length > 0 && !fournisseurs.includes("credential");

  async function envoyer(event: React.FormEvent) {
    event.preventDefault();
    setFait(null);
    if (!actuel) return setRefus({ champ: "actuel", phrase: "Indique ton mot de passe actuel." });
    if (nouveau.length < MIN) return setRefus({ champ: "nouveau", phrase: `Le nouveau mot de passe doit faire au moins ${MIN} caractères.` });
    if (nouveau === actuel) return setRefus({ champ: "nouveau", phrase: "Choisis un mot de passe différent de l'actuel." });
    if (confirmation !== nouveau) return setRefus({ champ: "confirmation", phrase: "Les deux mots de passe ne sont pas identiques." });
    setPending(true);
    setRefus(null);
    try {
      await api("/v1/auth/change-password", { method: "POST", body: { currentPassword: actuel, newPassword: nouveau, revokeOtherSessions: autres } });
      setFait(
        autres
          ? "Mot de passe modifié. Tes autres appareils sont déconnectés ; celui-ci reste connecté."
          : "Mot de passe modifié. Tes appareils restent connectés.",
      );
      setActuel("");
      setNouveau("");
      setConfirmation("");
      setOuvert(false);
    } catch (e) {
      setRefus(phraseRefus(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Sécurité</h2>
      {fait ? (
        <p role="status" className="rounded-xl bg-ok-bg p-3 text-[15px] font-semibold text-ok">
          {fait}
        </p>
      ) : null}
      {sansMotDePasse ? (
        <p className="text-[15px] leading-relaxed text-muted">
          Tu te connectes avec {fournisseurs.includes("google") ? "Google" : fournisseurs.includes("microsoft") ? "Microsoft" : "un autre service"} : ton mot de
          passe se gère chez lui, pas dans Mobiiz.
        </p>
      ) : !ouvert ? (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setOuvert(true);
              setFait(null);
            }}
          >
            Modifier mon mot de passe
          </Button>
          {/* Greg, 19 novembre 2026 : un compte créé par la carte n'a pas de mot de passe connu (il se connecte par lien). Pour
              en choisir un : un lien par e-mail, le même chemin sûr que « Mot de passe oublié » (anti-robot compris). */}
          <Link
            href="/mot-de-passe-oublie?choisir=1"
            className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-accent-text underline underline-offset-4"
          >
            Choisir un mot de passe
          </Link>
          <p className="text-[13px] text-muted">Tu te connectes par lien et tu veux aussi un mot de passe ? On t&apos;envoie un lien pour le choisir.</p>
        </>
      ) : (
        <form onSubmit={(e) => void envoyer(e)} noValidate className="flex flex-col gap-3" aria-label="Modifier mon mot de passe">
          <Champ
            id="mdp-actuel"
            label="Mot de passe actuel"
            valeur={actuel}
            onChange={setActuel}
            autoComplete="current-password"
            erreur={refus?.champ === "actuel" ? refus.phrase : null}
          />
          <Champ
            id="mdp-nouveau"
            label="Nouveau mot de passe"
            valeur={nouveau}
            onChange={setNouveau}
            autoComplete="new-password"
            erreur={refus?.champ === "nouveau" ? refus.phrase : null}
            aide={`${MIN} caractères au moins. Un mot de passe déjà fuité sur Internet est refusé.`}
          />
          <Champ
            id="mdp-confirmation"
            label="Confirmer le nouveau mot de passe"
            valeur={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
            erreur={refus?.champ === "confirmation" ? refus.phrase : null}
          />
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" checked={autres} onChange={(e) => setAutres(e.target.checked)} className="mt-1 size-5 shrink-0 accent-accent" />
            <span className="text-[15px] leading-relaxed">Déconnecter mes autres appareils</span>
          </label>
          {refus && refus.champ === null ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {refus.phrase}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" pending={pending}>
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOuvert(false);
                setRefus(null);
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
      <p className="text-[14px] text-muted">
        Mot de passe oublié ?{" "}
        <Link href="/mot-de-passe-oublie" className="font-semibold underline underline-offset-4">
          Recevoir un lien par e-mail
        </Link>
      </p>
    </Card>
  );
}
