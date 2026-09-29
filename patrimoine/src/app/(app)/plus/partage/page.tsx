"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Share2 } from "lucide-react";
import { Button, Card, Empty, Page, PageHeader, SectionTitle, Segmented, Sheet, Stack, TextField } from "@/components/ui";

interface ShareLink {
  id: string;
  label: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
  uses: number;
}

const DURATIONS = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "3 mois" },
  { value: "365", label: "1 an" },
];

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function PartagePage() {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState<string | undefined>("Banquier");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = () =>
    fetch("/api/shares")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setLinks(j.shares))
      .catch(() => setError("Impossible de charger les liens."));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label?.trim() || "Lien", days: Number(days) }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("La création du lien a échoué.");
      return;
    }
    const j = await res.json();
    setCreated(`${window.location.origin}/partage/${j.token}`);
    setCopied(false);
    setCreating(false);
    load();
  };

  const revoke = async (id: string) => {
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    load();
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const share = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Dossier patrimonial", url });
        return;
      } catch {
        /* partage annulé */
      }
    }
    copy(url);
  };

  const active = (links ?? []).filter((l) => !l.revokedAt && new Date(l.expiresAt).getTime() > now);
  const past = (links ?? []).filter((l) => l.revokedAt || new Date(l.expiresAt).getTime() <= now);

  return (
    <>
      <PageHeader title="Partage" back="/plus" subtitle="Liens en lecture seule, avec expiration" />
      <Page>
        {error && <div className="mb-4 rounded-2xl bg-neg/10 px-4 py-3 text-sm text-neg">{error}</div>}
        {created && (
          <Card className="mb-4 border border-pos/30">
            <div className="text-[15px] font-semibold text-ink">Lien créé</div>
            <p className="mt-1 text-[13px] text-muted">Il ne sera plus affiché ensuite : copiez-le ou partagez-le maintenant.</p>
            <div className="mt-3 break-all rounded-xl bg-soft px-3 py-2.5 font-mono text-[12px] text-ink-2">{created}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" icon={<Copy size={16} />} onClick={() => copy(created)}>
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button icon={<Share2 size={16} />} onClick={() => share(created)}>
                Envoyer
              </Button>
            </div>
          </Card>
        )}

        <Button full icon={<Link2 size={18} />} onClick={() => setCreating(true)}>
          Créer un lien de partage
        </Button>
        <p className="mt-3 px-1 text-[13px] text-muted">
          Le lien ouvre l&apos;application entière en consultation : toutes les pages, tous les boutons et documents, locataires compris. Rien ne peut être modifié ni enregistré ; sauvegardes, exports et accès restent fermés. Révoquez le lien pour couper la consultation immédiatement.
        </p>

        <SectionTitle>Liens actifs</SectionTitle>
        {links === null ? (
          <Card><div className="text-sm text-muted">Chargement…</div></Card>
        ) : active.length === 0 ? (
          <Card>
            <Empty icon={<Share2 size={24} />} title="Aucun lien actif" text="Créez un lien pour votre banquier, votre comptable ou un associé." />
          </Card>
        ) : (
          <Card className="py-1">
            <div className="divide-y divide-line">
              {active.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-ink">{l.label}</div>
                    <div className="text-[13px] text-muted">
                      Expire le {dateFr(l.expiresAt)} · {l.uses ? `ouvert ${l.uses} fois${l.lastUsedAt ? `, dernière fois le ${dateFr(l.lastUsedAt)}` : ""}` : "jamais ouvert"}
                    </div>
                  </div>
                  <button onClick={() => revoke(l.id)} className="rounded-full bg-neg/10 px-3 py-1.5 text-[13px] font-semibold text-neg">
                    Révoquer
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {past.length > 0 && (
          <>
            <SectionTitle>Expirés ou révoqués</SectionTitle>
            <Card className="py-1">
              <div className="divide-y divide-line">
                {past.slice(0, 20).map((l) => (
                  <div key={l.id} className="py-3 opacity-60">
                    <div className="text-[15px] text-ink">{l.label}</div>
                    <div className="text-[13px] text-muted">{l.revokedAt ? `Révoqué le ${dateFr(l.revokedAt)}` : `Expiré le ${dateFr(l.expiresAt)}`}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </Page>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Nouveau lien"
        footer={
          <Button full disabled={busy} onClick={create}>
            Créer le lien
          </Button>
        }
      >
        <Stack>
          <TextField label="Pour qui ?" value={label} placeholder="Ex. Banquier CIC, Comptable, Enora" onChange={setLabel} />
          <div>
            <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">Valable</div>
            <Segmented value={days} onChange={setDays} options={DURATIONS} />
          </div>
        </Stack>
      </Sheet>
    </>
  );
}
