"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EcranAdresseMobiiz } from "@/components/adresse-mobiiz";
import { TradePicker } from "@/components/trade-picker";
import { Turnstile, TURNSTILE_ACTIF } from "@/components/turnstile";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { VERSION_CGU } from "@/lib/legal";
import { api, ApiError, newActionKey } from "@/lib/api";

/**
 * Inscription en un seul écran : compte + entreprise. L'artisan arrive
 * directement sur l'accueil, sans étape supplémentaire (onboarding court).
 */
export default function InscriptionPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [trades, setTrades] = useState<string[]>([]);
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
        body: { name: String(form.get("company")), trades },
        idempotencyKey: companyKey.current,
      });
      // La case cochée vaut acceptation des CGU de cette version : enregistrée avec le compte.
      await api("/v1/me/cgu", { method: "POST", body: { version: VERSION_CGU } });
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
        <p className="text-[17px] leading-relaxed text-muted">Essai gratuit, sans carte bancaire. Ta liste remise au propre en deux minutes.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error ? <ErrorNotice error={error} /> : null}
        <Field id="name" name="name" label="Prénom et nom" autoComplete="name" required />
        <Field id="company" name="company" label="Nom de ton entreprise" autoComplete="organization" required />
        <TradePicker value={trades} onChange={setTrades} />
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
          <input type="checkbox" name="cgu" checked={cgu} onChange={(e) => setCgu(e.target.checked)} className="mt-0.5 size-5 shrink-0 rounded accent-accent" />
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
      <p className="text-center text-[15px]">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-accent-text">
          Se connecter
        </Link>
      </p>
    </>
  );
}
