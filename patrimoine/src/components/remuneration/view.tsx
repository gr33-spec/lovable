"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Briefcase, ChevronLeft, ChevronRight, HandCoins, Plus, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import type { Collection, Company, CompanyActivity, Household, Withdrawal, WithdrawalKind } from "@/lib/types";
import { WITHDRAWAL_KINDS } from "@/lib/labels";
import { eur, pct } from "@/lib/format";
import { yearOf } from "@/lib/engine/dates";
import { amountFor, compareOptions, remunerationYear, type SourceResult } from "@/lib/fiscal/remuneration";
import { BAREME_YEAR, CAPITAL, PASS, SALARY, SOURCES } from "@/lib/fiscal/bareme";
import { useCompanyOptions } from "../forms";
import { QuickCompany } from "../quick-add";
import { Toggle } from "../projects/detail";
import { Button, Card, ConfirmDelete, Details, Grid2, NumberField, Page, PageHeader, RoundButton, SectionTitle, Segmented, SelectField, Sheet, Stack, TextField, cx } from "../ui";
import { SwipeDelete } from "@/components/swipe";

const SHORT: Record<WithdrawalKind, string> = {
  tns: "Rémunération TNS",
  salaire: "Salaire",
  dividendes: "Dividendes",
  cca: "Compte courant",
  autre: "Autre",
};

/** Prénoms proposés : ceux déjà saisis, sinon le nom du propriétaire (« Grégory & Enora »). */
function usePersons(): string[] {
  const { data } = useStore();
  const set = new Set<string>();
  for (const w of data.withdrawals) if (w.person?.trim()) set.add(w.person.trim());
  for (const n of (data.settings.ownerName ?? "").split(/&| et |,/)) if (n.trim()) set.add(n.trim());
  return [...set];
}

function Slider({ value, max, step = 500, onChange, label }: { value: number; max: number; step?: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="range"
      min={0}
      max={max}
      step={step}
      value={Math.min(value, max)}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#0b2545]"
    />
  );
}

