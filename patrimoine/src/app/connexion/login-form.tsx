"use client";

import { useEffect, useState } from "react";
import { Lock, ScanFace } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";

export function LoginForm({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceId, setFaceId] = useState(false);

  useEffect(() => {
    // Bouton Face ID proposé dès qu'une clé a été activée sur cet appareil.
    let enabled = false;
    try {
      enabled = localStorage.getItem("patrimoine-passkey") === "1";
    } catch {
      enabled = false;
    }
    if (enabled && browserSupportsWebAuthn()) queueMicrotask(() => setFaceId(true));
  }, []);

  async function loginWithFaceId() {
    setLoading(true);
    setError(null);
    try {
      const opts = await fetch("/api/passkey/login/options", { method: "POST" });
      if (!opts.ok) throw new Error("options");
      const response = await startAuthentication({ optionsJSON: await opts.json() });
      const res = await fetch("/api/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Face ID refusé.");
    } catch {
      setError("Face ID annulé ou indisponible. Utilisez le mot de passe.");
    }
    setLoading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Connexion impossible.");
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau.");
    }
    setLoading(false);
  }

  return (
    <main className="safe-top flex min-h-dvh flex-col items-center justify-center bg-navy px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/10 text-gold">
            <Lock size={28} />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-white">Patrimoine</h1>
          <p className="mt-1 text-sm text-white/60">Accès privé</p>
        </div>
        {!configured ? (
          <div className="rounded-2xl bg-white/10 p-4 text-center text-sm text-white/80">
            Le mot de passe n&apos;est pas encore configuré sur le serveur (variable APP_PASSWORD).
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {faceId && (
              <>
                <button
                  type="button"
                  onClick={loginWithFaceId}
                  disabled={loading}
                  className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gold text-[17px] font-semibold text-navy transition active:scale-[0.98] disabled:opacity-50"
                >
                  <ScanFace size={22} /> Se connecter avec Face ID
                </button>
                <div className="py-1 text-center text-xs text-white/40">ou</div>
              </>
            )}
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus={!faceId}
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-[17px] text-white outline-none placeholder:text-white/40 focus:border-gold"
            />
            {error && <div className="px-1 text-sm text-[#ff9b9b]">{error}</div>}
            <button
              type="submit"
              disabled={loading || !password}
              className="min-h-[54px] w-full rounded-2xl bg-white text-[17px] font-semibold text-navy transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
