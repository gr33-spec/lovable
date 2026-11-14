"use client";

import { useState } from "react";
import { Turnstile, TURNSTILE_ACTIF } from "@/components/turnstile";
import { Button, Field } from "@/components/ui";
import { EnteteVitrine, PiedVitrine } from "@/components/vitrine";
import { api } from "@/lib/api";
import { NOM_APP } from "@/lib/nom";

/**
 * LA CONNEXION DU NÉGOCE (point 1) : un e-mail, un lien magique, pas de mot de passe. La réponse est la même, adresse connue ou
 * non. La page publique du négoce (landing « niveau studio », Greg, 26 octobre 2026) : à gauche, ce que Mobiiz lui apporte, en
 * vouvoiement ; à droite, le formulaire, inchangé. Avant : « Votre accès au commande commune » (mot retiré partout).
 */
export default function ConnexionNegocePage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErreur(false);
    try {
      await api("/v1/negoce/connexion", { method: "POST", body: { email: email.trim() }, captcha });
      setEnvoye(true);
    } catch {
      setErreur(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mz">
      <div className="mz-page">
        <EnteteVitrine negoce />
        <main className="mz-negoce-page">
          <section aria-labelledby="negoce-titre">
            <p className="mz-kicker mz-etiq">Pour les négoces</p>
            <h1 id="negoce-titre" className="mz-titre mz-h1" style={{ fontSize: "clamp(48px, 11vw, 92px)" }}>
              Des demandes propres. <span className="mz-surligne">Gratuit pour vous.</span>
            </h1>
            <ul className="mz-negoce-points">
              <li>Une ligne par fourniture, au nom du comptoir, avec la quantité et l&apos;unité. Rien à retaper.</li>
              <li>Vous chiffrez en ligne, sans compte, ou depuis votre espace. Les artisans voient votre prix livré.</li>
              <li>Quand plusieurs artisans du secteur ont besoin des mêmes gros matériaux, les volumes sont regroupés.</li>
            </ul>
          </section>
          <section aria-labelledby="acces-titre" className="mz-carte mz-negoce-acces">
            <h2 id="acces-titre" className="mz-titre" style={{ fontSize: 34, lineHeight: 1 }}>
              Espace négoce
            </h2>
            <p className="mz-gris" style={{ margin: "10px 0 18px" }}>
              Votre accès {NOM_APP} : indiquez votre e-mail, vous recevez un lien de connexion. Pas de mot de passe.
            </p>
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
                <Turnstile onToken={setCaptcha} />
                <Button type="submit" pending={pending} disabled={!email.trim() || (TURNSTILE_ACTIF && !captcha)}>
                  Recevoir mon lien
                </Button>
              </form>
            )}
            <p className="mz-gris" style={{ marginTop: 18, fontSize: 14 }}>
              Pas encore d&apos;accès ? Il se crée depuis le lien d&apos;invitation reçu par e-mail quand un artisan vous ajoute.
            </p>
          </section>
        </main>
        <PiedVitrine />
      </div>
    </div>
  );
}
