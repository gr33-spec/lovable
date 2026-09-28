"use client";

import { goBack } from "@/lib/nav";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CircleAlert, FileDown, FileText, Loader2, Paperclip, Plus, Share, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Project, ProjectCost, ProjectLoan, ProjectLot } from "@/lib/types";
import { STATUS_LABEL, isOpen, projectCompanyName, projectFigures } from "@/lib/engine/projects";
import { projectImpact } from "@/lib/engine/project-impact";
import { CONDITIONS, UNIT_TYPES } from "@/lib/labels";
import { eur, eurCompact, eurSigned, pct } from "@/lib/format";
import { ACCEPTED_FILES, uploadFile } from "@/lib/upload";
import { sharePdf } from "../tenancy/common";
import { useBuildingOptions, useCompanyOptions } from "../forms";
import { Button, Card, ConfirmDelete, DateField, Empty, Grid2, NumberField, Page, PageHeader, Pill, SectionTitle, SelectField, Stack, TextField, cx } from "../ui";
import { STATUS_TONE } from "./list";
import { openDocument } from "../pdf-viewer";

type Tab = "bien" | "cout" | "financement" | "loyers" | "banque";

const PROPERTY_TYPES: { value: NonNullable<Project["propertyType"]>; label: string }[] = [
  { value: "immeuble", label: "Immeuble de rapport" },
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison" },
  { value: "local", label: "Local commercial" },
  { value: "terrain", label: "Terrain" },
  { value: "autre", label: "Autre" },
];
const DPE = (["A", "B", "C", "D", "E", "F", "G"] as const).map((v) => ({ value: v, label: v }));
const PERIODS = [
  { value: "avant_1949", label: "Avant 1949" },
  { value: "1949_1974", label: "1949 – 1974" },
  { value: "1975_1989", label: "1975 – 1989" },
  { value: "1990_2005", label: "1990 – 2005" },
  { value: "apres_2005", label: "Après 2005" },
] as const;
const NEW_COMPANY = "__new";

