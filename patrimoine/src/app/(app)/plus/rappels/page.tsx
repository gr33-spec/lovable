"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BellRing, ChevronRight, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { LEASE_END_NOTICE_MONTHS, LOAN_END_NOTICE_MONTHS, REVISION_CLAIM_MONTHS, REVISION_NOTICE_MONTHS, todayIso } from "@/lib/engine/leases";
import { allReminders } from "@/lib/reminders";
import { Card, Page, PageHeader, SectionTitle } from "@/components/ui";

export default function RappelsPage() {
  const { data, projection, setSettings } = useStore();
  const today = todayIso();
  const all = useMemo(() => allReminders(data, today, projection.snapshot.resolvedLoans, { includeDismissed: true }), [data, today, projection]);
  const dismissedIds = new Set(data.settings.dismissedReminders ?? []);
  const active = all.filter((r) => !dismissedIds.has(r.id));
  const done = all.filter((r) => dismissedIds.has(r.id));
  const restore = (id: string) => setSettings({ dismissedReminders: (data.settings.dismissedReminders ?? []).filter((x) => x !== id) });

  return (
    <>
      <PageHeader title="Rappels ignorés" back="/gestion?vue=afaire" subtitle="Et quand vous êtes prévenu" />
      <Page>
        {/* Les rappels à traiter sont dans Gestion › À faire (une seule liste d'actions). */}
        <Link href="/gestion?vue=afaire" className="soft-card flex items-center gap-3 rounded-[22px] px-4 py-3.5 active:opacity-70">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy text-gold">
            <BellRing size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{active.length ? `${active.length} rappel${active.length > 1 ? "s" : ""} à traiter` : "Rien à traiter"}</span>
            <span className="block text-[13px] text-muted">Ils sont dans Gestion › À faire</span>
          </span>
          <ChevronRight size={18} className="text-muted/70" />
        </Link>

        {done.length > 0 && (
          <>
            <SectionTitle>Ignorés ou traités</SectionTitle>
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
            <b className="text-ink">Fin de bail</b> : {`${LEASE_END_NOTICE_MONTHS} mois`} avant l&apos;échéance (date de fin saisie, ou début + durée avec reconduction).
          </p>
          <p>
            <b className="text-ink">Révision du loyer</b> : {`${REVISION_NOTICE_MONTHS} mois`} avant la date anniversaire du bail, le temps de prévenir le locataire. Si elle n&apos;est pas faite, le rappel reste affiché {`${REVISION_CLAIM_MONTHS} mois`} : passé ce délai, la révision de l&apos;année est perdue. Une révision demandée en retard ne s&apos;applique qu&apos;à partir de la demande. Bail commercial (révision triennale) : rappel à partir du 3ᵉ anniversaire, demande par lettre recommandée.
          </p>
          <p>
            <b className="text-ink">Fin de crédit</b> : {`${LOAN_END_NOTICE_MONTHS} mois`} avant la dernière échéance.
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
