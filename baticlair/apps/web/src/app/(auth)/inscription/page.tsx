"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { EcranAdresseMobiiz } from "@/components/adresse-mobiiz";
import { ChampDepartement, ChoixMetier, ListeAttente } from "@/components/inscription-metier";
import { Turnstile, TURNSTILE_ACTIF } from "@/components/turnstile";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { VERSION_CGU } from "@/lib/legal";
import { api, ApiError, newActionKey } from "@/lib/api";
import { DEPARTEMENTS_INSCRIPTION, departementConnu, metierInscription, METIERS_INSCRIPTION } from "@/lib/metiers-inscription";
import { useDepartementChoisi } from "@/lib/regions/departement-choisi";

/** Le métier ouvert, choisi d'office (Mobiiz se lance pour les couvreurs). */
const METIER_PAR_DEFAUT = METIERS_INSCRIPTION.find((m) => m.ouvert)!.id;
const CODES_DEPARTEMENTS = DEPARTEMENTS_INSCRIPTION.map((d) => d.code);

/**
 * Inscription en un seul écran : compte + entreprise. L'artisan arrive
 * directement sur l'accueil, sans étape supplémentaire (onboarding court).
 *
 * L'INSCRIPTION PAR MÉTIER (Greg, 19 novembre 2026 ; RÈGLE CHANGÉE : avant, un ou plusieurs métiers au choix, tous
 * ouverts) : en haut, « Ton métier ». « Couvreur » est ouvert et choisi d'office ; un autre métier est « Bientôt
 * disponible » : le formulaire de compte laisse place à la liste d'attente (son e-mail seulement). Le métier
 * (`?metier=`) et le département (`?departement=`, ou celui touché sur la carte d'une page régionale) arrivent déjà
 * remplis. Les comptes déjà créés ne sont pas touchés.
 */
export default function InscriptionPage() {
  return (
    <Suspense>
      <Inscription />
    </Suspense>
  );
}

function Inscription() {
  const router = useRouter();
  const params = useSearchParams();
  const source = (params.get("depuis") ?? "inscription").slice(0, 60);
  const [metier, setMetier] = useState(() => metierInscription(params.get("metier"))?.id ?? METIER_PAR_DEFAUT);
  // Le département : celui de l'adresse (`?departement=`), sinon celui touché sur la carte d'une page régionale (gardé sur
  // l'appareil) ; ce que l'artisan choisit dans la liste l'emporte.
  const [saisi, setDepartement] = useState<string | null>(() => departementConnu(params.get("departement"))?.code ?? null);
  const garde = useDepartementChoisi(CODES_DEPARTEMENTS);
  const departement = saisi ?? garde ?? "";
  const choisi = metierInscription(metier)!;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [cgu, setCgu] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  // R7 (Greg, 27 octobre 2026) : le compte créé, l'écran « Voici ton adresse Mobiiz » avant l'accueil.
  const [adresse, setAdresse] = useState(false);
  const companyKey = useRef(newActionKey());
  // Si le compte est créé mais que l'entreprise échoue (réseau), « réessayer »
  // ne doit pas recréer le compte : on reprend à l'étape suivante.
  const accountCreated = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 10) {
      setError(new ApiError("PASSWORD_TOO_SHORT", 400));
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (!accountCreated.current) {
        await api("/v1/auth/sign-up/email", {
          method: "POST",
          body: {
            name: String(form.get("name")).trim(),
            email: String(form.get("email")).trim(),
            password,
            callbackURL: "/",
          },
          captcha,
        });
        accountCreated.current = true;
      }
      await api("/v1/companies", {
        method: "POST",
        body: {
          name: String(form.get("company")),
          trades: [choisi.id],
          departement: departement || null,
        },
        idempotencyKey: companyKey.current,
      });
      // La case cochée vaut acceptation des CGU de cette version : enregistrée avec le compte.
      await api("/v1/me/cgu", {
        method: "POST",
        body: { version: VERSION_CGU },
      });
      setPending(false);
      setAdresse(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }

  if (adresse) return <EcranAdresseMobiiz onContinuer={() => router.replace("/")} />;

  return (
    <>
      <div className="flex flex-col gap-2">
        <PageTitle>Créer un compte</PageTitle>
        <p className="text-[17px] leading-relaxed text-muted">Gratuit, sans carte bancaire. Ta liste remise au propre en deux minutes.</p>
      </div>
      <ChoixMetier value={metier} onChange={setMetier} />
      {!choisi.ouvert ? (
        <ListeAttente metier={choisi} departement={departement} onDepartement={setDepartement} source={source} />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error ? <ErrorNotice error={error} /> : null}
          <Field id="name" name="name" label="Prénom et nom" autoComplete="name" required />
          <Field id="company" name="company" label="Nom de ton entreprise" autoComplete="organization" required />
          <ChampDepartement value={departement} onChange={setDepartement} />
          <Field id="email" name="email" type="email" label="E-mail professionnel" autoComplete="email" inputMode="email" required />
          <Field
            id="password"
            name="password"
            type="password"
            label="Mot de passe"
            hint="10 caractères minimum. Une phrase de plusieurs mots est idéale."
            autoComplete="new-password"
            required
          />
          <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug">
            <input
              type="checkbox"
              name="cgu"
              checked={cgu}
              onChange={(e) => setCgu(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 rounded accent-accent"
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/cgu" className="font-semibold text-accent-text underline">
                conditions générales d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/confidentialite" className="font-semibold text-accent-text underline">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          <Turnstile onToken={setCaptcha} />
          <Button type="submit" pending={pending} disabled={!cgu || (TURNSTILE_ACTIF && !captcha)} className="mt-2">
            Créer mon compte
          </Button>
        </form>
      )}
      <p className="text-center text-[15px]">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-accent-text">
          Se connecter
        </Link>
      </p>
    </>
  );
}
