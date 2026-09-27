"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export function LoginForm({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
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
