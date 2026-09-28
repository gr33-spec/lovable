"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Mail, Trash2 } from "lucide-react";
import type { Tenancy, TenancyLetter } from "@/lib/types";
import { dateFr } from "@/lib/format";
import { todayIso } from "@/lib/engine/leases";
import { ACCEPTED_FILES, uploadFile } from "@/lib/upload";
import { openDocument } from "@/components/pdf-viewer";
import { SwipeRow } from "@/components/swipe";
import { toast } from "@/lib/toast";
import { Button, DateField, SelectField, Sheet } from "@/components/ui";

// Courriers joints au dossier du locataire (augmentation de loyer, relance…).

export const LETTER_KINDS: { value: TenancyLetter["kind"]; label: string }[] = [
  { value: "revision", label: "Courrier d'augmentation de loyer" },
  { value: "relance", label: "Relance de loyer" },
  { value: "mise_en_demeure", label: "Mise en demeure" },
  { value: "autre", label: "Autre courrier" },
];

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function LetterRows({ tenancy, onSave, readOnly }: { tenancy?: Tenancy; onSave?: (change: (t: Tenancy) => Tenancy) => void; readOnly?: boolean }) {
  const [adding, setAdding] = useState(false);
  const letters = [...(tenancy?.letters ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  const removeLetter = (l: TenancyLetter) => {
    let undone = false;
    onSave?.((t) => ({ ...t, letters: (t.letters ?? []).filter((x) => x.id !== l.id) }));
    toast(`${l.label} supprimé`, () => {
      undone = true;
      onSave?.((t) => ({ ...t, letters: [...(t.letters ?? []), l] }));
    });
    // Le fichier n'est effacé du serveur qu'une fois le délai d'annulation passé.
    setTimeout(() => {
      if (!undone) void fetch(`/api/files/${l.file.fileId}`, { method: "DELETE" }).catch(() => undefined);
    }, 7000);
  };

  return (
    <>
      {letters.map((l) => (
        <SwipeRow key={l.id} actions={readOnly ? [] : [{ label: "Supprimer", icon: <Trash2 size={18} />, tone: "neg", onAction: () => removeLetter(l) }]}>
          <div className="flex items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-series-1/10 text-series-1">
              <Mail size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium leading-snug text-ink">{l.label}</div>
              <div className="text-[13px] text-muted">du {dateFr(l.date)}</div>
            </div>
            <button type="button" onClick={() => openDocument(`/api/files/${l.file.fileId}`, l.file.name)} className="shrink-0 rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-navy">
              Voir
            </button>
          </div>
        </SwipeRow>
      ))}
      {!readOnly && onSave && (
        <button onClick={() => setAdding(true)} className="w-full py-3 text-left text-[14px] font-semibold text-series-1">
          + Joindre un courrier (augmentation de loyer, relance…)
        </button>
      )}
      {onSave && <AddLetterSheet open={adding} onClose={() => setAdding(false)} onAdd={(l) => onSave((t) => ({ ...t, letters: [...(t.letters ?? []), l] }))} />}
    </>
  );
}

function AddLetterSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (l: TenancyLetter) => void }) {
  const [kind, setKind] = useState<TenancyLetter["kind"]>("revision");
  const [date, setDate] = useState<string | undefined>(todayIso());
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (f: File) => {
    setError(null);
    setProgress(0);
    try {
      const fileId = await uploadFile(f, setProgress);
      const label = LETTER_KINDS.find((k) => k.value === kind)!.label;
      onAdd({ id: uid(), kind, label, date: date ?? todayIso(), file: { fileId, name: f.name, uploadedAt: todayIso() } });
      toast(`${label} enregistré`);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Joindre un courrier"
      footer={
        <Button full disabled={progress !== null} onClick={() => input.current?.click()} icon={progress !== null ? <LoaderCircle size={18} className="animate-spin" /> : <Mail size={18} />}>
          {progress !== null ? `Envoi… ${progress} %` : "Choisir le fichier (PDF ou photo)"}
        </Button>
      }
    >
      <div className="space-y-3 pb-2">
        <SelectField label="Type de courrier" value={kind} allowEmpty={false} options={LETTER_KINDS} onChange={(v) => v && setKind(v)} />
        <DateField label="Date du courrier" value={date} onChange={setDate} />
        {error && <p className="text-[13px] text-neg">{error}</p>}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_FILES}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>
    </Sheet>
  );
}
