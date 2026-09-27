"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleOff, KeyRound } from "lucide-react";
import { Button, Card, Page, PageHeader, SectionTitle, Sheet, Stack, TextField } from "@/components/ui";

interface AccessState {
  enabled: boolean;
  version: number;
  label?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

const dateFr = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function AccesGestionPage() {
  const [state, setState] = useState<AccessState | null>(null);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState<string | undefined>("Enora");
  const [pw, setPw] = useState<string | undefined>();
  const [pw2, setPw2] = useState<string | undefined>();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch("/api/access")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setState)
      .catch(() => setMessage({ ok: false, text: "Impossible de lire l'état de l'accès." }));

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!pw || pw.length < 8) return setMessage({ ok: false, text: "8 caractères minimum." });
    if (pw !== pw2) return setMessage({ ok: false, text: "Les deux mots de passe ne correspondent pas." });
    setBusy(true);
    const res = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, label }) });
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: (await res.json().catch(() => ({}))).error ?? "Échec." });
    setState(await res.json());
    setEditing(false);
    setPw(undefined);
    setPw2(undefined);
    setMessage({ ok: true, text: "Accès activé. Communiquez le mot de passe à la personne concernée." });
  };

  const revoke = async () => {
    setBusy(true);
    await fetch("/api/access", { method: "DELETE" });
    setBusy(false);
    await load();
    setMessage({ ok: true, text: "Accès coupé : sessions et Face ID de l'espace gestion révoqués." });
  };

  return (
    <>
      <PageHeader title="Accès gestion locative" back="/plus" subtitle="Espace simplifié, relié en direct" />
      <Page>
        {message && <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ${message.ok ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"}`}>{message.text}</div>}
        <Card>
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${state?.enabled ? "bg-pos/10 text-pos" : "bg-soft text-muted"}`}>
              {state?.enabled ? <CircleCheck size={24} /> : <CircleOff size={24} />}
            </span>
            <div className="flex-1">
              <div className="text-[16px] font-semibold text-ink">{state === null ? "Chargement…" : state.enabled ? `Actif${state.label ? ` — ${state.label}` : ""}` : "Non activé"}</div>
              {state?.enabled && <div className="text-[13px] text-muted">Dernière connexion : {dateFr(state.lastLoginAt)}</div>}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Button full icon={<KeyRound size={18} />} onClick={() => setEditing(true)}>
              {state?.enabled ? "Changer le mot de passe" : "Activer l'accès"}
            </Button>
            {state?.enabled && (
              <Button full variant="danger" disabled={busy} onClick={revoke}>
                Couper l&apos;accès
              </Button>
            )}
          </div>
        </Card>

        <SectionTitle>Ce que voit cet espace</SectionTitle>
        <Card className="space-y-2 text-[14px] text-ink-2">
          <p>
            <b className="text-ink">Loyers</b> : pointage du mois, immeuble par immeuble. <b className="text-ink">Locataires</b> : fiches des logements, quittances, changement de locataire (états des lieux, dépôt, bail). <b className="text-ink">À faire</b> : impayés, fins de bail, révisions, dépôts.
          </p>
          <p>
            Pas d&apos;accès au patrimoine, aux valeurs, aux crédits, aux bilans, au dossier banque, aux simulations ni aux sauvegardes : le serveur le refuse, même en tapant une adresse.
          </p>
          <p className="text-[13px] text-muted">Connexion : écran d&apos;accueil de l&apos;application → « Accès gestion locative ». Face ID peut ensuite être activé depuis l&apos;icône de compte.</p>
        </Card>
      </Page>

      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title={state?.enabled ? "Nouveau mot de passe" : "Activer l'accès"}
        footer={
          <Button full disabled={busy} onClick={save}>
            Enregistrer
          </Button>
        }
      >
        <Stack>
          <TextField label="Pour qui ?" value={label} onChange={setLabel} />
          <TextField label="Mot de passe (8 caractères minimum)" value={pw} onChange={setPw} />
          <TextField label="Confirmer le mot de passe" value={pw2} onChange={setPw2} />
          {state?.enabled && <p className="text-[12px] text-muted">Le changement déconnecte l&apos;espace gestion et désactive son Face ID.</p>}
        </Stack>
      </Sheet>
    </>
  );
}
