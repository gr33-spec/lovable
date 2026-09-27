"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, CheckCircle2, UserRound } from "lucide-react";
import { switchView } from "@/lib/view";
import { useStore } from "@/lib/store";
import { eur } from "@/lib/format";
import { todayIso, unpaidByUnit } from "@/lib/engine/leases";
import { allReminders } from "@/lib/reminders";
import { RentsView } from "@/components/gestion/rents";
import { AnnualView } from "@/components/gestion/annual";
import { TaskRow, TenantsView, managementTasks } from "@/components/gestion/tenants";
import { ReminderRow } from "@/components/leases";
import { Card, Page, PageHeader, SectionTitle, cx } from "@/components/ui";

type View = "loyers" | "locataires" | "afaire" | "annee";
const RENTAL = new Set(["lease_end", "revision", "unpaid", "deposit"]);

export default function GestionPage() {
  return (
    <Suspense>
      <Gestion />
    </Suspense>
  );
}

function Gestion() {
  const { data, projection, setSettings, role, view: appView } = useStore();
  const gestion = appView === "gestion";
  const router = useRouter();
  const params = useSearchParams();
  const view = (["loyers", "locataires", "afaire", "annee"].includes(params.get("vue") ?? "") ? params.get("vue") : "loyers") as View;
  const today = todayIso();

  const rented = data.units.filter((u) => u.status !== "vacant").length;
  const unpaidTotal = useMemo(() => unpaidByUnit(data.units).reduce((s, l) => s + l.amount, 0), [data.units]);
  const reminders = useMemo(() => allReminders(data, today, projection.snapshot.resolvedLoans).filter((r) => RENTAL.has(r.kind)), [data, today, projection]);
  const tasks = useMemo(() => managementTasks(data), [data]);
  const todo = reminders.length + tasks.length;

  const setView = (v: View) => {
    const q = new URLSearchParams(params.toString());
    q.set("vue", v);
    if (v !== "loyers") q.delete("mois");
    router.replace(`/gestion?${q.toString()}`, { scroll: false });
  };
  const dismiss = (id: string) => setSettings({ dismissedReminders: [...(data.settings.dismissedReminders ?? []), id] });

  const TABS: { value: View; label: string; badge?: number }[] = [
    { value: "loyers", label: "Loyers" },
    { value: "locataires", label: "Locataires" },
    { value: "afaire", label: "À faire", badge: todo },
    { value: "annee", label: "Bilan" },
  ];

  return (
    <>
      <PageHeader
        title={gestion ? { loyers: "Loyers", locataires: "Locataires", afaire: "À faire", annee: "Bilan de l'année" }[view] : "Gestion"}
        subtitle={gestion ? data.settings.groupName || "Gestion locative" : "Loyers, locataires et démarches"}
        action={
          role === "gestion" ? (
            <Link href="/plus/securite" aria-label="Mon compte" className="flex h-10 w-10 items-center justify-center rounded-full bg-soft text-navy">
              <UserRound size={19} />
            </Link>
          ) : (
            <button
              onClick={() => switchView(gestion ? "patrimoine" : "gestion")}
              className="flex h-10 items-center gap-1.5 rounded-full bg-soft px-3.5 text-[13px] font-semibold text-navy"
            >
              <ArrowLeftRight size={15} /> {gestion ? "Patrimoine" : "Vue gestion"}
            </button>
          )
        }
      />
      <Page>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setView("locataires")} className="soft-card rounded-[20px] px-3 py-3 text-left">
            <div className="text-[11.5px] text-muted">Loués</div>
            <div className="tabular text-[18px] font-extrabold text-navy">
              {rented}/{data.units.length}
            </div>
          </button>
          <button onClick={() => setView("loyers")} className="soft-card rounded-[20px] px-3 py-3 text-left">
            <div className="text-[11.5px] text-muted">Impayés</div>
            <div className={cx("tabular text-[18px] font-extrabold", unpaidTotal > 0 ? "text-neg" : "text-navy")}>{eur(unpaidTotal)}</div>
          </button>
          <button onClick={() => setView("afaire")} className="soft-card rounded-[20px] px-3 py-3 text-left">
            <div className="text-[11.5px] text-muted">À faire</div>
            <div className={cx("tabular text-[18px] font-extrabold", todo > 0 ? "text-warn" : "text-navy")}>{todo}</div>
          </button>
        </div>

        <div className={cx("mt-4 flex rounded-2xl bg-black/5 p-1", gestion && "hidden")}>
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setView(t.value)}
              className={cx("relative flex-1 rounded-xl px-2 py-2.5 text-[14px] font-semibold transition", view === t.value ? "bg-card text-navy shadow-sm" : "text-ink-2")}
            >
              {t.label}
              {t.badge ? <span className="ml-1.5 rounded-full bg-warn px-1.5 py-0.5 text-[10px] font-bold text-white">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {view === "loyers" && <RentsView />}
          {view === "locataires" && <TenantsView />}
          {view === "annee" && <AnnualView />}
          {view === "afaire" &&
            (todo === 0 ? (
              <Card>
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle2 size={34} className="text-pos" />
                  <div className="mt-2 text-[16px] font-semibold text-ink">Tout est à jour</div>
                  <div className="text-sm text-muted">Aucune démarche en attente.</div>
                </div>
              </Card>
            ) : (
              <>
                {tasks.length > 0 && (
                  <>
                    <SectionTitle>Démarches en cours</SectionTitle>
                    <Card className="py-1">
                      <div className="divide-y divide-line">
                        {tasks.map((t) => (
                          <TaskRow key={t.id} task={t} />
                        ))}
                      </div>
                    </Card>
                  </>
                )}
                {reminders.length > 0 && (
                  <>
                    <SectionTitle>Échéances</SectionTitle>
                    <Card className="py-1">
                      <div className="divide-y divide-line">
                        {reminders.map((r) => (
                          <ReminderRow key={r.id} r={r} onDismiss={r.kind === "unpaid" || r.kind === "deposit" ? undefined : () => dismiss(r.id)} />
                        ))}
                      </div>
                    </Card>
                  </>
                )}
              </>
            ))}
        </div>
      </Page>
    </>
  );
}
