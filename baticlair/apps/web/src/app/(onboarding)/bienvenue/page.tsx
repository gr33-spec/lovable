"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { api, ApiError, newActionKey } from "@/lib/api";
import { SessionGate } from "@/lib/session";

/** Compte sans entreprise (cas rare : l'inscription crée déjà l'entreprise). */
function CompanyForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const key = useRef(newActionKey());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/v1/companies", {
        method: "POST",
        body: { name: String(new FormData(event.currentTarget).get("company")) },
        idempotencyKey: key.current,
      });
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-12">
      <PageTitle>Bienvenue</PageTitle>
      <p className="text-[15px] text-muted">Une seule chose avant de commencer : le nom de votre entreprise.</p>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error ? <ErrorNotice error={error} /> : null}
        <Field id="company" name="company" label="Nom de votre entreprise" autoComplete="organization" required />
        <Button type="submit" pending={pending}>
          Continuer
        </Button>
      </form>
    </main>
  );
}

export default function BienvenuePage() {
  return (
    <SessionGate requireCompany={false}>
      <CompanyForm />
    </SessionGate>
  );
}
