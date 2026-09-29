"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, UserRound } from "lucide-react";
import { switchView } from "@/lib/view";
import { useStore } from "@/lib/store";
import { RentsView } from "@/components/gestion/rents";
import { AnnualView } from "@/components/gestion/annual";
import { TenantsView } from "@/components/gestion/tenants";
import { TodayView, useTodoCount } from "@/components/gestion/today";
import { missingCount } from "@/lib/missing";
import { Page, PageHeader, cx } from "@/components/ui";

type View = "afaire" | "loyers" | "locataires" | "annee";
const VIEWS: View[] = ["afaire", "loyers", "locataires", "annee"];

export default function GestionPage() {
  return (
    <Suspense>
      <Gestion />
    </Suspense>
  );
}

function Gestion() {
  const { data, role, view: appView } = useStore();
  const gestion = appView === "gestion";
  const router = useRouter();
  const params = useSearchParams();
  const view = (VIEWS.includes(params.get("vue") as View) ? params.get("vue") : "afaire") as View;
  const todo = useTodoCount();

  const setView = (v: View, month?: string) => {
    const q = new URLSearchParams(params.toString());
    q.set("vue", v);
    if (month) q.set("mois", month);
    else q.delete("mois");
    router.replace(`/gestion?${q.toString()}`, { scroll: false });
  };

  const missing = missingCount(data);
  // Trois rubriques : ce qu'il y a à faire, l'argent (mois par mois ou sur l'année), les locataires.
  const TABS: { value: View; label: string; badge?: number; red?: boolean }[] = [
    { value: "afaire", label: "À faire", badge: todo },
    { value: "loyers", label: "Loyers" },
    { value: "locataires", label: "Locataires", badge: missing, red: true },
  ];
  const tab: View = view === "annee" ? "loyers" : view;

  return (
    <>
      <PageHeader
        title={gestion ? { afaire: "À faire", loyers: "Loyers", locataires: "Locataires", annee: "Loyers" }[view] : "Gestion locative"}
        subtitle={gestion ? data.settings.groupName || "Gestion locative" : "À faire, loyers et locataires"}
        action={
          role === "gestion" ? (
            <Link href="/plus/securite" aria-label="Mon compte" className="flex h-10 w-10 items-center justify-center rounded-full bg-soft text-brand">
              <UserRound size={19} />
            </Link>
          ) : gestion ? (
            // Propriétaire qui regarde l'espace d'Enora : une seule sortie, explicite.
            <button onClick={() => switchView("patrimoine")} className="flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[13px] font-semibold text-on-brand">
              <ArrowLeftRight size={15} /> Quitter l&apos;aperçu
            </button>
          ) : undefined
        }
      />
      <Page>
        <div className={cx("flex rounded-2xl bg-black/5 p-1", gestion && "hidden")}>
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setView(t.value)}
              className={cx("relative flex-1 rounded-xl px-1 py-2.5 text-[14px] font-semibold transition", tab === t.value ? "bg-card text-navy shadow-sm" : "text-ink-2")}
            >
              {t.label}
              {t.badge ? <span className={cx("ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white", t.red ? "bg-neg" : "bg-warn")}>{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {tab === "loyers" && (
          <div className={cx("flex justify-center", !gestion && "mt-3")}>
            <div className="inline-flex rounded-full bg-black/5 p-0.5 text-[13px] font-semibold">
              {(["loyers", "annee"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={cx("rounded-full px-4 py-1.5 transition", view === v ? "bg-card text-navy shadow-sm" : "text-ink-2")}>
                  {v === "loyers" ? "Mois par mois" : "Sur l'année"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={cx(!gestion && "mt-4", gestion && tab === "loyers" && "mt-3")}>
          {view === "afaire" && <TodayView onOpen={setView} />}
          {view === "loyers" && <RentsView />}
          {view === "locataires" && <TenantsView />}
          {view === "annee" && <AnnualView />}
        </div>
      </Page>
    </>
  );
}
