"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, requestResetAction, resetAction, setupAction, totpAction, type AuthState } from "@/app/admin/auth-actions";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Un instant…" : children}
    </button>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  return state.error ? (
    <p role="alert" className="rounded-xl bg-error-bg p-3 text-sm text-error">
      {state.error}
    </p>
  ) : null;
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, {});
  const [totpState, totp] = useActionState(totpAction, {});
  const challenge = totpState.challenge ?? state.challenge;
  if (challenge) {
    return (
      <form action={totp} className="space-y-4">
        <h1 className="font-sans text-xl font-semibold">Code de sécurité</h1>
        <p className="text-sm text-text-2">Saisissez le code à 6 chiffres affiché dans votre application d&apos;authentification.</p>
        <input type="hidden" name="challenge" value={challenge} />
        <label className="block">
          <span className="field-label">Code</span>
          <input name="code" className="input text-center text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus />
        </label>
        <ErrorText state={totpState} />
        <Submit>Valider</Submit>
      </form>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <h1 className="font-sans text-xl font-semibold">Connexion à l&apos;administration</h1>
      <label className="block">
        <span className="field-label">E-mail</span>
        <input name="email" type="email" className="input" autoComplete="username" defaultValue={state.email} required autoFocus />
      </label>
      <label className="block">
        <span className="field-label">Mot de passe</span>
        <input name="password" type="password" className="input" autoComplete="current-password" required />
      </label>
      <ErrorText state={state} />
      <Submit>Se connecter</Submit>
      <p className="text-center text-sm">
        <Link href="/admin/mot-de-passe-oublie" className="text-primary">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestResetAction, {});
  if (state.done) {
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-xl font-semibold">Vérifiez vos e-mails</h1>
        <p className="text-sm text-text-2">Si cette adresse correspond à un compte, un lien valable 30 minutes vient d&apos;être envoyé.</p>
        <Link href="/admin/connexion" className="btn btn-outline w-full">
          Retour à la connexion
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <h1 className="font-sans text-xl font-semibold">Mot de passe oublié</h1>
      <p className="text-sm text-text-2">Indiquez l&apos;e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <label className="block">
        <span className="field-label">E-mail</span>
        <input name="email" type="email" className="input" autoComplete="username" required autoFocus />
      </label>
      <Submit>Recevoir le lien</Submit>
    </form>
  );
}

function PasswordFields() {
  return (
    <>
      <label className="block">
        <span className="field-label">Nouveau mot de passe</span>
        <input name="password" type="password" className="input" autoComplete="new-password" minLength={12} required />
        <span className="field-hint">12 caractères minimum. Astuce : 3 ou 4 mots séparés par des tirets.</span>
      </label>
      <label className="block">
        <span className="field-label">Confirmer le mot de passe</span>
        <input name="confirm" type="password" className="input" autoComplete="new-password" minLength={12} required />
      </label>
    </>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetAction, {});
  if (state.done) {
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-xl font-semibold">Mot de passe modifié</h1>
        <p className="text-sm text-text-2">Par sécurité, tous les appareils ont été déconnectés.</p>
        <Link href="/admin/connexion" className="btn btn-primary w-full">
          Se connecter
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <h1 className="font-sans text-xl font-semibold">Nouveau mot de passe</h1>
      <input type="hidden" name="token" value={token} />
      <PasswordFields />
      <ErrorText state={state} />
      <Submit>Enregistrer</Submit>
    </form>
  );
}

export function SetupForm() {
  const [state, action] = useActionState(setupAction, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="font-sans text-xl font-semibold">Première installation</h1>
      <p className="text-sm text-text-2">Créez le compte de la créatrice. Cette page se désactive dès qu&apos;un compte existe.</p>
      <label className="block">
        <span className="field-label">Jeton d&apos;installation</span>
        <input name="token" type="password" className="input" autoComplete="off" required />
        <span className="field-hint">Valeur de ADMIN_SETUP_TOKEN (Vercel → Settings → Environment Variables).</span>
      </label>
      <label className="block">
        <span className="field-label">Prénom</span>
        <input name="name" className="input" autoComplete="given-name" maxLength={80} />
      </label>
      <label className="block">
        <span className="field-label">E-mail</span>
        <input name="email" type="email" className="input" autoComplete="username" required />
      </label>
      <PasswordFields />
      <ErrorText state={state} />
      <Submit>Créer le compte</Submit>
    </form>
  );
}
