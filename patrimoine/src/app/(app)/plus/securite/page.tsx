"use client";

import { useEffect, useState } from "react";
import { KeyRound, ScanFace, Trash2 } from "lucide-react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { signOut } from "@/lib/sign-out";
import { Button, Card, Page, PageHeader, SectionTitle, TextField } from "@/components/ui";

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function SecuritePage() {
  const { role } = useStore();
  const [keys, setKeys] = useState<Passkey[] | null>(null);
  const [name, setName] = useState<string | undefined>("iPhone");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [supported, setSupported] = useState(true);

  const load = () =>
    fetch("/api/passkey")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setKeys(j.passkeys))
      .catch(() => setKeys([]));

  useEffect(() => {
    load();
    queueMicrotask(() => setSupported(browserSupportsWebAuthn()));
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const opts = await fetch("/api/passkey/register/options", { method: "POST" });
      if (!opts.ok) throw new Error("options");
      const response = await startRegistration({ optionsJSON: await opts.json() });
      const res = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, name: name?.trim() || "iPhone" }),
      });
      if (!res.ok) throw new Error("verify");
      try {
        localStorage.setItem(role === "gestion" ? "patrimoine-passkey-gestion" : "patrimoine-passkey", "1");
      } catch {
        /* stockage indisponible : le bouton Face ID ne sera pas proposé automatiquement */
      }
      setMessage({ ok: true, text: "Face ID est activé sur cet appareil. À la prochaine connexion, touchez « Se connecter avec Face ID »." });
      load();
    } catch {
      setMessage({ ok: false, text: "Activation annulée ou impossible sur cet appareil." });
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/passkey/${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  return (
    <>
      <PageHeader title={role === "gestion" ? "Mon compte" : "Sécurité"} back={role === "gestion" ? "/gestion" : "/plus"} subtitle={role === "gestion" ? "Accès gestion locative" : "Connexion Face ID"} />
      <Page>
        {message && <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ${message.ok ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"}`}>{message.text}</div>}
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold">
              <ScanFace size={24} />
            </span>
            <div className="flex-1">
              <div className="text-[16px] font-semibold text-ink">Face ID / Touch ID</div>
              <div className="text-[13px] text-muted">Connexion sans mot de passe, avec une clé d&apos;accès stockée dans l&apos;appareil.</div>
            </div>
          </div>
          {supported ? (
            <div className="mt-4 space-y-3">
              <TextField label="Nom de l'appareil" value={name} onChange={setName} />
              <Button full disabled={busy} icon={<ScanFace size={18} />} onClick={enable}>
                Activer Face ID sur cet appareil
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">Ce navigateur ne prend pas en charge les clés d&apos;accès.</div>
          )}
        </Card>

        <SectionTitle>Appareils autorisés</SectionTitle>
        <Card className="py-1">
          {keys === null ? (
            <div className="py-3 text-sm text-muted">Chargement…</div>
          ) : keys.length === 0 ? (
            <div className="py-3 text-sm text-muted">Aucun appareil. Le mot de passe reste nécessaire.</div>
          ) : (
            <div className="divide-y divide-line">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 py-3">
                  <KeyRound size={18} className="text-navy" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-ink">{k.name}</div>
                    <div className="text-[13px] text-muted">
                      Ajouté le {dateFr(k.createdAt)}
                      {k.lastUsedAt ? ` · utilisé le ${dateFr(k.lastUsedAt)}` : ""}
                    </div>
                  </div>
                  <button onClick={() => remove(k.id)} aria-label="Retirer" className="flex h-9 w-9 items-center justify-center rounded-full bg-neg/10 text-neg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <p className="mt-4 px-1 text-[13px] text-muted">
          {role === "gestion"
            ? "Le mot de passe fonctionne toujours. S'il est changé, Face ID devra être réactivé."
            : "Le mot de passe fonctionne toujours. Changer le mot de passe (variable APP_PASSWORD) désactive toutes les clés Face ID et toutes les sessions."}
        </p>
        {role === "owner" && <SignOutEverywhere />}
              {role === "gestion" && (
          <div className="mt-6">
            <Button
              full
              variant="secondary"
              icon={<LogOut size={18} />}
              onClick={signOut}
            >
              Se déconnecter
            </Button>
          </div>
        )}
      </Page>
    </>
  );
}

/** Coupe l'accès de tous les autres appareils (téléphone perdu, ordinateur partagé…). */
function SignOutEverywhere() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <>
      <SectionTitle>Sessions ouvertes</SectionTitle>
      <Card>
        <p className="text-[14px] text-ink-2">Un appareil perdu ou un ordinateur partagé ? Déconnectez tous les autres appareils : ils devront saisir le mot de passe (ou Face ID) à nouveau. Cet appareil reste connecté.</p>
        <div className="mt-3">
          <Button
            full
            variant="secondary"
            disabled={state === "busy"}
            icon={<LogOut size={18} />}
            onClick={async () => {
              setState("busy");
              const res = await fetch("/api/sessions", { method: "POST" }).catch(() => null);
              setState(res?.ok ? "done" : "error");
            }}
          >
            Déconnecter tous les autres appareils
          </Button>
        </div>
        {state === "done" && <p className="mt-2 text-[13px] text-pos">C&apos;est fait : seules les nouvelles connexions sont acceptées.</p>}
        {state === "error" && <p className="mt-2 text-[13px] text-neg">Impossible pour le moment, réessayez.</p>}
      </Card>
    </>
  );
}
