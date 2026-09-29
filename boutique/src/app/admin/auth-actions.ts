"use server";

import { redirect } from "next/navigation";
import { adminExists, createFirstAdmin, createPasswordReset, login, loginWithTotp, logout, resetPassword } from "@/lib/server/auth";
import { brand } from "@/lib/server/email/outbox";
import { emailProvider } from "@/lib/server/email/provider";
import { passwordResetEmail } from "@/lib/server/email/templates";
import { siteUrl } from "@/lib/server/env";
import { errorMessage, reportEvent } from "@/lib/server/monitoring";
import { emailSchema, passwordSchema } from "@/lib/validation";

export type AuthState = { error?: string; challenge?: string; done?: boolean; email?: string };

const str = (fd: FormData, key: string, max = 300) => String(fd.get(key) ?? "").slice(0, max);

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email", 254);
  const password = str(fd, "password", 200);
  if (!email || !password) return { error: "Indiquez votre e-mail et votre mot de passe.", email };
  const res = await login(email, password);
  if (res.ok === "totp") return { challenge: res.challenge, email };
  if (res.ok === false) return { error: res.error, email };
  redirect("/admin");
}

export async function totpAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const challenge = str(fd, "challenge", 1000);
  const res = await loginWithTotp(challenge, str(fd, "code", 20));
  if (res.ok === true) redirect("/admin");
  return { error: res.ok === false ? res.error : "Erreur", challenge };
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin/connexion");
}

export async function requestResetAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(str(fd, "email", 254));
  if (email.success) {
    const reset = await createPasswordReset(email.data);
    if (reset) {
      try {
        const b = await brand();
        await emailProvider().send({ ...passwordResetEmail(b, `${siteUrl()}/admin/reinitialiser/${reset.token}`), to: reset.email });
      } catch (err) {
        await reportEvent("error", "email", "E-mail de réinitialisation non envoyé", { error: errorMessage(err) });
      }
    }
  }
  // Même réponse que le compte existe ou non.
  return { done: true };
}

export async function resetAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const password = str(fd, "password", 200);
  if (password !== str(fd, "confirm", 200)) return { error: "Les deux mots de passe ne sont pas identiques." };
  const valid = passwordSchema.safeParse(password);
  if (!valid.success) return { error: valid.error.issues[0].message };
  const ok = await resetPassword(str(fd, "token", 100), password);
  if (!ok) return { error: "Ce lien a expiré ou a déjà été utilisé. Faites une nouvelle demande." };
  return { done: true };
}

export async function setupAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (await adminExists()) return { error: "Un compte existe déjà." };
  const email = emailSchema.safeParse(str(fd, "email", 254));
  if (!email.success) return { error: "Adresse e-mail invalide." };
  const password = str(fd, "password", 200);
  if (password !== str(fd, "confirm", 200)) return { error: "Les deux mots de passe ne sont pas identiques." };
  const valid = passwordSchema.safeParse(password);
  if (!valid.success) return { error: valid.error.issues[0].message };
  const error = await createFirstAdmin(str(fd, "token", 200), email.data, str(fd, "name", 80).trim(), password);
  if (error) return { error };
  redirect("/admin");
}