export function RemunerationView() {
  const { data, nowMonth, upsert, upsertMany, remove, setSettings } = useStore();
  const y0 = yearOf(nowMonth);
  const [year, setYear] = useState(y0);
  const [editId, setEditId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [addingCompany, setAddingCompany] = useState(false);
  const persons = usePersons();
  const h: Household = data.settings.household ?? {};
  const setHousehold = (patch: Partial<Household>) => setSettings({ household: { ...h, ...patch } });

  const r = useMemo(() => remunerationYear(data, year, y0), [data, year, y0]);
  const timeline = useMemo(() => [0, 1, 2, 3, 5, 10].map((i) => remunerationYear(data, y0 + i, y0)), [data, y0]);
  const edit = data.withdrawals.find((w) => w.id === editId);

  const add = () => {
    const item: Withdrawal = { id: newId(), kind: "tns", person: persons[0], startYear: y0, annualAmount: 30000 };
    upsert("withdrawals", item);
    setEditId(item.id);
  };

  const byPerson = new Map<string, SourceResult[]>();
  for (const s of r.sources) byPerson.set(s.person, [...(byPerson.get(s.person) ?? []), s]);
  // Sources hors période cette année : affichées pour pouvoir les régler.
  const inactive = data.withdrawals.filter((w) => !r.sources.some((s) => s.withdrawal.id === w.id));
  const levy = r.cost > 0 ? ((r.social + r.tax) / r.cost) * 100 : undefined;

  return (
    <>
      <PageHeader title="Rémunération" back="/plus" subtitle="Salaires, dividendes, comptes courants" action={<RoundButton label="Ajouter une rémunération" onClick={add}><Plus size={22} /></RoundButton>} />
      <Page>
        <div className="flex items-center justify-between rounded-[20px] bg-card px-2 py-1.5 shadow-sm">
          <button onClick={() => setYear(Math.max(y0, year - 1))} disabled={year <= y0} aria-label="Année précédente" className="flex h-10 w-10 items-center justify-center rounded-full text-navy disabled:opacity-30">
            <ChevronLeft size={22} />
          </button>
          <div className="text-[16px] font-bold text-navy">Année {year}</div>
          <button onClick={() => setYear(Math.min(y0 + 30, year + 1))} aria-label="Année suivante" className="flex h-10 w-10 items-center justify-center rounded-full text-navy">
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Synthèse */}
        <div className="hero-card mt-3 rounded-[28px] p-5 text-white">
          <div className="text-[13px] text-white/60">Revenus nets du foyer, après cotisations et impôts</div>
          <div className="tabular text-[32px] font-extrabold leading-tight">{eur(Math.round(r.net))}</div>
          <div className="text-[13px] text-white/70">soit {eur(Math.round(r.net / 12))} par mois</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Tile label="Coût sociétés" value={eur(Math.round(r.cost))} />
            <Tile label="Cotisations" value={eur(Math.round(r.social))} />
            <Tile label="Impôts" value={eur(Math.round(r.tax))} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 text-[12.5px] text-white/70">
            <span>Prélèvement global {levy === undefined ? "—" : pct(levy)}</span>
            <span>Tranche marginale {pct(r.marginal * 100, 0)}</span>
          </div>
        </div>

        {r.warnings.length > 0 && (
          <Card className="mt-3">
            {r.warnings.map((w) => (
              <div key={w} className="flex gap-2 py-1 text-[13px] text-warn">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}
              </div>
            ))}
          </Card>
        )}

        {data.withdrawals.length === 0 && (
          <Card className="mt-3">
            <p className="text-[14px] text-ink-2">
              Ajoutez une rémunération (gérance TNS, salaire, dividendes, remboursement de compte courant) : cotisations, impôt sur le revenu et net en poche sont calculés avec les barèmes {BAREME_YEAR}, et vous pouvez combiner plusieurs sources.
            </p>
            <div className="mt-3">
              <Button full onClick={add} icon={<Plus size={18} />}>
                Ajouter une rémunération
              </Button>
            </div>
          </Card>
        )}

        {/* Par personne */}
        {[...byPerson.entries()].map(([person, list]) => {
          const p = r.persons.find((x) => x.person === person)!;
          return (
            <div key={person}>
              <SectionTitle action={<span className="tabular text-[14px] font-semibold text-navy">{eur(Math.round(p.net / 12))}/mois</span>}>{person}</SectionTitle>
              <div className="space-y-2">
                {list.map((s) => (
                  <SourceCard key={s.withdrawal.id} s={s} year={year} y0={y0} onEdit={() => setEditId(s.withdrawal.id)} onAmount={(v) => upsert("withdrawals", { ...s.withdrawal, annualAmount: v })} />
                ))}
              </div>
              {p.pension > 0 && <p className="mt-1.5 px-1 text-[12px] text-muted">Cotisations retraite : {eur(Math.round(p.pension))} par an (droits acquis).</p>}
            </div>
          );
        })}

        {inactive.length > 0 && (
          <>
            <SectionTitle>Hors période en {year}</SectionTitle>
            <Card className="py-1">
              {inactive.map((w) => (
                <SwipeDelete key={w.id} className="border-b border-line last:border-0" items={[{ coll: "withdrawals", id: w.id }]} message="Rémunération supprimée">
                <button onClick={() => setEditId(w.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                  <span className="min-w-0 truncate text-[14px] text-ink">
                    {SHORT[w.kind]} · {w.person || "—"}
                  </span>
                  <span className="shrink-0 text-[12.5px] text-muted">
                    {w.startYear ?? y0}
                    {w.endYear ? ` → ${w.endYear}` : " →"}
                  </span>
                </button>
                </SwipeDelete>
              ))}
            </Card>
          </>
        )}

        {/* Comparateur */}
        <Comparator year={year} y0={y0} persons={persons} onApply={(items, removeIds) => {
          upsertMany(items.map((item) => ({ coll: "withdrawals" as Collection, item })));
          if (removeIds.length) remove("withdrawals", removeIds);
        }} />

        {/* Sociétés d'exploitation */}
        <SectionTitle action={<button onClick={() => setAddingCompany(true)} className="flex items-center gap-1 text-sm font-medium text-series-1"><Plus size={15} /> Société</button>}>Sociétés qui rémunèrent</SectionTitle>
        <Card className="py-1">
          {data.companies.filter((c) => c.kind !== "holding" || c.activity).length === 0 && <p className="py-3 text-[13.5px] text-muted">Aucune société.</p>}
          {data.companies
            .filter((c) => c.activity || c.kind === "SARL" || c.kind === "SAS" || data.withdrawals.some((w) => w.companyId === c.id))
            .map((c) => {
              const cap = r.companies.find((x) => x.company.id === c.id);
              return (
                <button key={c.id} onClick={() => setActivityId(c.id)} className="flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft text-navy">
                    <Briefcase size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{c.name}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {cap
                        ? `Résultat ${eur(Math.round(cap.profitBefore))} · IS ${eur(Math.round(cap.corporateTax))} · distribuable ${eur(Math.round(cap.distributable))}`
                        : c.activity
                          ? "Activité déclarée"
                          : "Déclarer le chiffre d'affaires et les charges"}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </button>
              );
            })}
        </Card>

        {/* Évolution */}
        {data.withdrawals.length > 0 && (
          <>
            <SectionTitle>Dans le temps</SectionTitle>
            <Card className="py-2">
              <div className="grid grid-cols-[3.2rem_1fr_1fr_1fr] gap-2 border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <span>Année</span>
                <span className="text-right">Coût</span>
                <span className="text-right">Prélevé</span>
                <span className="text-right">Net / mois</span>
              </div>
              {timeline.map((t) => (
                <button key={t.year} onClick={() => setYear(t.year)} className={cx("tabular grid w-full grid-cols-[3.2rem_1fr_1fr_1fr] gap-2 py-1.5 text-left text-[14px]", t.year === year && "font-bold")}>
                  <span className="text-navy">{t.year}</span>
                  <span className="text-right text-ink-2">{eur(Math.round(t.cost))}</span>
                  <span className="text-right text-ink-2">{eur(Math.round(t.social + t.tax))}</span>
                  <span className="text-right text-ink">{eur(Math.round(t.net / 12))}</span>
                </button>
              ))}
            </Card>
          </>
        )}

        {/* Foyer et hypothèses */}
        <SectionTitle>Foyer fiscal</SectionTitle>
        <Card>
          <Stack>
            <div className="flex justify-end">
              <Toggle label="Imposition commune (mariés ou pacsés)" checked={!!h.couple} onChange={(v) => setHousehold({ couple: v, parts: Math.max(v ? 2 : 1, h.parts ?? 1) })} />
            </div>
            <Grid2>
              <NumberField label="Parts fiscales" suffix="" value={h.parts ?? (h.couple ? 2 : 1)} onChange={(v) => setHousehold({ parts: v })} />
              <NumberField label="Autres revenus imposables / an" value={h.otherIncome} onChange={(v) => setHousehold({ otherIncome: v })} hint="Salaires extérieurs, revenus fonciers nets…" />
            </Grid2>
            <TextField
              label="Votre stratégie (reprise dans le dossier banque)"
              multiline
              value={h.strategy}
              placeholder="Ex. Rémunération de gérance limitée pour cotiser à la retraite, complétée par des dividendes ; remboursement progressif des comptes courants ; les loyers restent dans les SCI pour rembourser les crédits."
              onChange={(v) => setHousehold({ strategy: v })}
            />
            <Details title={`Hypothèses (barèmes ${BAREME_YEAR})`}>
              <Grid2>
                <NumberField label="Charges salariales" suffix="%" value={h.salaryEmployeePct} placeholder={`${SALARY.employee * 100}`} onChange={(v) => setHousehold({ salaryEmployeePct: v })} />
                <NumberField label="Charges patronales" suffix="%" value={h.salaryEmployerPct} placeholder={`${SALARY.employer * 100}`} onChange={(v) => setHousehold({ salaryEmployerPct: v })} />
              </Grid2>
              <Grid2>
                <NumberField label="Prélèvements sociaux dividendes" suffix="%" value={h.dividendSocialPct} placeholder={`${(CAPITAL.socialDividends * 100).toLocaleString("fr-FR")}`} onChange={(v) => setHousehold({ dividendSocialPct: v })} />
                <NumberField label="Impôt forfaitaire dividendes" suffix="%" value={h.pfuIncomePct} placeholder={`${(CAPITAL.pfuIncome * 100).toLocaleString("fr-FR")}`} onChange={(v) => setHousehold({ pfuIncomePct: v })} />
              </Grid2>
              <div className="space-y-1 text-[12px] text-muted">
                <p>
                  Gérant majoritaire : cotisations des indépendants {BAREME_YEAR} (assiette abattue de 26 %, PASS {PASS.toLocaleString("fr-FR")} €). Salaire : taux moyens hors chômage. Dividendes : prélèvement forfaitaire de 31,4 % ou barème (abattement de 40 %). Impôt sur le revenu : barème {BAREME_YEAR}, quotient familial plafonné, décote. IS : 15 % jusqu&apos;à 42 500 €, 25 % au-delà.
                </p>
                <p>Estimations à faire valider par votre expert-comptable (taux accident du travail, prévoyance, contribution sur les hauts revenus non inclus).</p>
                {SOURCES.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block text-series-1">
                    {s.label}
                  </a>
                ))}
              </div>
            </Details>
          </Stack>
        </Card>

        <CurrentAccounts year={year} y0={y0} />
      </Page>

      <SourceSheet w={edit} persons={persons} onClose={() => setEditId(null)} />
      <ActivitySheet company={data.companies.find((c) => c.id === activityId)} onClose={() => setActivityId(null)} />
      <Sheet open={addingCompany} onClose={() => setAddingCompany(false)} title="Nouvelle société">
        <QuickCompany
          onDone={(id) => {
            setAddingCompany(false);
            setActivityId(id);
          }}
        />
      </Sheet>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="tabular text-[15px] font-bold">{value}</div>
    </div>
  );
}

