"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { safeReturnPath } from "@/lib/safe-return";

/**
 * LA CONNEXION (Greg, 19 novembre 2026 ; RÈGLE CHANGÉE : avant, le mot de passe seul) : en premier, « Recevoir un lien de
 * connexion » (on tape son e-mail, on reçoit un lien valable 15 minutes, qui ne sert qu'une fois, un toucher et on est
 * connecté) ; le mot de passe reste possible pour qui en a un. Un lien expiré ou déjà servi revient ici avec `?lien=`.
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lienPending, setLienPending] = useState(false);
  const [lienEnvoye, setLienEnvoye] = useState<string | null>(null);
  const [fauteEmail, setFauteEmail] = useState(false);
  const retour = safeReturnPath(params.get("retour"));

  async function recevoirLien() {
    const champ = document.getElementById("email") as HTMLInputElement | null;
    const email = (champ?.value ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFauteEmail(true);
      champ?.focus();
      return;
    }
    setFauteEmail(false);
    setError(null);
    setLienPending(true);
    try {
      await api("/v1/auth/sign-in/magic-link", { method: "POST", body: { email, callbackURL: retour, errorCallbackURL: "/connexion?lien=invalide" } });
      setLienEnvoye(email);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setLienPending(false);
    }
  }

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
      {params.get("compte") === "supprime" ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
          Ton compte et toutes ses données ont été supprimés.
        </p>
      ) : null}
      {params.get("lien") ? (
        <p role="alert" className="rounded-xl bg-warn-bg p-4 text-[15px] font-semibold">
          Ce lien de connexion a expiré ou a déjà servi. Demande-en un nouveau.
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        inputMode="email"
        required
        error={fauteEmail ? "Vérifie ton adresse e-mail." : undefined}
      />
      {lienEnvoye ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
          C&apos;est parti : si un compte existe pour {lienEnvoye}, un lien de connexion vient d&apos;y arriver. Il est valable 15 minutes et ne sert
          qu&apos;une fois.
        </p>
      ) : null}
      <Button type="button" variant="accent" pending={lienPending} onClick={() => void recevoirLien()}>
        Recevoir un lien de connexion
      </Button>
      <p className="mt-2 text-center text-[14px] font-semibold text-muted">ou avec ton mot de passe</p>
      <Field id="password" name="password" type="password" label="Mot de passe" autoComplete="current-password" required />
      <Button type="submit" variant="secondary" pending={pending}>
        Se connecter
      </Button>
      <Link href="/mot-de-passe-oublie" className="min-h-11 self-center py-2 text-[15px] font-semibold text-accent-text">
        Mot de passe oublié ?
      </Link>
    </form>
  );
}

export default function ConnexionPage() {
  return (
    <>
      <PageTitle>Connexion</PageTitle>
      {/* Passe UI/UX : la place du formulaire est réservée pendant l'hydratation (décalage 0 au chargement). */}
      <Suspense fallback={<div className="min-h-[312px]" aria-hidden="true" />}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-[15px]">
        Pas encore de compte ?{" "}
        <Link href="/commencer" className="font-semibold text-accent-text">
          Créer un compte
        </Link>
      </p>
      <div className="flex justify-center"></div>
    </>
  );
}