export function ProjectDetail({ id }: { id: string }) {
  const { data, nowMonth, upsert, remove } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bien");
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const p = (data.projects ?? []).find((x) => x.id === id);
  const impact = useMemo(() => (p && isOpen(p) ? projectImpact(data, nowMonth, p) : undefined), [data, nowMonth, p]);
  if (!p) {
    return (
      <>
        <PageHeader title="Projet" back="/patrimoine?vue=projets" />
        <Empty title="Projet introuvable" text="Il a peut-être été supprimé." />
      </>
    );
  }
  const set = (patch: Partial<Project>) => upsert("projects", { ...p, ...patch });
  const f = projectFigures(p);
  const editable = isOpen(p);
  const acquisition = p.kind !== "travaux";
  const dossierUrl = `/api/dossier-banque?projet=${p.id}`;

  const tabs: { value: Tab; label: string }[] = [
    { value: "bien", label: acquisition ? "Le bien" : "L'immeuble" },
    { value: "cout", label: "Coût" },
    { value: "financement", label: "Financement" },
    { value: "loyers", label: "Loyers" },
    { value: "banque", label: "Banque" },
  ];

  return (
    <>
      <PageHeader title={p.name} subtitle={[acquisition ? "Achat" : "Travaux", projectCompanyName(p, data)].filter(Boolean).join(" · ")} back="/patrimoine?vue=projets" />
      <Page>
        {/* Étapes */}
        <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
          {(["idee", "etude", "soumis", "accorde"] as const).map((s) => (
            <button
              key={s}
              disabled={!editable}
              onClick={() => set({ status: s, ...(s === "soumis" && !p.submittedDate ? { submittedDate: new Date().toISOString().slice(0, 10) } : {}) })}
              className={cx("shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-60", p.status === s ? "bg-navy text-white" : "bg-soft text-ink-2")}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          {!editable && <Pill tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill>}
        </div>

        {p.status === "realise" && p.realizedBuildingId && (
          <Link href={`/patrimoine/immeuble/${p.realizedBuildingId}`} className="mb-3 flex items-center gap-3 rounded-2xl bg-pos/10 px-4 py-3 text-[14px] font-semibold text-pos">
            <Building2 size={18} /> Projet réalisé le {p.realizedAt?.split("-").reverse().join("/")} — voir l&apos;immeuble
          </Link>
        )}

        {/* Synthèse */}
        <div className="hero-card rounded-[28px] p-5 text-white">
          <div className="text-[13px] text-white/60">Coût total du projet</div>
          <div className="tabular text-[30px] font-extrabold leading-tight">{f.totalCost === undefined ? <span className="text-xl text-white/70">Prix à renseigner</span> : eur(f.totalCost)}</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HeroTile label="Emprunt" value={eurCompact(f.loanTotal)} />
            <HeroTile label="Apport" value={eurCompact(f.equity)} />
            <HeroTile label="Cash-flow" value={f.cashflowMonthly === undefined ? "—" : `${eurSigned(Math.round(f.cashflowMonthly))}`} hint="/ mois" tone={f.cashflowMonthly === undefined ? undefined : f.cashflowMonthly >= 0 ? "pos" : "neg"} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-white/70">
            <span>Rendement brut {f.grossYieldPct === undefined ? "—" : pct(f.grossYieldPct)}</span>
            <span>net {f.netYieldPct === undefined ? "—" : pct(f.netYieldPct)}</span>
            <span>Couverture des mensualités {f.dscr === undefined ? "—" : `${f.dscr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}×`}</span>
          </div>
        </div>

        {f.missing.length > 0 && editable && (
          <Card className="mt-3">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-warn">
              <CircleAlert size={17} /> À compléter pour un dossier solide
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[13px] text-ink-2">
              {f.missing.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
          </Card>
        )}

        {/* Effet sur le groupe */}
        {impact && (
          <Card className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[14px] font-semibold text-navy">Effet sur le groupe en {impact.year}</div>
              {editable && <Toggle label="Dans les projections" checked={!!p.inProjection} onChange={(v) => set({ inProjection: v })} />}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
              <span />
              <span className="text-center text-muted">Sans</span>
              <span className="text-center text-muted">Avec le projet</span>
              <ImpactRow label="Cash-flow / mois" before={eurSigned(Math.round(impact.before.cashflowMonthly))} after={eurSigned(Math.round(impact.after.cashflowMonthly))} />
              <ImpactRow label="Dette" before={eurCompact(impact.before.debt)} after={eurCompact(impact.after.debt)} />
              {impact.before.ltvPct !== undefined && impact.after.ltvPct !== undefined && <ImpactRow label="LTV" before={pct(impact.before.ltvPct)} after={pct(impact.after.ltvPct)} />}
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              {p.inProjection && editable ? "Le projet est intégré à l'accueil, à la chronologie et au dossier banque du groupe." : "Activez « Dans les projections » pour voir le projet dans l'accueil et la chronologie."}
            </p>
          </Card>
        )}

        {/* Sections */}
        <div className="no-scrollbar -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)} className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold", tab === t.value ? "bg-navy text-white" : "bg-soft text-ink-2")}>
              {t.label}
            </button>
          ))}
        </div>
        <fieldset disabled={!editable} className="mt-3 min-w-0">
          {tab === "bien" && <PropertySection p={p} set={set} />}
          {tab === "cout" && <CostSection p={p} set={set} />}
          {tab === "financement" && <FinancingSection p={p} set={set} />}
          {tab === "loyers" && <RentSection p={p} set={set} />}
          {tab === "banque" && (
            <Card>
              <Stack>
                <TextField
                  label="Objet de la demande"
                  multiline
                  value={p.requestPurpose}
                  placeholder={acquisition ? "Ex. Acquisition d'un immeuble de 6 logements à Paimpol, travaux de rénovation énergétique et mise en location." : "Ex. Rénovation énergétique et création de 2 logements."}
                  onChange={(v) => set({ requestPurpose: v })}
                  hint="Présenté en première page du dossier."
                />
                <Grid2>
                  <TextField label="Banque sollicitée" value={p.submittedTo} onChange={(v) => set({ submittedTo: v })} />
                  <DateField label="Envoyé le" value={p.submittedDate} onChange={(v) => set({ submittedDate: v })} />
                </Grid2>
                <TextField label="Notes" multiline value={p.notes} onChange={(v) => set({ notes: v })} />
              </Stack>
            </Card>
          )}
        </fieldset>

        {/* Dossier de financement */}
        <SectionTitle>Dossier de financement</SectionTitle>
        <Card>
          <p className="text-[13.5px] text-ink-2">
            Votre demande, le projet, son plan de financement et sa rentabilité, puis votre groupe en résumé. Seuls les chiffres connus apparaissent.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button href={dossierUrl} variant="secondary" icon={<FileDown size={18} />}>
              Ouvrir
            </Button>
            <Button
              variant="secondary"
              icon={sharing ? <Loader2 size={18} className="animate-spin" /> : <Share size={18} />}
              onClick={async () => {
                setSharing(true);
                setShareError(await sharePdf(dossierUrl, `Dossier de financement - ${p.name}.pdf`));
                setSharing(false);
              }}
            >
              Partager
            </Button>
          </div>
          {shareError && <p className="mt-2 text-xs text-neg">{shareError}</p>}
        </Card>

        {/* Pièces jointes */}
        <SectionTitle>Documents</SectionTitle>
        <Documents p={p} set={set} editable={editable} />

        <div className="mt-8 space-y-2">
          {editable && (
            <Button full href={`/patrimoine/projet/${p.id}/realiser`} icon={<Building2 size={18} />}>
              Le projet est réalisé
            </Button>
          )}
          {editable && (
            <Button full variant="secondary" onClick={() => set({ status: "abandonne", inProjection: false })}>
              Abandonner le projet
            </Button>
          )}
          {p.status === "abandonne" && (
            <Button full variant="secondary" onClick={() => set({ status: "etude" })}>
              Reprendre le projet
            </Button>
          )}
          <ConfirmDelete
            label="Supprimer le projet"
            message={p.status === "realise" ? "Supprimer ce projet de l'historique ? L'immeuble et les crédits créés sont conservés." : "Supprimer ce projet ?"}
            onConfirm={() => {
              remove("projects", p.id);
              goBack(router, "/patrimoine?vue=projets");
            }}
          />
        </div>
      </Page>
    </>
  );
}

function HeroTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className={cx("tabular text-[16px] font-bold", tone === "pos" && "text-[#7fe0b0]", tone === "neg" && "text-[#ff9b9b]")}>{value}</div>
      {hint && <div className="text-[10.5px] text-white/50">{hint}</div>}
    </div>
  );
}

function ImpactRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <>
      <span className="text-ink-2">{label}</span>
      <span className="tabular text-center text-ink-2">{before}</span>
      <span className="tabular text-center font-semibold text-navy">{after}</span>
    </>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12.5px] font-medium text-ink-2">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-10 rounded-full transition", checked ? "bg-pos" : "bg-black/15")}
      >
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

type SectionProps = { p: Project; set: (patch: Partial<Project>) => void };

function PropertySection({ p, set }: SectionProps) {
  const { data } = useStore();
  const companies = useCompanyOptions();
  const buildings = useBuildingOptions();
  const acquisition = p.kind !== "travaux";
  const companyValue = p.companyId ?? (p.newCompanyName !== undefined ? NEW_COMPANY : undefined);
  return (
    <Card>
      <Stack>
        <TextField label="Nom du projet" value={p.name} onChange={(v) => set({ name: v ?? "" })} />
        {acquisition ? (
          <>
            <SelectField
              label="Société qui achète"
              value={companyValue}
              options={[...companies, { value: NEW_COMPANY, label: "Nouvelle société à créer" }]}
              onChange={(v) => (v === NEW_COMPANY ? set({ companyId: null, newCompanyName: p.newCompanyName ?? "", newCompanyParentId: p.newCompanyParentId ?? data.companies.find((c) => c.kind === "holding")?.id ?? null }) : set({ companyId: v ?? null, newCompanyName: undefined }))}
              emptyLabel="À définir"
            />
            {companyValue === NEW_COMPANY && (
              <Grid2>
                <TextField label="Nom de la société" value={p.newCompanyName || undefined} placeholder="Ex. SCI DU PHARE" onChange={(v) => set({ newCompanyName: v ?? "" })} />
                <SelectField label="Détenue par" value={p.newCompanyParentId ?? undefined} options={companies} onChange={(v) => set({ newCompanyParentId: v ?? null })} emptyLabel="Aucune" />
              </Grid2>
            )}
            <SelectField label="Type de bien" value={p.propertyType} options={PROPERTY_TYPES} onChange={(v) => set({ propertyType: v })} />
            <TextField label="Adresse" value={p.address} onChange={(v) => set({ address: v })} />
            <Grid2>
              <TextField label="Ville" value={p.city} onChange={(v) => set({ city: v })} />
              <NumberField label="Surface" suffix="m²" value={p.surface} onChange={(v) => set({ surface: v })} />
            </Grid2>
            <Grid2>
              <SelectField label="État" value={p.condition} options={CONDITIONS} onChange={(v) => set({ condition: v })} />
              <SelectField label="DPE" value={p.dpeClass} options={DPE} onChange={(v) => set({ dpeClass: v })} />
            </Grid2>
            <Grid2>
              <SelectField label="Construction" value={p.constructionPeriod} options={[...PERIODS]} onChange={(v) => set({ constructionPeriod: v })} />
              <SelectField
                label="Régime"
                value={p.legalRegime}
                options={[
                  { value: "monopropriete", label: "Monopropriété" },
                  { value: "copropriete", label: "Copropriété" },
                ]}
                onChange={(v) => set({ legalRegime: v })}
              />
            </Grid2>
          </>
        ) : (
          <SelectField label="Immeuble concerné" value={p.buildingId ?? undefined} options={buildings} onChange={(v) => set({ buildingId: v ?? null })} emptyLabel="Choisir…" />
        )}
        <TextField label="Présentation" multiline value={p.description} placeholder="Situation, points forts, état, locataires en place…" onChange={(v) => set({ description: v })} hint="Reprise dans le dossier de financement." />
      </Stack>
    </Card>
  );
}

