"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, DoorOpen, Hammer, Landmark } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Collection, ProjectLoan } from "@/lib/types";
import { isOpen, loanFigures, realizeProject } from "@/lib/engine/projects";
import { todayIso } from "@/lib/engine/leases";
import { eur } from "@/lib/format";
import { Button, Card, DateField, Empty, Grid2, NumberField, Page, PageHeader, SectionTitle, Stack, TextField } from "../ui";
import { Toggle } from "./detail";

export function ProjectRealize({ id }: { id: string }) {
  const { data, upsertMany } = useStore();
  const router = useRouter();
  const p = (data.projects ?? []).find((x) => x.id === id);
  const [date, setDate] = useState<string | undefined>(() => p?.purchaseDate ?? todayIso());
  const [price, setPrice] = useState<number | undefined>(p?.price);
  const [loans, setLoans] = useState<ProjectLoan[]>(() => (p?.loans ?? []).map((l) => ({ ...l })));
  const [rented, setRented] = useState(false);
  const back = `/patrimoine/projet/${id}`;

  if (!p || !isOpen(p)) {
    return (
      <>
        <PageHeader title="Réalisation" back={p ? back : "/patrimoine?vue=projets"} />
        <Empty title={p ? "Ce projet est déjà terminé" : "Projet introuvable"} />
      </>
    );
  }
  const acquisition = p.kind !== "travaux";
  const building = data.buildings.find((b) => b.id === p.buildingId);
  const company = data.companies.find((c) => c.id === p.companyId);
  const worksCount = (p.costs ?? []).filter((c) => c.kind === "travaux").length;
  const ready = acquisition ? !!(p.companyId || p.newCompanyName !== undefined) : !!building;

  const confirm = () => {
    const r = realizeProject(data, p, { purchaseDate: date, price, loans, rented }, newId, todayIso());
    const items: { coll: Collection; item: { id: string } }[] = [];
    if (r.company) items.push({ coll: "companies", item: r.company });
    if (r.building) items.push({ coll: "buildings", item: r.building });
    if (r.buildingPatch) items.push({ coll: "buildings", item: r.buildingPatch });
    for (const u of r.units) items.push({ coll: "units", item: u });
    for (const l of r.loans) items.push({ coll: "loans", item: l });
    for (const w of r.works) items.push({ coll: "works", item: w });
    items.push({ coll: "projects", item: r.project });
    upsertMany(items);
    router.push(`/patrimoine/immeuble/${r.project.realizedBuildingId}`);
  };

  return (
    <>
      <PageHeader title="Le projet est réalisé" subtitle={p.name} back={back} />
      <Page>
        <Card>
          <div className="text-[14px] font-semibold text-navy">Ce qui va être ajouté à votre patrimoine</div>
          <div className="mt-2 space-y-2 text-[14px] text-ink-2">
            {acquisition && !p.companyId && p.newCompanyName !== undefined && (
              <Item icon={<Briefcase size={16} />}>Société {p.newCompanyName || "sans nom"} (SCI), rattachée à {data.companies.find((c) => c.id === p.newCompanyParentId)?.name ?? "aucune société"}</Item>
            )}
            {acquisition ? (
              <Item icon={<Building2 size={16} />}>Immeuble « {p.name} »{company ? ` dans ${company.name}` : ""}</Item>
            ) : (
              <Item icon={<Building2 size={16} />}>{building ? `${building.name} mis à jour${p.valueAfterWorks ? " (valeur après travaux)" : ""}` : "Immeuble à choisir dans le projet"}</Item>
            )}
            {(p.lots ?? []).length > 0 && <Item icon={<DoorOpen size={16} />}>{p.lots.length} logement(s) avec leur loyer</Item>}
            {loans.filter((l) => l.amount).length > 0 && <Item icon={<Landmark size={16} />}>{loans.filter((l) => l.amount).length} crédit(s), calculés à partir des conditions ci-dessous</Item>}
            {worksCount > 0 && <Item icon={<Hammer size={16} />}>{worksCount} poste(s) de travaux prévus{loans.length ? ", financés par le crédit" : ""}</Item>}
          </div>
          {!ready && <p className="mt-3 text-[13px] text-warn">{acquisition ? "Choisissez d'abord la société qui achète (onglet « Le bien » du projet)." : "Choisissez d'abord l'immeuble concerné."}</p>}
        </Card>

        <SectionTitle>Chiffres définitifs</SectionTitle>
        <Card>
          <Stack>
            <DateField label={acquisition ? "Date de l'acte" : "Date de déblocage du prêt"} value={date} onChange={setDate} />
            {acquisition && <NumberField label="Prix d'achat final" value={price} onChange={setPrice} />}
            {acquisition && (p.lots ?? []).length > 0 && (
              <div className="flex justify-end">
                <Toggle label="Logements déjà loués à l'achat" checked={rented} onChange={setRented} />
              </div>
            )}
          </Stack>
        </Card>

        {loans.length > 0 && (
          <>
            <SectionTitle>Prêts obtenus</SectionTitle>
            <div className="space-y-2">
              {loans.map((l) => {
                const lf = loanFigures(l);
                const setLoan = (patch: Partial<ProjectLoan>) => setLoans((cur) => cur.map((x) => (x.id === l.id ? { ...x, ...patch } : x)));
                return (
                  <Card key={l.id}>
                    <Stack>
                      <Grid2>
                        <TextField label="Nom" value={l.label} onChange={(v) => setLoan({ label: v })} />
                        <TextField label="Banque" value={l.bank} onChange={(v) => setLoan({ bank: v })} />
                      </Grid2>
                      <NumberField label="Montant" value={l.amount} onChange={(v) => setLoan({ amount: v })} />
                      <Grid2>
                        <NumberField label="Taux" suffix="%" value={l.ratePct} onChange={(v) => setLoan({ ratePct: v })} />
                        <NumberField label="Durée" suffix="ans" value={l.durationMonths !== undefined ? l.durationMonths / 12 : undefined} onChange={(v) => setLoan({ durationMonths: v !== undefined ? Math.round(v * 12) : undefined })} />
                      </Grid2>
                      <NumberField label="Assurance / mois" value={l.insuranceMonthly} onChange={(v) => setLoan({ insuranceMonthly: v })} />
                      <div className="text-[13px] text-muted">{lf.monthly === undefined ? "Mensualité : données insuffisantes." : `Mensualité ${eur(lf.monthly)} assurance comprise`}</div>
                    </Stack>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-4 px-1 text-[12.5px] text-muted">
          Le projet reste consultable dans l&apos;historique. Pensez à mettre à jour la trésorerie de la société après le versement de l&apos;apport.
        </p>
        <div className="mt-4">
          <Button full disabled={!ready} onClick={confirm} icon={<Building2 size={18} />}>
            Intégrer à mon patrimoine
          </Button>
        </div>
      </Page>
    </>
  );
}

function Item({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-soft text-navy">{icon}</span>
      <span className="pt-1">{children}</span>
    </div>
  );
}
