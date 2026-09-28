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

  const TABS: { value: View; label: string; badge?: number }[] = [
    { value: "afaire", label: "À faire", badge: todo },
    { value: "loyers", label: "Loyers" },
    { value: "locataires", label: "Locataires" },
    { value: "annee", label: "Bilan" },
  ];

  return (
    <>
      <PageHeader
        title={gestion ? { afaire: "À faire", loyers: "Loyers", locataires: "Locataires", annee: "Bilan de l'année" }[view] : "Gestion"}
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
        <div className={cx("flex rounded-2xl bg-black/5 p-1", gestion && "hidden")}>
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setView(t.value)}
              className={cx("relative flex-1 rounded-xl px-1 py-2.5 text-[14px] font-semibold transition", view === t.value ? "bg-card text-navy shadow-sm" : "text-ink-2")}
            >
              {t.label}
              {t.badge ? <span className="ml-1 rounded-full bg-warn px-1.5 py-0.5 text-[10px] font-bold text-white">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        <div className={cx(!gestion && "mt-4")}>
          {view === "afaire" && <TodayView onOpen={setView} />}
          {view === "loyers" && <RentsView />}
          {view === "locataires" && <TenantsView />}
          {view === "annee" && <AnnualView />}
        </div>
      </Page>
    </>
  );
}
