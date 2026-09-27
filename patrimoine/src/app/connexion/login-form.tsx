"use client";

import { useEffect, useState } from "react";
import { KeyRound, Landmark, Lock, ScanFace } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";

type Space = "patrimoine" | "gestion";

const SPACES: { value: Space; title: string; text: string; icon: React.ReactNode }[] = [
  { value: "patrimoine", title: "Accès patrimoine", text: "Pilotage complet", icon: <Landmark size={20} /> },
  { value: "gestion", title: "Accès gestion locative", text: "Loyers et locataires", icon: <KeyRound size={20} /> },
];

const PASSKEY_FLAG: Record<Space, string> = { patrimoine: "patrimoine-passkey", gestion: "patrimoine-passkey-gestion" };

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function LoginForm({ configured }: { configured: boolean }) {
  const [space, setSpace] = useState<Space>("patrimoine");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceId, setFaceId] = useState<Record<Space, boolean>>({ patrimoine: false, gestion: false });

  useEffect(() => {
    // Espace et bouton Face ID mémorisés sur cet appareil.
    queueMicrotask(() => {
      const supported = browserSupportsWebAuthn();
      const flags = { patrimoine: supported && readFlag(PASSKEY_FLAG.patrimoine), gestion: supported && readFlag(PASSKEY_FLAG.gestion) };
      setFaceId(flags);
      let last: string | null = null;
      try {
        last = localStorage.getItem("patrimoine-espace");
      } catch {
        last = null;
      }
      if (last === "gestion" || last === "patrimoine") setSpace(last);
      else if (flags.gestion && !flags.patrimoine) setSpace("gestion");
    });
  }, []);

  const choose = (s: Space) => {
    setSpace(s);
    setError(null);
    try {
      localStorage.setItem("patrimoine-espace", s);
    } catch {
      /* mémorisation facultative */
    }
  };

  const go = (home?: string) => {
    window.location.href = home ?? (space === "gestion" ? "/gestion" : "/");
  };

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
      if (res.ok) return go("/");
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
        body: JSON.stringify({ password, space }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return go(json.home);
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
        <div className="mb-8 text-center">
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
          <>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {SPACES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => choose(s.value)}
                  aria-pressed={space === s.value}
                  className={`rounded-2xl px-3 py-3 text-left ring-1 transition ${space === s.value ? "bg-white text-navy ring-white" : "bg-white/[0.06] text-white/80 ring-white/15"}`}
                >
                  <span className={space === s.value ? "text-gold" : "text-white/60"}>{s.icon}</span>
                  <span className="mt-1.5 block text-[14px] font-semibold leading-tight">{s.title}</span>
                  <span className={`block text-[12px] ${space === s.value ? "text-ink-2" : "text-white/50"}`}>{s.text}</span>
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="space-y-3">
              {faceId[space] && (
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
                placeholder={space === "gestion" ? "Mot de passe gestion locative" : "Mot de passe"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </>
        )}
      </div>
    </main>
  );
}
