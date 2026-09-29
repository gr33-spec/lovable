"use client";

import { ClipboardCheck, FileCheck2, KeyRound, Mail, PenLine, TrendingUp, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Tenancy, Unit } from "@/lib/types";
import { dateFr, eurCents } from "@/lib/format";
import { monthKeyLabel, outstanding } from "@/lib/engine/leases";
import { openDocument } from "@/components/pdf-viewer";
import { revisionLetterUrl } from "@/components/gestion/revision";
import { documentUrl } from "./common";
import { Card, SectionTitle, cx } from "@/components/ui";

// Historique du locataire en place : tout ce qui s'est passé depuis son
// entrée (bail, cautions, révisions, courriers, impayés, état des lieux).
// Il disparaît avec le dossier quand le locataire change.

interface HistoryItem {
  date: string;
  icon: React.ReactNode;
  tone: "navy" | "pos" | "neg" | "blue" | "gold";
  title: string;
  detail?: string;
  open?: { url: string; name?: string };
}

const TONES: Record<HistoryItem["tone"], string> = {
  navy: "bg-navy text-gold",
  pos: "bg-pos/10 text-pos",
  neg: "bg-neg/10 text-neg",
  blue: "bg-series-1/10 text-series-1",
  gold: "bg-gold/15 text-gold",
};

export function tenantHistory(unit: Unit, t: Tenancy, inspections: { id: string; kind: string; date?: string; completedAt?: string; tenancyId: string }[]): HistoryItem[] {
  const out: HistoryItem[] = [];
  const start = t.startDate ?? "0000-00-00";
  if (t.startDate) out.push({ date: t.startDate, icon: <KeyRound size={16} />, tone: "navy", title: "Entrée dans le logement", detail: t.rent ? `Loyer ${eurCents(t.rent)}${t.charges ? ` + ${eurCents(t.charges)} de charges` : ""}${t.deposit ? ` · dépôt ${eurCents(t.deposit)}` : ""}` : undefined });
  if (t.signDate && t.signDate !== t.startDate) out.push({ date: t.signDate, icon: <PenLine size={16} />, tone: "navy", title: "Bail signé" });
  if (t.signedLease) out.push({ date: t.signedLease.uploadedAt ?? start, icon: <FileCheck2 size={16} />, tone: "pos", title: "Bail signé joint", open: { url: `/api/files/${t.signedLease.fileId}`, name: t.signedLease.name } });
  (t.guarantors ?? []).forEach((g) => {
    if (!g.signedFile) return;
    const who = [g.firstName, g.lastName].filter(Boolean).join(" ");
    out.push({ date: g.signedFile.uploadedAt ?? start, icon: <FileCheck2 size={16} />, tone: "pos", title: `Caution signée jointe${who ? ` — ${who}` : ""}`, open: { url: `/api/files/${g.signedFile.fileId}`, name: g.signedFile.name } });
  });
  for (const i of inspections.filter((x) => x.tenancyId === t.id && (x.completedAt || x.date))) {
    out.push({ date: (i.date ?? i.completedAt ?? start).slice(0, 10), icon: <ClipboardCheck size={16} />, tone: "blue", title: i.kind === "entree" ? "État des lieux d'entrée" : "État des lieux de sortie", open: { url: documentUrl({ type: "edl", tenancy: t.id, inspection: i.id }) } });
  }
  for (const h of unit.rentHistory ?? []) {
    if (h.date < start) continue;
    const url = h.previousRent && h.referenceValue && h.indexValue
      ? revisionLetterUrl({ tenancyId: t.id, due: h.dueDate ?? h.date, effective: h.date, rent: h.previousRent, charges: unit.charges, reference: { label: h.referenceLabel ?? "", value: h.referenceValue }, index: { label: h.indexLabel ?? "", value: h.indexValue } })
      : undefined;
    out.push({ date: h.date, icon: <TrendingUp size={16} />, tone: "gold", title: "Révision du loyer", detail: `${h.previousRent ? `${eurCents(h.previousRent)} → ` : ""}${eurCents(h.rent)}${h.indexLabel ? ` · ${h.indexLabel}` : ""}`, open: url ? { url } : undefined });
  }
  for (const l of t.letters ?? []) out.push({ date: l.date, icon: <Mail size={16} />, tone: "blue", title: l.label, open: { url: `/api/files/${l.file.fileId}`, name: l.file.name } });
  for (const [month, p] of Object.entries(unit.payments ?? {})) {
    if (`${month}-31` < start || (p.status !== "impaye" && p.status !== "partiel")) continue;
    const due = outstanding(p);
    out.push({ date: `${month}-01`, icon: <TriangleAlert size={16} />, tone: "neg", title: `${p.status === "impaye" ? "Loyer impayé" : "Paiement partiel"} — ${monthKeyLabel(month)}`, detail: due > 0 ? `Reste dû ${eurCents(due)}${p.note ? ` · ${p.note}` : ""}` : p.note });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function TenantHistory({ unit, tenancy }: { unit: Unit; tenancy: Tenancy }) {
  const { data } = useStore();
  const items = tenantHistory(unit, tenancy, data.inspections);
  const names = tenancy.tenants.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ");
  if (items.length === 0 && !tenancy.notes) return null;
  return (
    <>
      <SectionTitle>Historique{names ? ` de ${names}` : " du locataire"}</SectionTitle>
      <Card>
        {tenancy.notes && <p className="mb-3 rounded-xl bg-soft px-3 py-2 text-[13px] text-ink-2">{tenancy.notes}</p>}
        <ol className="relative space-y-4 pl-1">
          <span aria-hidden className="absolute bottom-2 left-[17px] top-2 w-px bg-line" />
          {items.map((it, i) => (
            <li key={i} className="relative flex items-start gap-3">
              <span className={cx("relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card", TONES[it.tone])}>{it.icon}</span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-[12px] font-semibold text-muted">{dateFr(it.date)}</div>
                <div className="text-[15px] font-medium leading-snug text-ink">{it.title}</div>
                {it.detail && <div className="text-[13px] text-muted">{it.detail}</div>}
              </div>
              {it.open && (
                <button type="button" onClick={() => openDocument(it.open!.url, it.open!.name)} className="mt-1 shrink-0 rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-brand">
                  Voir
                </button>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