function CostSection({ p, set }: SectionProps) {
  const f = projectFigures(p);
  const acquisition = p.kind !== "travaux";
  const costs = p.costs ?? [];
  const setCost = (c: ProjectCost) => set({ costs: costs.map((x) => (x.id === c.id ? c : x)) });
  return (
    <>
      {acquisition && (
        <Card>
          <Stack>
            <NumberField label="Prix d'achat (net vendeur)" value={p.price} onChange={(v) => set({ price: v })} />
            <Grid2>
              <NumberField label="Frais de notaire (taux)" suffix="%" value={p.notaryFeesPct} onChange={(v) => set({ notaryFeesPct: v })} hint={p.notaryFees === undefined && f.notary !== undefined ? `Soit ${eur(f.notary)}` : "Taux indiqué par votre notaire"} />
              <NumberField label="…ou montant connu" value={p.notaryFees} onChange={(v) => set({ notaryFees: v })} />
            </Grid2>
            <Grid2>
              <NumberField label="Frais d'agence" value={p.agencyFees} onChange={(v) => set({ agencyFees: v })} />
              <NumberField label="Frais bancaires" value={p.bankFees} onChange={(v) => set({ bankFees: v })} hint="Dossier, garantie, courtage" />
            </Grid2>
          </Stack>
        </Card>
      )}
      <SectionTitle action={<AddLink label="Poste" onClick={() => set({ costs: [...costs, { id: newId(), kind: "travaux", label: "Travaux" }] })} />}>{acquisition ? "Travaux et autres frais" : "Postes de travaux"}</SectionTitle>
      {costs.length === 0 ? (
        <Card>
          <p className="text-[13.5px] text-muted">Ajoutez chaque poste (toiture, électricité, cuisine…) avec son devis : le dossier les présente ligne par ligne.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {costs.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-3">
                  <Grid2>
                    <TextField label="Poste" value={c.label} onChange={(v) => setCost({ ...c, label: v ?? "" })} />
                    <NumberField label="Montant" value={c.amount} onChange={(v) => setCost({ ...c, amount: v })} />
                  </Grid2>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setCost({ ...c, kind: c.kind === "travaux" ? "frais" : "travaux" })} className="rounded-full bg-soft px-3 py-1 text-[12px] font-semibold text-ink-2">
                      {c.kind === "travaux" ? "Travaux" : "Autre frais"}
                    </button>
                    <QuoteButton cost={c} onChange={setCost} />
                  </div>
                </div>
                <button type="button" aria-label="Retirer le poste" onClick={() => set({ costs: costs.filter((x) => x.id !== c.id) })} className="p-1 text-muted">
                  <X size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Card className="mt-3">
        <Line label={acquisition ? "Prix + frais d'acquisition" : "Frais bancaires"} value={(f.price ?? 0) + (f.notary ?? 0) + f.agency + f.bankFees} />
        <Line label="Travaux" value={f.works} />
        {f.otherCosts > 0 && <Line label="Autres frais" value={f.otherCosts} />}
        <div className="mt-1 border-t border-line pt-1.5">
          <Line label="Coût total" value={f.totalCost} strong />
        </div>
        {!acquisition && (
          <div className="mt-3">
            <NumberField label="Frais bancaires" value={p.bankFees} onChange={(v) => set({ bankFees: v })} />
          </div>
        )}
        <div className="mt-3">
          <NumberField label={acquisition ? "Valeur estimée après travaux" : "Valeur estimée de l'immeuble après travaux"} value={p.valueAfterWorks} onChange={(v) => set({ valueAfterWorks: v })} hint="Facultatif : votre estimation, jamais calculée automatiquement." />
        </div>
      </Card>
    </>
  );
}

function QuoteButton({ cost, onChange }: { cost: ProjectCost; onChange: (c: ProjectCost) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (cost.fileId) {
    return (
      <span className="flex items-center gap-1.5">
        <a href={`/api/files/${cost.fileId}`} onClick={(e) => { e.preventDefault(); openDocument(`/api/files/${cost.fileId}`, cost.fileName); }} className="flex items-center gap-1 rounded-full bg-series-1/10 px-3 py-1 text-[12px] font-semibold text-series-1">
          <FileText size={13} /> Devis
        </a>
        <button type="button" aria-label="Retirer le devis" onClick={() => onChange({ ...cost, fileId: undefined, fileName: undefined })} className="text-muted">
          <X size={14} />
        </button>
      </span>
    );
  }
  return (
    <label className={cx("flex cursor-pointer items-center gap-1 rounded-full bg-soft px-3 py-1 text-[12px] font-semibold text-ink-2", busy && "opacity-50")}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} Joindre le devis
      <input
        type="file"
        accept={ACCEPTED_FILES}
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            onChange({ ...cost, fileId: await uploadFile(file), fileName: file.name });
          } catch (err) {
            setError((err as Error).message);
          }
          setBusy(false);
        }}
      />
      {error && <span className="text-neg">{error}</span>}
    </label>
  );
}

