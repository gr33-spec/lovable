"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changePasswordAction, disableTotpAction, enableTotpAction, revokeSessionsAction, startTotpAction } from "@/app/admin/actions";
import { Notice, useConfirm, useToast } from "./ui";

function device(ua: string): string {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Appareil";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return `${os}${browser ? ` · ${browser}` : ""}`;
}

export function AccountSecurity({ email, totpEnabled, sessions }: { email: string; totpEnabled: boolean; sessions: { id: string; userAgent: string; lastSeen: string; current: boolean }[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string; pending: string } | null>(null);
  const [code, setCode] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);
  const [disablePw, setDisablePw] = useState("");

  return (
    <section id="securite" className="mt-12 scroll-mt-6 space-y-4" aria-labelledby="titre-securite">
      <h2 id="titre-securite" className="font-serif text-2xl">
        Sécurité du compte
      </h2>
      <p className="text-sm text-text-2">Connectée en tant que {email}</p>

      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setPwError(null);
          if (pw.next !== pw.confirm) return setPwError("Les deux nouveaux mots de passe ne sont pas identiques.");
          start(async () => {
            const res = await changePasswordAction(pw.current, pw.next);
            if (res.ok) {
              setPw({ current: "", next: "", confirm: "" });
              toast("Mot de passe changé. Les autres appareils ont été déconnectés.");
              router.refresh();
            } else setPwError(res.error);
          });
        }}
      >
        <h3 className="font-sans text-base font-semibold">Changer le mot de passe</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="field-label">Actuel</span>
            <input type="password" className="input" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          </label>
          <label className="block">
            <span className="field-label">Nouveau</span>
            <input type="password" className="input" autoComplete="new-password" minLength={12} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
          </label>
          <label className="block">
            <span className="field-label">Confirmer</span>
            <input type="password" className="input" autoComplete="new-password" minLength={12} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
          </label>
        </div>
        {pwError && <p className="field-error">{pwError}</p>}
        <button type="submit" className="btn btn-outline btn-sm" disabled={pending}>
          Changer le mot de passe
        </button>
      </form>

      <div className="card space-y-3 p-5">
        <h3 className="font-sans text-base font-semibold">Double authentification</h3>
        {totpEnabled ? (
          <>
            <Notice tone="success">Activée : un code à 6 chiffres est demandé à chaque connexion.</Notice>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="field-label">Mot de passe (pour désactiver)</span>
                <input type="password" className="input" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending || !disablePw}
                onClick={() =>
                  start(async () => {
                    const res = await disableTotpAction(disablePw);
                    if (res.ok) {
                      toast("Double authentification désactivée.");
                      router.refresh();
                    } else toast(res.error, "error");
                  })
                }
              >
                Désactiver
              </button>
            </div>
          </>
        ) : setup ? (
          <div className="space-y-3">
            <p className="text-sm">
              1. Sur votre téléphone, ouvrez une application d&apos;authentification (Google Authenticator, Microsoft Authenticator, ou « Mots de passe » sur iPhone) et scannez ce code — ou, sur ce téléphone,{" "}
              <a href={setup.uri} className="text-primary underline">
                touchez ici
              </a>
              .
            </p>
            <div className="h-48 w-48 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: setup.qr }} aria-label="QR code à scanner" role="img" />
            <p className="text-xs text-text-2">
              Clé à saisir à la main : <code className="select-all break-all">{setup.secret}</code>
            </p>
            <p className="text-sm">2. Saisissez le code à 6 chiffres affiché :</p>
            <div className="flex gap-2">
              <input className="input max-w-40 text-center tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code à 6 chiffres" />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await enableTotpAction(setup.pending, code);
                    if (res.ok) {
                      setSetup(null);
                      toast("Double authentification activée.");
                      router.refresh();
                    } else setTotpError(res.error);
                  })
                }
              >
                Activer
              </button>
            </div>
            {totpError && <p className="field-error">{totpError}</p>}
          </div>
        ) : (
          <>
            <p className="text-sm text-text-2">Recommandée : même si quelqu&apos;un découvrait votre mot de passe, il ne pourrait pas se connecter sans votre téléphone.</p>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await startTotpAction();
                  if (res.ok) setSetup(res);
                  else toast(res.error, "error");
                })
              }
            >
              Activer la double authentification
            </button>
          </>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <h3 className="font-sans text-base font-semibold">Appareils connectés</h3>
        <ul className="divide-y divide-border text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex justify-between gap-3 py-2">
              <span>
                {device(s.userAgent)} {s.current && <span className="badge ml-1 bg-success-bg text-success">cet appareil</span>}
              </span>
              <span className="text-text-2">{s.lastSeen}</span>
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pending}
            onClick={async () => {
              if (await confirm({ title: "Déconnecter les autres appareils ?", confirmLabel: "Déconnecter" }))
                start(async () => {
                  await revokeSessionsAction();
                  toast("Les autres appareils sont déconnectés.");
                  router.refresh();
                });
            }}
          >
            Déconnecter les autres appareils
          </button>
        )}
      </div>
    </section>
  );
}
