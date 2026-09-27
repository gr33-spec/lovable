"use client";

import { useMemo } from "react";
import { BellRing, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { LEASE_END_NOTICE_MONTHS, LOAN_END_NOTICE_MONTHS, REVISION_NOTICE_MONTHS, todayIso } from "@/lib/engine/leases";
import { allReminders } from "@/lib/reminders";
import { ReminderRow } from "@/components/leases";
import { Card, Empty, Page, PageHeader, SectionTitle } from "@/components/ui";

export default function RappelsPage() {
  const { data, projection, setSettings } = useStore();
  const today = todayIso();
  const all = useMemo(() => allReminders(data, today, projection.snapshot.resolvedLoans, { includeDismissed: true }), [data, today, projection]);
  const dismissedIds = new Set(data.settings.dismissedReminders ?? []);
  const active = all.filter((r) => !dismissedIds.has(r.id));
  const done = all.filter((r) => dismissedIds.has(r.id));
  const dismiss = (id: string) => setSettings({ dismissedReminders: [...(data.settings.dismissedReminders ?? []), id] });
  const restore = (id: string) => setSettings({ dismissedReminders: (data.settings.dismissedReminders ?? []).filter((x) => x !== id) });

  return (
    <>
      <PageHeader title="Rappels" back="/plus" subtitle={active.length ? `${active.length} à traiter` : "Rien à traiter"} />
      <Page>
        {active.length === 0 ? (
          <Card>
            <Empty icon={<BellRing size={26} />} title="Aucun rappel en cours" text="Vous serez prévenu ici et sur l'accueil dès qu'une échéance approche." />
          </Card>
        ) : (
          <Card className="py-1">
            <div className="divide-y divide-line">
              {active.map((r) => (
                <ReminderRow key={r.id} r={r} onDismiss={r.kind === "unpaid" || r.kind === "deposit" ? undefined : () => dismiss(r.id)} />
              ))}
            </div>
          </Card>
        )}

        {done.length > 0 && (
          <>
            <SectionTitle>Traités</SectionTitle>
            <Card className="py-1">
              <div className="divide-y divide-line">
                {done.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3 opacity-60">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-ink line-through">{r.title}</div>
                      <div className="truncate text-[13px] text-muted">{r.detail}</div>
                    </div>
                    <button onClick={() => restore(r.id)} aria-label="Rétablir" className="flex h-9 w-9 items-center justify-center rounded-full bg-soft text-ink-2">
                      <RotateCcw size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        <SectionTitle>Quand êtes-vous prévenu ?</SectionTitle>
        <Card className="space-y-2 text-[14px] text-ink-2">
          <p>
            <b className="text-ink">Fin de bail</b> : {LEASE_END_NOTICE_MONTHS} mois avant l&apos;échéance (date de fin saisie, ou début + durée avec reconduction).
          </p>
          <p>
            <b className="text-ink">Révision du loyer</b> : {REVISION_NOTICE_MONTHS} mois avant la date anniversaire du bail.
          </p>
          <p>
            <b className="text-ink">Fin de crédit</b> : {LOAN_END_NOTICE_MONTHS} mois avant la dernière échéance.
          </p>
          <p>
            <b className="text-ink">Dépôt de garantie</b> : après un départ, jusqu&apos;à sa restitution (1 mois après la remise des clés si l&apos;état des lieux est conforme, 2 mois sinon).
          </p>
          <p>
            <b className="text-ink">Loyers impayés</b> : tant qu&apos;un mois pointé « impayé » ou « partiel » n&apos;est pas régularisé.
          </p>
          <p className="text-[13px] text-muted">Un rappel marqué comme traité réapparaît automatiquement à l&apos;échéance suivante.</p>
        </Card>
      </Page>
    </>
  );
}