function SourceCard({ s, year, y0, onEdit, onAmount }: { s: SourceResult; year: number; y0: number; onEdit: () => void; onAmount: (v: number) => void }) {
  const w = s.withdrawal;
  const base = w.annualAmount ?? 0;
  const max = Math.max(60000, Math.ceil((base * 2) / 10000) * 10000);
  const amountLabel = w.kind === "tns" || w.kind === "salaire" ? "Coût pour la société" : w.kind === "dividendes" ? "Dividendes bruts" : "Montant";
  const grows = (w.growthPct ?? 0) !== 0 && year > (w.startYear ?? y0);
  return (
    <Card>
      <button onClick={onEdit} className="flex w-full items-start justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-navy">{SHORT[w.kind]}</span>
          <span className="block truncate text-[12.5px] text-muted">
            {[s.company?.name, `${w.startYear ?? y0}${w.endYear ? ` → ${w.endYear}` : " →"}`, w.growthPct ? `${w.growthPct > 0 ? "+" : ""}${w.growthPct} %/an` : undefined, w.kind === "dividendes" ? (w.dividendTax === "bareme" ? "barème" : "flat tax") : undefined].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="tabular block text-[15px] font-bold text-ink">{eur(Math.round(s.net))}</span>
          <span className="block text-[11px] text-muted">net / an</span>
        </span>
      </button>
      <div className="mt-3 flex items-center justify-between text-[12.5px] text-ink-2">
        <span>{amountLabel}</span>
        <span className="tabular font-semibold text-ink">
          {eur(Math.round(s.cost))}
          {grows ? ` (${eur(base)} en ${w.startYear})` : ""}
        </span>
      </div>
      <Slider value={base} max={max} onChange={onAmount} label={`${amountLabel} — ${SHORT[w.kind]}`} />
      <div className="mt-1 flex flex-wrap gap-x-3 text-[12px] text-muted">
        {s.social > 0 && <span>Cotisations {eur(Math.round(s.social))}</span>}
        {s.capitalSocial > 0 && <span>Prélèvements sociaux {eur(Math.round(s.capitalSocial))}</span>}
        {s.incomeTax > 0 && <span>Impôt {eur(Math.round(s.incomeTax))}</span>}
        {w.kind === "cca" && <span>Non imposable (remboursement d&apos;avance)</span>}
      </div>
      {s.notes.map((n) => (
        <p key={n} className="mt-1 text-[12px] text-warn">
          {n}
        </p>
      ))}
    </Card>
  );
}

function SourceSheet({ w, persons, onClose }: { w?: Withdrawal; persons: string[]; onClose: () => void }) {
  const { upsert, remove } = useStore();
  const companies = useCompanyOptions();
  const set = (patch: Partial<Withdrawal>) => w && upsert("withdrawals", { ...w, ...patch });
  return (
    <Sheet
      open={!!w}
      onClose={onClose}
      title="Rémunération"
      footer={
        <div className="space-y-2">
          <Button full onClick={onClose}>
            Terminé
          </Button>
          {w && <ConfirmDelete label="Supprimer" message="Supprimer cette rémunération ?" onConfirm={() => { remove("withdrawals", w.id); onClose(); }} />}
        </div>
      }
    >
      {w && (
        <Stack>
          <SelectField label="Nature" value={w.kind} options={WITHDRAWAL_KINDS} onChange={(v) => set({ kind: v ?? "tns" })} allowEmpty={false} />
          <div>
            <TextField label="Bénéficiaire" value={w.person} placeholder="Prénom" onChange={(v) => set({ person: v })} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {persons.map((p) => (
                <button key={p} type="button" onClick={() => set({ person: p })} className={cx("rounded-full px-3 py-1 text-[12.5px] font-semibold", w.person === p ? "bg-navy text-white" : "bg-soft text-ink-2")}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <SelectField label="Société qui verse" value={w.companyId ?? undefined} options={companies} onChange={(v) => set({ companyId: v ?? null })} />
          <NumberField
            label={w.kind === "tns" || w.kind === "salaire" ? "Coût annuel pour la société" : w.kind === "dividendes" ? "Dividendes bruts annuels" : "Montant annuel"}
            value={w.annualAmount}
            onChange={(v) => set({ annualAmount: v })}
            hint={w.kind === "tns" ? "Rémunération + cotisations (tout ce que la société débourse)." : w.kind === "salaire" ? "Salaire brut + charges patronales." : undefined}
          />
          <Grid2>
            <NumberField label="De l'année" suffix="" integer value={w.startYear} onChange={(v) => set({ startYear: v ? Math.round(v) : undefined })} />
            <NumberField label="À l'année" suffix="" integer value={w.endYear} onChange={(v) => set({ endYear: v ? Math.round(v) : undefined })} placeholder="Sans fin" />
          </Grid2>
          <NumberField label="Évolution par an" suffix="%" value={w.growthPct} onChange={(v) => set({ growthPct: v })} />
          {w.kind === "dividendes" && (
            <Segmented
              value={w.dividendTax ?? "pfu"}
              onChange={(v) => set({ dividendTax: v })}
              options={[
                { value: "pfu", label: "Flat tax 31,4 %" },
                { value: "bareme", label: "Barème (abattement 40 %)" },
              ]}
            />
          )}
          {w.kind === "dividendes" && (
            <Toggle label="Versés au gérant majoritaire de cette SARL" checked={!!w.majorityManager} onChange={(v) => set({ majorityManager: v })} />
          )}
          {w.kind === "autre" && <NumberField label="Taux de charges / fiscalité" suffix="%" value={w.taxRatePct} onChange={(v) => set({ taxRatePct: v })} />}
          {w.kind === "tns" && (
            <p className="text-[12.5px] text-muted">
              Gérant majoritaire de SARL / EURL. Si des dividendes sont versés par la même société, la part au-delà de 10 % du capital et des comptes courants supporte aussi les cotisations.
            </p>
          )}
          <TextField label="Libellé (facultatif)" value={w.label} onChange={(v) => set({ label: v })} />
        </Stack>
      )}
    </Sheet>
  );
}

function ActivitySheet({ company, onClose }: { company?: Company; onClose: () => void }) {
  const { data, upsert } = useStore();
  if (!company) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const a: CompanyActivity = company.activity ?? {};
  const setA = (patch: Partial<CompanyActivity>) => upsert("companies", { ...company, activity: { ...a, ...patch } });
  const billed = a.billed ?? [];
  const targets = data.companies.filter((c) => c.id !== company.id).map((c) => ({ value: c.id, label: c.name }));
  return (
    <Sheet open onClose={onClose} title={company.name} footer={<Button full onClick={onClose}>Terminé</Button>}>
      <Stack>
        <p className="text-[13px] text-muted">Pour une société d&apos;exploitation (ex. SARL de bâtiment) : son résultat finance les rémunérations, l&apos;impôt sur les sociétés et les dividendes.</p>
        <Grid2>
          <NumberField label="Chiffre d'affaires / an" value={a.revenue} onChange={(v) => setA({ revenue: v })} />
          <NumberField label="Charges / an" value={a.expenses} onChange={(v) => setA({ expenses: v })} hint="Hors rémunération des dirigeants" />
        </Grid2>
        <Grid2>
          <NumberField label="Évolution par an" suffix="%" value={a.growthPct} onChange={(v) => setA({ growthPct: v })} />
          <NumberField label="Capital social" value={company.shareCapital} onChange={(v) => upsert("companies", { ...company, shareCapital: v })} />
        </Grid2>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-navy">Facturé aux sociétés du groupe</span>
            <button type="button" onClick={() => setA({ billed: [...billed, { companyId: targets[0]?.value ?? "" }] })} className="flex items-center gap-1 text-sm font-medium text-series-1">
              <Plus size={15} /> Ajouter
            </button>
          </div>
          {billed.length === 0 && <p className="text-[12.5px] text-muted">Ex. travaux ou entretien facturés à vos SCI : ce montant fait partie du chiffre d&apos;affaires et devient une charge pour la SCI dans les projections.</p>}
          <div className="space-y-2">
            {billed.map((b, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <SelectField label="Société facturée" value={b.companyId} options={targets} allowEmpty={false} onChange={(v) => setA({ billed: billed.map((x, j) => (j === i ? { ...x, companyId: v ?? x.companyId } : x)) })} />
                </div>
                <div className="w-32">
                  <NumberField label="€ / an" value={b.annualAmount} onChange={(v) => setA({ billed: billed.map((x, j) => (j === i ? { ...x, annualAmount: v } : x)) })} />
                </div>
                <button type="button" aria-label="Retirer" onClick={() => setA({ billed: billed.filter((_, j) => j !== i) })} className="mb-3 p-1 text-muted">
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Stack>
    </Sheet>
  );
}

function Comparator({ year, y0, persons, onApply }: { year: number; y0: number; persons: string[]; onApply: (items: Withdrawal[], removeIds: string[]) => void }) {
  const { data } = useStore();
  const companies = useCompanyOptions();
  const [person, setPerson] = useState<string | undefined>(persons[0]);
  const [companyId, setCompanyId] = useState<string | undefined>(() => data.companies.find((c) => c.activity)?.id ?? data.companies.find((c) => c.kind === "SARL" || c.kind === "SAS")?.id);
  const company = data.companies.find((c) => c.id === companyId);
  const [statut, setStatut] = useState<"tns" | "salaire">(company?.kind === "SAS" ? "salaire" : "tns");
  const [budget, setBudget] = useState(80000);
  const result = useMemo(() => (person && companyId && budget > 0 ? compareOptions(data, year, y0, person, companyId, budget, statut) : undefined), [data, year, y0, person, companyId, budget, statut]);
  const apply = () => {
    if (!result || !person || !companyId) return;
    const existing = data.withdrawals.filter((w) => w.person === person && w.companyId === companyId && (w.kind === "tns" || w.kind === "salaire" || w.kind === "dividendes"));
    const { remuneration: rem, dividends } = result.best;
    const items: Withdrawal[] = [];
    if (rem > 0) items.push({ id: newId(), kind: statut, person, companyId, annualAmount: Math.round(rem), startYear: year });
    if (dividends > 0) items.push({ id: newId(), kind: "dividendes", person, companyId, annualAmount: Math.round(dividends), startYear: year, dividendTax: "pfu", majorityManager: statut === "tns" });
    onApply(items, existing.map((w) => w.id));
  };
  return (
    <>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Sparkles size={17} className="text-gold" /> Comparer les options
        </span>
      </SectionTitle>
      <Card>
        <Stack>
          <Grid2>
            <SelectField label="Pour" value={person} options={persons.map((p) => ({ value: p, label: p }))} onChange={setPerson} />
            <SelectField label="Société" value={companyId} options={companies} onChange={setCompanyId} />
          </Grid2>
          <Segmented
            value={statut}
            onChange={setStatut}
            options={[
              { value: "tns", label: "Gérant majoritaire (TNS)" },
              { value: "salaire", label: "Assimilé salarié" },
            ]}
          />
          <div>
            <div className="flex items-center justify-between text-[13px] text-ink-2">
              <span>Bénéfice à distribuer (avant rémunération et IS)</span>
              <b className="tabular text-ink">{eur(budget)}</b>
            </div>
            <Slider value={budget} max={250000} step={1000} onChange={setBudget} label="Bénéfice à distribuer" />
          </div>
          {result && (
            <div className="divide-y divide-line">
              {[...result.options, result.best].map((o, i) => (
                <div key={i} className={cx("flex items-center justify-between gap-3 py-2.5", i === 2 && "rounded-xl bg-pos/10 px-3")}>
                  <span className="min-w-0">
                    <span className={cx("block text-[14px]", i === 2 ? "font-bold text-pos" : "text-ink")}>{i === 2 ? `Meilleur : ${o.label}` : o.label}</span>
                    <span className="block text-[11.5px] text-muted">
                      IS {eur(Math.round(o.corporateTax))} · cotisations {eur(Math.round(o.social))} · impôt {eur(Math.round(o.tax))}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tabular block text-[15px] font-bold text-navy">{eur(Math.round(o.net))}</span>
                    <span className="block text-[11px] text-muted">net / an</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {result && (
            <Button variant="secondary" full onClick={apply} icon={<HandCoins size={18} />}>
              Appliquer le meilleur choix à {person}
            </Button>
          )}
          <p className="text-[11.5px] text-muted">Compare, pour un même bénéfice, rémunération (déductible de l&apos;IS) et dividendes (après IS), en tenant compte des autres revenus du foyer. Retraite et protection sociale ne sont acquises qu&apos;avec une rémunération.</p>
        </Stack>
      </Card>
    </>
  );
}

function CurrentAccounts({ year, y0 }: { year: number; y0: number }) {
  const { data } = useStore();
  const cca = data.companies.filter((c) => (c.partnerAccounts ?? 0) > 0);
  if (cca.length === 0) return null;
  return (
    <>
      <SectionTitle>Comptes courants d&apos;associés</SectionTitle>
      <Card className="py-1">
        {cca.map((c) => {
          let repaid = 0;
          for (let y = y0; y <= year + 30; y++) for (const w of data.withdrawals) if (w.kind === "cca" && w.companyId === c.id) repaid += amountFor(w, y, y0);
          return (
            <div key={c.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
              <span className="min-w-0">
                <span className="block truncate text-[15px] text-ink">{c.name}</span>
                <span className="block text-[12px] text-muted">{repaid > 0 ? `Remboursements prévus : ${eur(Math.round(repaid))}` : "Aucun remboursement prévu"}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tabular block text-[15px] font-semibold text-ink">{eur(c.partnerAccounts)}</span>
                {repaid > (c.partnerAccounts ?? 0) + 1 && <span className="block text-[11px] text-neg">Dépassement du solde</span>}
              </span>
            </div>
          );
        })}
      </Card>
    </>
  );
}

