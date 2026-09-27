"use client";

import { useState } from "react";
import { Building, Loader2, Search } from "lucide-react";
import type { Company } from "@/lib/types";
import { Grid2, Segmented, Stack, TextField, cx } from "./ui";

// Pré-remplissage des sociétés depuis l'annuaire public des entreprises
// (adresse du siège, SIREN, dirigeant).

export interface RegistryCompany {
  siren: string;
  name: string;
  legalForm?: string;
  address?: string;
  creationDate?: string;
  active: boolean;
  directors: { name: string; role?: string; company?: boolean }[];
}

export async function searchRegistry(q: string): Promise<RegistryCompany[]> {
  const res = await fetch(`/api/entreprises?q=${encodeURIComponent(q)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Annuaire indisponible");
  return json.results ?? [];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(SCI|SC|SARL|SAS|SASU|EURL|SOCIETE CIVILE IMMOBILIERE|SOCIETE CIVILE)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");

/** Nom de recherche : la forme sociale aide à trouver la bonne société. */
export function searchName(c: Company): string {
  const form = c.kind === "SCI" || c.kind === "SARL" || c.kind === "SAS" ? c.kind : c.kind === "SC" || c.kind === "holding" ? "SC" : "";
  return form && !c.name.toUpperCase().startsWith(form) ? `${form} ${c.name}` : c.name;
}

/** Meilleure correspondance : même nom (hors forme sociale), société active. */
export function bestMatch(c: Company, results: RegistryCompany[]): RegistryCompany | undefined {
  const target = norm(c.name);
  const same = results.filter((r) => norm(r.name) === target);
  return same.find((r) => r.active) ?? same[0];
}

/** Informations reprises de l'annuaire (e-mail et téléphone conservés). */
export function registryPatch(r: RegistryCompany): Partial<Company> {
  const person = r.directors.find((d) => !d.company && /g[ée]rant/i.test(d.role ?? "")) ?? r.directors.find((d) => !d.company);
  const director = person ?? r.directors[0];
  return {
    siren: r.siren.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    address: r.address ? titleAddress(r.address) : undefined,
    representative: director?.name || undefined,
    representativeRole: director?.role ? director.role.toLowerCase() : undefined,
  };
}

function titleAddress(a: string): string {
  // « 6 IMPASSE DU OUIPOURE 22620 PLOUBAZLANEC » → « 6 impasse du Ouipouré… » : casse lisible, code postal intact.
  return a
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (m, sp, l) => `${sp}${l.toUpperCase()}`)
    .replace(/\b(Du|De|La|Le|Les|Des|Et|Sur)\b/g, (w) => w.toLowerCase())
    .replace(/(\d{5}) (\p{L}+)/u, (m, cp, city) => `${cp} ${city.toUpperCase()}`);
}

export function RegistrySearch({ company, onPick }: { company: Company; onPick: (r: RegistryCompany) => void }) {
  const [q, setQ] = useState(searchName(company));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RegistryCompany[] | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResults(await searchRegistry(q));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  const best = results ? bestMatch(company, results) : undefined;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 text-[16px] outline-none focus:border-series-1"
          placeholder="Nom ou SIREN"
        />
        <button onClick={run} disabled={busy || q.trim().length < 3} className="flex items-center gap-1.5 rounded-2xl bg-navy px-4 font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
        </button>
      </div>
      {error && <div className="rounded-xl bg-neg/10 px-3 py-2 text-[13px] text-neg">{error}</div>}
      {results && results.length === 0 && <div className="text-[13px] text-muted">Aucune société trouvée. Essayez avec le SIREN.</div>}
      {results?.map((r) => (
        <button
          key={r.siren}
          onClick={() => onPick(r)}
          className={cx("w-full rounded-2xl border px-4 py-3 text-left", r === best ? "border-pos/50 bg-pos/[0.06]" : "border-line bg-card")}
        >
          <div className="flex items-center gap-2">
            <Building size={15} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{r.name}</span>
            {r === best && <span className="rounded-full bg-pos/10 px-2 py-0.5 text-[10.5px] font-bold text-pos">Correspondance</span>}
            {!r.active && <span className="rounded-full bg-neg/10 px-2 py-0.5 text-[10.5px] font-bold text-neg">Fermée</span>}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            SIREN {r.siren}
            {r.legalForm ? ` · ${r.legalForm}` : ""}
          </div>
          {r.address && <div className="text-[12.5px] text-ink-2">{r.address}</div>}
          {r.directors.length > 0 && <div className="text-[12.5px] text-ink-2">{r.directors.slice(0, 3).map((d) => `${d.name}${d.role ? ` (${d.role.toLowerCase()})` : ""}`).join(", ")}</div>}
        </button>
      ))}
      <p className="text-[11.5px] text-muted">Source : annuaire public des entreprises (recherche-entreprises.api.gouv.fr).</p>
    </div>
  );
}

/** Coordonnées de la société utilisées dans les baux, états des lieux et quittances. */
export function LandlordFields({ company, set }: { company: Company; set: (patch: Partial<Company>) => void }) {
  return (
    <Stack>
      <TextField label="Adresse du siège" value={company.address} onChange={(v) => set({ address: v })} />
      <Grid2>
        <TextField label="SIREN" value={company.siren} onChange={(v) => set({ siren: v })} />
        <TextField label="Qualité" value={company.representativeRole} placeholder="gérant" onChange={(v) => set({ representativeRole: v })} />
      </Grid2>
      <TextField label="Représentée par" value={company.representative} placeholder="Prénom NOM du gérant" onChange={(v) => set({ representative: v })} />
      <Grid2>
        <TextField label="E-mail" type="email" value={company.email} onChange={(v) => set({ email: v })} />
        <TextField label="Portable" type="tel" value={company.phone} onChange={(v) => set({ phone: v })} />
      </Grid2>
      {company.kind === "SCI" && (
        <div>
          <div className="mb-1 px-1 text-[13px] font-medium text-ink-2">SCI familiale ?</div>
          <Segmented
            value={company.familySci === undefined ? "?" : company.familySci ? "oui" : "non"}
            onChange={(v) => set({ familySci: v === "?" ? undefined : v === "oui" })}
            options={[
              { value: "oui", label: "Oui" },
              { value: "non", label: "Non" },
              { value: "?", label: "Je ne sais pas" },
            ]}
          />
          <p className="mt-1 px-1 text-[12px] text-muted">Tous les associés sont parents ou alliés jusqu&apos;au 4e degré (une société associée, comme une holding, l&apos;exclut). Permet légalement un bail de 3 ans.</p>
        </div>
      )}
    </Stack>
  );
}
