"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { TradePicker } from "@/components/trade-picker";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
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
        });
        accountCreated.current = true;
      }
      await api("/v1/companies", {
        method: "POST",
        body: { name: String(form.get("company")), trades },
        idempotencyKey: companyKey.current,
      });
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle>Créer un compte</PageTitle>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error ? <ErrorNotice error={error} /> : null}
        <Field id="name" name="name" label="Prénom et nom" autoComplete="name" required />
        <Field id="company" name="company" label="Nom de votre entreprise" autoComplete="organization" required />
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
        <Button type="submit" pending={pending} className="mt-2">
          Créer mon compte
        </Button>
        <p className="text-center text-sm text-muted">
          En créant un compte, vous acceptez notre{" "}
          <Link href="/confidentialite" className="font-semibold underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>
      <p className="text-center text-[15px]">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-extrabold text-accent-text">
          Se connecter
        </Link>
      </p>
    </>
  );
}
