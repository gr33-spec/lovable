"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(token ? null : new ApiError("INVALID_TOKEN", 400));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    if (password.length < 10) {
      setError(new ApiError("PASSWORD_TOO_SHORT", 400));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api("/v1/auth/reset-password", { method: "POST", body: { token, newPassword: password } });
      router.replace("/connexion");
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error ? <ErrorNotice error={error} /> : null}
      <Field id="password" name="password" type="password" label="Nouveau mot de passe" hint="10 caractères minimum." autoComplete="new-password" required />
      <Button type="submit" pending={pending} disabled={!token}>
        Enregistrer le mot de passe
      </Button>
      <Link href="/mot-de-passe-oublie" className="min-h-11 self-center py-2 text-sm font-bold text-accent-text">
        Demander un nouveau lien
      </Link>
    </form>
  );
}

export default function NouveauMotDePassePage() {
  return (
    <>
      <PageTitle>Nouveau mot de passe</PageTitle>
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
