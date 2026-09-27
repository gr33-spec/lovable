"use client";

import { useEffect, useRef, useState } from "react";
import { Download, History, RotateCcw, Upload, Save, FileSpreadsheet } from "lucide-react";
import { useStore } from "@/lib/store";
import { isValidBackup } from "@/lib/ops";
import { complementsSchema, planComplements, type ComplementsPlan } from "@/lib/complements";
import type { AppData } from "@/lib/types";
import { Button, Card, Divided, Page, PageHeader, SectionTitle, Sheet } from "@/components/ui";

interface SnapshotInfo {
  id: number;
  createdAt: string;
  reason: string;
  counts: { companies: number; buildings: number; loans: number };
}

const REASONS: Record<string, string> = {
  auto: "Sauvegarde automatique du jour",
  manuel: "Sauvegarde manuelle",
  import: "Avant import",
  "avant restauration": "Avant restauration",
  "avant suppression démo": "Avant suppression de la démo",
  "chargement démo": "Avant chargement de la démo",
  "avant compléments": "Avant ajout de compléments",
};

export default function SauvegardesPage() {
  const { data, replaceAll, reload } = useStore();
  const [complements, setComplements] = useState<ComplementsPlan | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<SnapshotInfo | null>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch("/api/snapshots", { cache: "no-store" });
    if (res.ok) setSnapshots((await res.json()).snapshots);
  };
  useEffect(() => {
    let alive = true;
    fetch("/api/snapshots", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (alive && json) setSnapshots(json.snapshots);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const manual = async () => {
    setBusy(true);
    await fetch("/api/snapshots", { method: "POST" });
    await load();
    setBusy(false);
    setMessage("Sauvegarde créée.");
  };

  const restore = async (s: SnapshotInfo) => {
    setBusy(true);
    const res = await fetch(`/api/snapshots/${s.id}`, { method: "POST" });
    setBusy(false);
    setConfirm(null);
    if (res.ok) {
      await reload();
      await load();
      setMessage("Données restaurées. L'état précédent a été sauvegardé.");
    } else setMessage("La restauration a échoué.");
  };

  const onFile = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      // Fichier de compléments : fusion par nom, avec aperçu.
      if (json?.type === "patrimoine-complements") {
        const parsed = complementsSchema.safeParse(json);
        if (!parsed.success) throw new Error();
        setComplements(planComplements(data, parsed.data));
        return;
      }
      if (!isValidBackup(json)) throw new Error();
      setPendingImport((json.data ?? json) as AppData);
    } catch {
      setMessage("Ce fichier n'est pas une sauvegarde valide.");
    }
  };

  const applyComplements = async () => {
    if (!complements) return;
    setBusy(true);
    const ok = await replaceAll(complements.data, "avant compléments");
    setBusy(false);
    setComplements(null);
    await load();
    setMessage(ok ? "Informations complétées. L'état précédent a été sauvegardé." : "L'import a échoué.");
  };

  const doImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    const ok = await replaceAll(pendingImport, "import");
    setBusy(false);
    setPendingImport(null);
    await load();
    setMessage(ok ? "Sauvegarde importée. L'état précédent a été conservé." : "L'import a échoué.");
  };

  return (
    <>
      <PageHeader title="Sauvegardes" back="/plus" />
      <Page>
        {message && <div className="mb-4 rounded-2xl bg-pos/10 px-4 py-3 text-sm text-pos">{message}</div>}
        <div className="grid gap-3">
          <Button href="/api/backup" icon={<Download size={18} />} full>
            Exporter une sauvegarde complète
          </Button>
          <Button href="/api/export-excel" variant="secondary" icon={<FileSpreadsheet size={18} />} full>
            Exporter en Excel
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} icon={<Upload size={18} />} full>
            Importer une sauvegarde ou des compléments
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </div>

        <SectionTitle action={<button onClick={manual} disabled={busy} className="flex items-center gap-1 text-sm font-semibold text-series-1"><Save size={15} /> Sauvegarder</button>}>
          Historique (restauration)
        </SectionTitle>
        <Card className="py-1">
          {snapshots === null ? (
            <div className="py-4 text-sm text-muted">Chargement…</div>
          ) : snapshots.length === 0 ? (
            <div className="py-4 text-sm text-muted">Aucune sauvegarde pour l&apos;instant. Une sauvegarde est créée automatiquement chaque jour lors de la première modification.</div>
          ) : (
            <Divided>
              {snapshots.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft text-navy">
                    <History size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-ink">
                      {new Date(s.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {REASONS[s.reason] ?? s.reason} · {s.counts.companies} sociétés, {s.counts.buildings} immeubles, {s.counts.loans} crédits
                    </div>
                  </div>
                  <button onClick={() => setConfirm(s)} className="flex items-center gap-1 rounded-full bg-soft px-3 py-2 text-sm font-semibold text-navy">
                    <RotateCcw size={14} /> Restaurer
                  </button>
                </div>
              ))}
            </Divided>
          )}
        </Card>
        <p className="mt-3 px-2 text-xs text-muted">
          Chaque modification est enregistrée immédiatement dans la base de données. En plus, un instantané est conservé chaque jour (jusqu&apos;à 120), ainsi qu&apos;avant chaque import, restauration ou suppression de la démo.
        </p>
      </Page>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Restaurer cette sauvegarde ?">
        <p className="text-[15px] text-ink-2">Les données actuelles seront remplacées. Elles sont d&apos;abord sauvegardées : vous pourrez revenir en arrière.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Annuler</Button>
          <Button disabled={busy} onClick={() => confirm && restore(confirm)}>Restaurer</Button>
        </div>
      </Sheet>
      <Sheet open={!!pendingImport} onClose={() => setPendingImport(null)} title="Importer cette sauvegarde ?">
        <p className="text-[15px] text-ink-2">
          {pendingImport && `${pendingImport.companies?.length ?? 0} sociétés, ${pendingImport.buildings?.length ?? 0} immeubles, ${pendingImport.loans?.length ?? 0} crédits. `}
          Les données actuelles seront remplacées (et sauvegardées avant).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
          <Button variant="secondary" onClick={() => setPendingImport(null)}>Annuler</Button>
          <Button disabled={busy} onClick={doImport}>Importer</Button>
        </div>
      </Sheet>
      <Sheet
        open={!!complements}
        onClose={() => setComplements(null)}
        title="Compléments à intégrer"
        footer={
          <Button full disabled={busy || !complements?.lines.some((l) => l.ok)} onClick={applyComplements}>
            Intégrer ({complements?.lines.filter((l) => l.ok).length ?? 0})
          </Button>
        }
      >
        <div className="space-y-2 pb-2">
          <p className="text-[13px] text-muted">Seules les informations listées sont ajoutées aux éléments existants ; rien n&apos;est supprimé. Une sauvegarde est faite avant.</p>
          {complements?.lines.map((l, i) => (
            <div key={i} className={`rounded-2xl px-4 py-2.5 text-[14px] ${l.ok ? "bg-pos/10 text-pos" : "bg-warn/10 text-warn"}`}>
              <b>{l.label}</b> — {l.detail}
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}
