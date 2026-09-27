"use client";

import { useState } from "react";
import { Check, CircleCheck, Loader2, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Company } from "@/lib/types";
import { companyTree } from "@/lib/engine/snapshot";
import { leaseYears } from "@/lib/legal/rules";
import { LandlordFields, RegistrySearch, bestMatch, registryPatch, searchName, searchRegistry, type RegistryCompany } from "@/components/company-registry";
import { Avatar, Button, Card, Page, PageHeader, SectionTitle, Segmented, Sheet, cx } from "@/components/ui";

const REQUIRED: (keyof Company)[] = ["address", "siren", "representative"];

export default function SocietesPage() {
  const { data, upsert, setSettings } = useStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [scan, setScan] = useState<null | { running: boolean; found: { company: Company; match?: RegistryCompany; error?: string; pick: boolean }[] }>(null);
  const companies = companyTree(data.companies).map((x) => x.company);
  const editing = data.companies.find((c) => c.id === editId);
  const years = leaseYears(data.settings);

  const missing = (c: Company) => REQUIRED.filter((k) => !c[k]);

  const scanAll = async () => {
    const targets = companies.filter((c) => missing(c).length > 0);
    setScan({ running: true, found: [] });
    const found: { company: Company; match?: RegistryCompany; error?: string; pick: boolean }[] = [];
    for (const c of targets) {
      try {
        const results = await searchRegistry(searchName(c));
        const match = bestMatch(c, results);
        found.push({ company: c, match, pick: !!match });
      } catch (e) {
        found.push({ company: c, error: (e as Error).message, pick: false });
      }
      setScan({ running: true, found: [...found] });
    }
    setScan({ running: false, found });
  };

  const applyScan = () => {
    for (const f of scan?.found ?? []) {
      if (!f.pick || !f.match) continue;
      const latest = data.companies.find((c) => c.id === f.company.id) ?? f.company;
      upsert("companies", { ...latest, ...clean(registryPatch(f.match)) });
    }
    setScan(null);
  };

  return (
    <>
      <PageHeader title="Sociétés" back="/plus" subtitle="Informations reprises dans les baux et quittances" />
      <Page>
        <Card>
          <div className="text-[15px] font-semibold text-ink">Durée des nouveaux baux</div>
          <div className="mt-3">
            <Segmented
              value={String(years)}
              onChange={(v) => setSettings({ leaseYears: Number(v) })}
              options={[
                { value: "3", label: "3 ans" },
                { value: "6", label: "6 ans" },
              ]}
            />
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Proposée pour chaque nouveau bail (modifiable bail par bail). Rappel : un bailleur société doit consentir 6 ans, sauf SCI familiale ; l&apos;application le signale lors de la création du bail.
          </p>
        </Card>

        <button onClick={scanAll} disabled={scan?.running} className="hero-card mt-4 flex w-full items-center gap-3 rounded-[24px] p-4 text-left text-white disabled:opacity-70">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-gold">{scan?.running ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}</span>
          <span className="flex-1">
            <span className="block text-[16px] font-semibold">Tout pré-remplir depuis l&apos;annuaire</span>
            <span className="block text-[12.5px] text-white/60">Adresse du siège, SIREN et gérant de chaque société</span>
          </span>
        </button>

        <SectionTitle>Vos sociétés</SectionTitle>
        <Card className="py-1">
          <div className="divide-y divide-line">
            {companies.map((c, i) => {
              const m = missing(c);
              return (
                <button key={c.id} onClick={() => setEditId(c.id)} className="flex w-full items-center gap-3 py-3 text-left">
                  <Avatar id={c.id} name={c.name} index={i} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{c.name}</span>
                    <span className="block truncate text-[12.5px] text-muted">{c.address || "Adresse à compléter"}</span>
                  </span>
                  {m.length === 0 ? (
                    <CircleCheck size={20} className="shrink-0 text-pos" />
                  ) : (
                    <span className="shrink-0 rounded-full bg-warn/10 px-2 py-0.5 text-[11px] font-bold text-warn">{m.length} à compléter</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </Page>

      <Sheet open={!!editing} onClose={() => setEditId(null)} title={editing?.name ?? ""} footer={<Button full onClick={() => setEditId(null)}>Terminé</Button>}>
        {editing && <CompanyEditor company={editing} />}
      </Sheet>

      <Sheet
        open={!!scan}
        onClose={() => !scan?.running && setScan(null)}
        title="Résultats de l'annuaire"
        footer={
          <Button full disabled={scan?.running || !scan?.found.some((f) => f.pick)} onClick={applyScan}>
            {scan?.running ? "Recherche en cours…" : `Appliquer (${scan?.found.filter((f) => f.pick).length ?? 0})`}
          </Button>
        }
      >
        <div className="space-y-2 pb-2">
          {scan?.found.length === 0 && !scan.running && <p className="text-sm text-muted">Toutes les sociétés sont déjà complètes.</p>}
          {scan?.found.map((f, i) => (
            <button
              key={f.company.id}
              disabled={!f.match}
              onClick={() => setScan((s) => s && { ...s, found: s.found.map((x, j) => (j === i ? { ...x, pick: !x.pick } : x)) })}
              className={cx("flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left", f.pick ? "border-pos/50 bg-pos/[0.05]" : "border-line bg-card")}
            >
              <span className={cx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border", f.pick ? "border-pos bg-pos text-white" : "border-line")}>{f.pick && <Check size={14} />}</span>
              <span className="min-w-0 flex-1 text-[13px]">
                <span className="block text-[15px] font-semibold text-ink">{f.company.name}</span>
                {f.match ? (
                  <>
                    <span className="block text-ink-2">{f.match.name} · SIREN {f.match.siren}</span>
                    {f.match.address && <span className="block text-muted">{f.match.address}</span>}
                    {f.match.directors[0] && <span className="block text-muted">{f.match.directors.slice(0, 2).map((d) => d.name).join(", ")}</span>}
                  </>
                ) : (
                  <span className="block text-warn">{f.error ?? "Pas de correspondance exacte : ouvrez la société pour chercher manuellement."}</span>
                )}
              </span>
            </button>
          ))}
          <p className="text-[11.5px] text-muted">Vérifiez chaque société avant d&apos;appliquer : les champs déjà remplis sont remplacés par les données du registre (e-mail et téléphone conservés).</p>
        </div>
      </Sheet>
    </>
  );
}

function clean(p: Partial<Company>): Partial<Company> {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== "")) as Partial<Company>;
}

function CompanyEditor({ company }: { company: Company }) {
  const { upsert } = useStore();
  const [search, setSearch] = useState(!company.siren);
  const [applied, setApplied] = useState<string | null>(null);
  const set = (patch: Partial<Company>) => upsert("companies", { ...company, ...patch });
  return (
    <div className="space-y-4 pb-2">
      {search ? (
        <RegistrySearch
          company={company}
          onPick={(r) => {
            set(clean(registryPatch(r)));
            setApplied(r.name);
            setSearch(false);
          }}
        />
      ) : (
        <button onClick={() => setSearch(true)} className="text-sm font-semibold text-series-1">
          Rechercher dans l&apos;annuaire des entreprises
        </button>
      )}
      {applied && <div className="rounded-xl bg-pos/10 px-3 py-2 text-[13px] text-pos">Informations reprises de « {applied} ». Vérifiez-les ci-dessous.</div>}
      <LandlordFields company={company} set={set} />
    </div>
  );
}
