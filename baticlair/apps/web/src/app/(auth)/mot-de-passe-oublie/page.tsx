"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { api, ApiError, type Health } from "@/lib/api";

export default function MotDePasseOubliePage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    api<Health>("/v1/health")
      .then((h) => setEmailAvailable(h.features.email))
      .catch(() => setEmailAvailable(null));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/v1/auth/request-password-reset", {
        method: "POST",
        body: { email: String(form.get("email")).trim(), redirectTo: `${window.location.origin}/nouveau-mot-de-passe` },
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle>Mot de passe oublié</PageTitle>
      {emailAvailable === false ? (
        <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
          L&apos;envoi d&apos;e-mails n&apos;est pas encore activé sur cette version : la réinitialisation par e-mail est
          indisponible pour le moment.
        </p>
      ) : sent ? (
        <p role="status" className="rounded-3xl bg-ok-bg p-4 font-semibold text-ok">
          Si un compte existe avec cette adresse, vous allez recevoir un lien. Pensez à regarder dans les indésirables.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error ? <ErrorNotice error={error} /> : null}
          <Field id="email" name="email" type="email" label="E-mail du compte" autoComplete="email" inputMode="email" required />
          <Button type="submit" pending={pending}>
            Recevoir un lien
          </Button>
        </form>
      )}
      <Link href="/connexion" className="min-h-11 self-center py-2 text-sm font-bold text-accent-text">
        Retour à la connexion
      </Link>
    </>
  );
}
