"use client";

import { useState } from "react";
import { LiensLegaux } from "@/components/legal";
import { Button, Field, PageTitle } from "@/components/ui";
import { api } from "@/lib/api";
import { NOM } from "@/lib/nom";

/** LA CONNEXION DU NÉGOCE (point 1) : un e-mail, un lien magique, pas de mot de passe. La réponse est la même, adresse connue ou non. */
export default function ConnexionNegocePage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(false);
  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErreur(false);
    try {
      await api("/v1/negoce/connexion", { method: "POST", body: { email: email.trim() } });
      setEnvoye(true);
    } catch {
      setErreur(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle>Espace négoce</PageTitle>
      <p className="text-[16px] leading-relaxed text-muted">Votre accès à la {NOM} : indiquez votre e-mail, vous recevez un lien de connexion. Pas de mot de passe.</p>
      {envoye ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[16px] font-semibold text-ok">
          Si un accès existe pour cette adresse, un lien de connexion vient de partir. Il est valable 30 minutes.
        </p>
      ) : (
        <form onSubmit={envoyer} aria-label="Recevoir mon lien de connexion" className="flex flex-col gap-4" noValidate>
          <Field id="negoce-connexion-email" label="E-mail" type="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {erreur ? (
            <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">
              Ça n&apos;a pas marché. Réessayez dans un instant.
            </p>
          ) : null}
          <Button type="submit" pending={pending} disabled={!email.trim()}>
            Recevoir mon lien
          </Button>
        </form>
      )}
      <footer className="mt-4 flex flex-col gap-2 text-[14px] text-muted">
        <p>Pas encore d&apos;accès ? Il se crée depuis le lien d&apos;invitation reçu par e-mail quand un artisan vous ajoute.</p>
        <LiensLegaux />
      </footer>
    </>
  );
}
