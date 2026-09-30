"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { safeReturnPath } from "@/lib/safe-return";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/v1/auth/sign-in/email", {
        method: "POST",
        body: { email: String(form.get("email")).trim(), password: String(form.get("password")), rememberMe: true },
      });
      router.replace(safeReturnPath(params.get("retour")));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error ? <ErrorNotice error={error} /> : null}
      <Field id="email" name="email" type="email" label="E-mail" autoComplete="email" inputMode="email" required />
      <Field id="password" name="password" type="password" label="Mot de passe" autoComplete="current-password" required />
      <Button type="submit" pending={pending} className="mt-2">
        Se connecter
      </Button>
      <Link href="/mot-de-passe-oublie" className="min-h-11 self-center py-2 text-sm font-bold text-accent-text">
        Mot de passe oublié ?
      </Link>
    </form>
  );
}

export default function ConnexionPage() {
  return (
    <>
      <PageTitle>Connexion</PageTitle>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-[15px]">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-extrabold text-accent-text">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