function FinancingSection({ p, set }: SectionProps) {
  const f = projectFigures(p);
  const loans = p.loans ?? [];
  const setLoan = (l: ProjectLoan) => set({ loans: loans.map((x) => (x.id === l.id ? l : x)) });
  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Besoins</div>
            <Line label="Coût total" value={f.totalCost} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Ressources</div>
            <Line label="Emprunts" value={f.loanTotal} />
            <Line label="Apport" value={f.equity} />
          </div>
        </div>
        {f.gap !== undefined && Math.abs(f.gap) > 1 && (
          <div className={cx("mt-3 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-[13px]", f.gap > 0 ? "bg-warn/10 text-warn" : "bg-series-1/10 text-series-1")}>
            <span>{f.gap > 0 ? `Reste à financer : ${eur(f.gap)}` : `Ressources supérieures au coût de ${eur(-f.gap)}`}</span>
            {f.gap > 0 && (
              <button type="button" onClick={() => set({ equity: Math.max(0, Math.round(((p.equity ?? 0) + f.gap!) * 100) / 100) })} className="shrink-0 rounded-full bg-card px-3 py-1 text-[12px] font-semibold text-navy">
                Compléter par l&apos;apport
              </button>
            )}
          </div>
        )}
      </Card>
      <Card className="mt-3">
        <Stack>
          <NumberField label="Apport" value={p.equity} onChange={(v) => set({ equity: v })} />
          <TextField label="Provenance de l'apport" value={p.equitySource} placeholder="Ex. Trésorerie de la SCI, compte courant de la holding" onChange={(v) => set({ equitySource: v })} />
        </Stack>
      </Card>
      <SectionTitle action={<AddLink label="Prêt" onClick={() => set({ loans: [...loans, { id: newId(), label: loans.length ? `Prêt ${loans.length + 1}` : "Prêt principal", durationMonths: 240 }] })} />}>Prêts</SectionTitle>
      {loans.length === 0 ? (
        <Card>
          <p className="text-[13.5px] text-muted">Ajoutez le ou les prêts envisagés : la mensualité est calculée automatiquement.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {f.loans.map((lf) => {
            const l = lf.loan;
            return (
              <Card key={l.id}>
                <Stack>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Grid2>
                        <TextField label="Nom" value={l.label} onChange={(v) => setLoan({ ...l, label: v })} />
                        <TextField label="Banque" value={l.bank} onChange={(v) => setLoan({ ...l, bank: v })} />
                      </Grid2>
                    </div>
                    <button type="button" aria-label="Retirer le prêt" onClick={() => set({ loans: loans.filter((x) => x.id !== l.id) })} className="self-start p-1 text-muted">
                      <X size={18} />
                    </button>
                  </div>
                  <NumberField label="Montant emprunté" value={l.amount} onChange={(v) => setLoan({ ...l, amount: v })} />
                  <Grid2>
                    <NumberField label="Taux" suffix="%" value={l.ratePct} onChange={(v) => setLoan({ ...l, ratePct: v })} />
                    <NumberField label="Durée" suffix="ans" value={l.durationMonths !== undefined ? l.durationMonths / 12 : undefined} onChange={(v) => setLoan({ ...l, durationMonths: v !== undefined ? Math.round(v * 12) : undefined })} />
                  </Grid2>
                  <Grid2>
                    <NumberField label="Assurance / mois" value={l.insuranceMonthly} onChange={(v) => setLoan({ ...l, insuranceMonthly: v })} />
                    <NumberField label="Différé" suffix="mois" integer value={l.deferralMonths} onChange={(v) => setLoan({ ...l, deferralMonths: v })} />
                  </Grid2>
                  <div className="rounded-2xl bg-soft px-4 py-3 text-[13px] text-ink-2">
                    {lf.monthly === undefined ? (
                      "Mensualité : données insuffisantes (montant, taux et durée)."
                    ) : (
                      <>
                        Mensualité <b className="tabular text-ink">{eur(lf.monthly)}</b> assurance comprise
                        {lf.deferralPayment !== undefined && <> · pendant le différé {eur(lf.deferralPayment + lf.insurance)}</>}
                        {lf.totalInterest !== undefined && <div className="text-[12px] text-muted">Coût des intérêts : {eur(lf.totalInterest)}</div>}
                      </>
                    )}
                  </div>
                </Stack>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function RentSection({ p, set }: SectionProps) {
  const f = projectFigures(p);
  const lots = p.lots ?? [];
  const acquisition = p.kind !== "travaux";
  const setLot = (l: ProjectLot) => set({ lots: lots.map((x) => (x.id === l.id ? l : x)) });
  return (
    <>
      <SectionTitle action={<AddLink label="Lot" onClick={() => set({ lots: [...lots, { id: newId(), name: `Lot ${lots.length + 1}` }] })} />}>{acquisition ? "Lots et loyers prévus" : "Lots créés ou rénovés"}</SectionTitle>
      {lots.length === 0 ? (
        <Card>
          <p className="text-[13.5px] text-muted">Un lot par logement ou local, avec le loyer prévu.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {lots.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-3">
                  <Grid2>
                    <TextField label="Nom" value={l.name} onChange={(v) => setLot({ ...l, name: v ?? "" })} />
                    <SelectField label="Type" value={l.type} options={UNIT_TYPES} onChange={(v) => setLot({ ...l, type: v })} />
                  </Grid2>
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Surface" suffix="m²" value={l.surface} onChange={(v) => setLot({ ...l, surface: v })} />
                    <NumberField label="Loyer HC" value={l.rent} onChange={(v) => setLot({ ...l, rent: v })} />
                    <NumberField label="Charges" value={l.charges} onChange={(v) => setLot({ ...l, charges: v })} />
                  </div>
                </div>
                <button type="button" aria-label="Retirer le lot" onClick={() => set({ lots: lots.filter((x) => x.id !== l.id) })} className="p-1 text-muted">
                  <X size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {!acquisition && (
        <Card className="mt-3">
          <NumberField label="Hausse des loyers existants après travaux" value={p.extraRentMonthly} onChange={(v) => set({ extraRentMonthly: v })} hint="Par mois, en plus des lots ci-dessus." />
        </Card>
      )}
      <SectionTitle>Calendrier et charges</SectionTitle>
      <Card>
        <Stack>
          <Grid2>
            <DateField label={acquisition ? "Date d'acte prévue" : "Début des travaux"} value={p.purchaseDate} onChange={(v) => set({ purchaseDate: v })} />
            <DateField label="Mise en location" value={p.rentStartDate} onChange={(v) => set({ rentStartDate: v })} />
          </Grid2>
          <Grid2>
            <NumberField label="Taxe foncière / an" value={p.propertyTax} onChange={(v) => set({ propertyTax: v })} />
            <NumberField label="Assurance / an" value={p.insurance} onChange={(v) => set({ insurance: v })} />
          </Grid2>
          <Grid2>
            <NumberField label="Copropriété / an" value={p.coproCharges} onChange={(v) => set({ coproCharges: v })} hint="Part non récupérable" />
            <NumberField label="Autres charges / an" value={p.otherCharges} onChange={(v) => set({ otherCharges: v })} />
          </Grid2>
          <NumberField label="Vacance prudente" suffix="%" value={p.vacancyPct} onChange={(v) => set({ vacancyPct: v })} hint="Part des loyers mise de côté par prudence (facultatif)." />
        </Stack>
      </Card>
      <Card className="mt-3">
        <Line label="Loyers / mois" value={f.rentMonthly} />
        {f.vacancyMonthly > 0 && <Line label="Vacance" value={-f.vacancyMonthly} />}
        <Line label="Charges / mois" value={-f.chargesAnnual / 12} />
        <Line label="Mensualités" value={f.monthlyPayments === undefined ? undefined : -f.monthlyPayments} />
        <div className="mt-1 border-t border-line pt-1.5">
          <Line label="Cash-flow / mois" value={f.cashflowMonthly} strong signed />
        </div>
      </Card>
    </>
  );
}

function Documents({ p, set, editable }: SectionProps & { editable: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docs = p.documents ?? [];
  return (
    <Card className="py-2">
      {docs.length === 0 && <p className="py-2 text-[13.5px] text-muted">Compromis, plans, photos, diagnostics… (PDF, JPEG ou PNG). Les devis se joignent aux postes de travaux.</p>}
      <div className="divide-y divide-line">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-3 py-2.5">
            <FileText size={18} className="shrink-0 text-muted" />
            <a href={`/api/files/${d.fileId}`} onClick={(e) => { e.preventDefault(); openDocument(`/api/files/${d.fileId}`, d.name); }} className="min-w-0 flex-1 truncate text-[14px] text-series-1">
              {d.name}
            </a>
            {editable && (
              <button type="button" aria-label={`Retirer ${d.name}`} onClick={() => set({ documents: docs.filter((x) => x.id !== d.id) })} className="p-1 text-muted">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {editable && (
        <label className={cx("mt-1 flex cursor-pointer items-center gap-2 py-2 text-[14px] font-semibold text-series-1", busy && "opacity-50")}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Ajouter un document
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              if (!files.length) return;
              setBusy(true);
              setError(null);
              try {
                const added = [];
                for (const file of files) added.push({ id: newId(), fileId: await uploadFile(file), name: file.name, mime: file.type });
                set({ documents: [...docs, ...added] });
              } catch (err) {
                setError((err as Error).message);
              }
              setBusy(false);
            }}
          />
        </label>
      )}
      {error && <p className="pb-2 text-xs text-neg">{error}</p>}
    </Card>
  );
}

function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-sm font-medium text-series-1">
      <Plus size={15} /> {label}
    </button>
  );
}

function Line({ label, value, strong, signed }: { label: string; value: number | undefined; strong?: boolean; signed?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-3 py-0.5 text-[13.5px]", strong ? "font-bold text-navy" : "text-ink-2")}>
      <span>{label}</span>
      <span className={cx("tabular", signed && value !== undefined && (value >= 0 ? "text-pos" : "text-neg"))}>{value === undefined ? "Données insuffisantes" : signed ? eurSigned(Math.round(value)) : eur(value)}</span>
    </div>
  );
}

