"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";

const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));

/** La double authentification : un code à 6 chiffres reçu par e-mail. */
export function CodeAdmin({ quoi, onOk }: { quoi: string; onOk: () => void }) {
  const [envoye, setEnvoye] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  async function run(f: () => Promise<unknown>, apres: () => void) {
    setPending(true);
    setError(null);
    try {
      await f();
      apres();
    } catch (e) {
      setError(asError(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="text-[16px]">Pour ouvrir {quoi}, je t&apos;envoie un code à 6 chiffres par e-mail. C&apos;est pour être sûr que c&apos;est bien toi.</p>
      {error ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-[15px] font-semibold text-danger">
          {messageErreur(error, {
            code_invalide: "Ce code n'est pas bon, ou il a plus de 10 minutes. Vérifie-le, ou demande un nouveau code.",
            code_bloque: "Trop de codes faux : l'accès est bloqué 30 minutes. Un e-mail d'alerte t'a été envoyé.",
          })}
        </p>
      ) : null}
      {!envoye ? (
        <Button onClick={() => void run(() => api("/v1/admin/pilotage/code", { method: "POST" }), () => setEnvoye(true))} pending={pending} className="self-start">
          Recevoir mon code
        </Button>
      ) : (
        <>
          <label htmlFor="code" className="text-[15px] font-semibold">
            Code reçu par e-mail
          </label>
          <p className="text-[14px] text-muted">Il arrive en moins d&apos;une minute, objet « Ton code d&apos;accès ». Pas reçu ? Regarde dans les indésirables.</p>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="min-h-12 w-40 rounded-xl border border-line bg-surface px-4 text-[20px] tracking-[0.3em] tabular-nums" />
          <Button onClick={() => void run(() => api("/v1/admin/pilotage/code/verifier", { method: "POST", body: { code } }), onOk)} pending={pending} disabled={code.length !== 6} className="self-start">
            Ouvrir {quoi}
          </Button>
        </>
      )}
    </Card>
  );
}
