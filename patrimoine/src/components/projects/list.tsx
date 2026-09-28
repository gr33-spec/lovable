"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeEuro, Building2, Hammer, Plus, Rocket, X } from "lucide-react";
import { SaleSheet, newSale } from "@/components/sale/sheet";
import { SalesList } from "@/components/sale/list";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Project, SaleAction } from "@/lib/types";
import { STATUS_LABEL, isOpen, newProject, projectCompanyName, projectFigures } from "@/lib/engine/projects";
import { eurCompact, eurSigned } from "@/lib/format";
import { Button, Card, Empty, Pill, SectionTitle, Sheet, cx } from "../ui";
import { SwipeDelete, useUndoableUpdate } from "@/components/swipe";

export const STATUS_TONE: Record<Project["status"], "neutral" | "blue" | "warn" | "pos" | "gold" | "neg"> = {
  idee: "neutral",
  etude: "blue",
  soumis: "warn",
  accorde: "pos",
  realise: "gold",
  abandonne: "neutral",
};

export function NewProjectSheet({ open, onClose, onSell }: { open: boolean; onClose: () => void; onSell?: (s: SaleAction) => void }) {
  const { data, upsert } = useStore();
  const router = useRouter();
  const create = (kind: Project["kind"]) => {
    const p = newProject(kind, newId());
    upsert("projects", p);
    onClose();
    router.push(`/patrimoine/projet/${p.id}`);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nouveau projet">
      <div className="space-y-2 pb-2">
        <ChoiceButton icon={<Building2 size={20} />} title="Acheter un bien" text="Immeuble, appartement, local… avec ou sans travaux" onClick={() => create("acquisition")} />
        <ChoiceButton icon={<Hammer size={20} />} title="Travaux sur un immeuble" text="Rénovation, création de lots, financés ou non par un prêt" onClick={() => create("travaux")} />
        {data.buildings.length > 0 && (
          <ChoiceButton
            icon={<BadgeEuro size={20} />}
            title="Vendre un bien"
            text="L'immeuble entier ou lot par lot, avec le prix de chaque lot"
            onClick={() => {
              onClose();
              onSell?.(newSale(data.buildings[0].id));
            }}
          />
        )}
      </div>
    </Sheet>
  );
}

function ChoiceButton({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl bg-card px-4 py-4 text-left shadow-sm active:scale-[0.99]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-navy">{icon}</span>
      <span>
        <span className="block text-[16px] font-semibold text-ink">{title}</span>
        <span className="block text-[13px] text-muted">{text}</span>
      </span>
    </button>
  );
}

export function ProjectsList() {
  const { data } = useStore();
  const update = useUndoableUpdate();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [selling, setSelling] = useState<SaleAction | null>(null);
  const projects = data.projects ?? [];
  const open = projects.filter(isOpen);
  const done = projects.filter((p) => !isOpen(p));

  if (projects.length === 0 && !data.plans.some((p) => p.type === "sale")) {
    return (
      <>
        <Empty
          icon={<Rocket size={26} />}
          title="Aucun projet"
          text="Préparez un achat, des travaux ou une vente : coût, financement, loyers, dossier pour la banque. Une fois le projet réalisé, votre patrimoine est mis à jour en un geste."
          action={<Button onClick={() => setCreating(true)} icon={<Plus size={18} />}>Nouveau projet</Button>}
        />
        <NewProjectSheet open={creating} onClose={() => setCreating(false)} onSell={setSelling} />
        <SaleSheet sale={selling ?? undefined} open={!!selling} onClose={() => setSelling(null)} chooseBuilding />
      </>
    );
  }

  const card = (p: Project) => {
    const f = projectFigures(p);
    return (
      <SwipeDelete
        key={p.id}
        inset={false}
        className="rounded-[26px]"
        items={[{ coll: "projects", id: p.id }]}
        message="Projet supprimé"
        extra={isOpen(p) ? [{ label: "Abandonner", icon: <X size={18} />, tone: "warn", onAction: () => update("projects", p, { ...p, status: "abandonne", inProjection: false }, "Projet abandonné") }] : []}
      >
      <Card onClick={() => router.push(`/patrimoine/projet/${p.id}`)}>
        <div className="flex items-start gap-3">
          <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", p.kind === "travaux" ? "bg-warn/10 text-warn" : "bg-series-1/10 text-series-1")}>
            {p.kind === "travaux" ? <Hammer size={18} /> : <Building2 size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[16px] font-semibold text-navy">{p.name}</span>
            </div>
            <div className="truncate text-[12.5px] text-muted">{[projectCompanyName(p, data), p.city].filter(Boolean).join(" · ") || (p.kind === "travaux" ? "Travaux" : "Achat")}</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <Pill tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill>
              {f.totalCost !== undefined && <span className="tabular text-ink-2">{eurCompact(f.totalCost)}</span>}
              {f.cashflowMonthly !== undefined && <span className={cx("tabular font-semibold", f.cashflowMonthly >= 0 ? "text-pos" : "text-neg")}>{eurSigned(Math.round(f.cashflowMonthly))}/mois</span>}
              {p.inProjection && isOpen(p) && <span className="text-[12px] text-series-1">Dans les projections</span>}
            </div>
          </div>
        </div>
      </Card>
      </SwipeDelete>
    );
  };

  return (
    <div className="mt-4">
      <Button full onClick={() => setCreating(true)} icon={<Plus size={18} />}>
        Nouveau projet
      </Button>
      {open.length > 0 && (
        <>
          <SectionTitle>En cours</SectionTitle>
          <div className="space-y-3">{open.map(card)}</div>
        </>
      )}
      {data.plans.some((p) => p.type === "sale") && (
        <>
          <SectionTitle>Ventes prévues</SectionTitle>
          <Card className="py-1">
            <SalesList />
          </Card>
        </>
      )}
      {done.length > 0 && (
        <>
          <SectionTitle>Terminés</SectionTitle>
          <div className="space-y-3 opacity-80">{done.map(card)}</div>
        </>
      )}
      <NewProjectSheet open={creating} onClose={() => setCreating(false)} onSell={setSelling} />
      <SaleSheet sale={selling ?? undefined} open={!!selling} onClose={() => setSelling(null)} chooseBuilding />
    </div>
  );
}
