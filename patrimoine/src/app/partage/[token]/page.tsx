import type { Metadata } from "next";
import { FileText, Lock } from "lucide-react";
import { loadDocument } from "@/lib/server/db";
import { resolveShare } from "@/lib/server/shares";
import { currentMonth, monthLabel, yearOf } from "@/lib/engine/dates";
import { project } from "@/lib/engine/projection";
import { cashflowMonthly, companyTree, ltv, netWorth } from "@/lib/engine/snapshot";
import { latentGains } from "@/lib/engine/history";
import { eur, eurCompact, eurSigned, pct } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Patrimoine — consultation", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Consultation en lecture seule via un lien de partage. Aucune modification
// possible : la page est rendue côté serveur, sans accès aux API privées.
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShare(token, true);
  if (!link) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-soft text-navy">
          <Lock size={24} />
        </div>
        <h1 className="text-xl font-bold text-navy">Lien invalide ou expiré</h1>
        <p className="mt-2 text-sm text-muted">Demandez un nouveau lien au propriétaire du patrimoine.</p>
      </main>
    );
  }

  const { data } = await loadDocument();
  const nowMonth = currentMonth();
  const year = yearOf(nowMonth);
  const p = project(data, nowMonth);
  const snap = p.snapshot;
  const t = snap.total;
  const nw = netWorth(t);
  const ratio = ltv(t);
  const gains = latentGains(data, year);
  const expires = new Date(link.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const horizons = [5, 10, 15, 20].map((h) => p.years.find((r) => r.year === year + h)).filter((r) => !!r);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="safe-top px-5 pb-2 pt-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gold">Consultation en lecture seule</div>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-navy">{data.settings.groupName || "Patrimoine"}</h1>
          <div className="text-sm text-muted">
            Situation au {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · lien valable jusqu&apos;au {expires}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <div className="hero-card mt-3 rounded-[30px] p-6 text-white">
          <div className="text-[13px] font-medium text-white/65">Patrimoine net</div>
          <div className="tabular mt-1 text-[38px] font-extrabold leading-tight tracking-[-0.03em]">
            {nw !== undefined ? eur(nw) : <span className="text-2xl text-white/75">Données insuffisantes</span>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroTile label="Valeur des biens" value={t.unvalued ? "—" : eurCompact(t.value)} />
            <HeroTile label="Capital restant dû" value={eurCompact(t.debt)} />
            <HeroTile label="LTV" value={ratio !== undefined ? pct(ratio) : "—"} />
            <HeroTile label="Plus-value latente" value={gains.known ? eurCompact(gains.gain) : "—"} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Loyers / mois" value={eurCompact(t.rentMonthly)} />
          <Tile label="Mensualités / mois" value={eurCompact(t.paymentsMonthly)} />
          <Tile label="Cash-flow / mois" value={eurSigned(cashflowMonthly(t))} />
          <Tile label="Immeubles · lots" value={`${t.buildings} · ${t.units}`} />
        </div>

        <a
          href={`/partage/${token}/dossier`}
          className="mt-4 flex items-center gap-3 rounded-[22px] bg-navy px-5 py-4 text-white"
        >
          <FileText size={22} className="text-gold" />
          <span className="flex-1">
            <span className="block font-semibold">Dossier patrimonial complet (PDF)</span>
            <span className="block text-sm text-white/60">Structure, biens, crédits, indicateurs, projection</span>
          </span>
        </a>

        <Section title="Sociétés">
          <Table
            head={["Société", "Valeur", "Dette", "Loyers/mois", "Cash-flow/mois"]}
            rows={companyTree(data.companies).map(({ company, depth }) => {
              const f = snap.byCompany.get(company.id);
              return [
                `${"— ".repeat(depth)}${company.name}`,
                f && !f.unvalued ? eurCompact(f.value) : "—",
                eurCompact(f?.debt ?? 0),
                eurCompact(f?.rentMonthly ?? 0),
                f ? eurSigned(cashflowMonthly(f)) : "—",
              ];
            })}
          />
        </Section>

        <Section title="Immeubles">
          <Table
            head={["Immeuble", "Société", "Valeur", "Loyers/mois", "Dette"]}
            rows={data.buildings.map((b) => {
              const f = snap.byBuilding.get(b.id);
              return [b.name, data.companies.find((c) => c.id === b.companyId)?.name ?? "—", f && !f.unvalued ? eurCompact(f.value) : "—", eurCompact(f?.rentMonthly ?? 0), eurCompact(f?.debt ?? 0)];
            })}
          />
        </Section>

        <Section title="Crédits">
          <Table
            head={["Crédit", "Banque", "Capital restant dû", "Mensualité", "Fin"]}
            rows={data.loans.map((l) => {
              const r = snap.resolvedLoans.get(l.id);
              const now = snap.byLoan.get(l.id);
              return [
                l.name || "Crédit",
                l.bank ?? "—",
                now?.balance === undefined ? "Données insuffisantes" : eur(now.balance),
                r?.payment !== undefined ? eur(r.payment) : "—",
                r?.finished ? "Terminé" : r?.endMonth !== undefined ? monthLabel(r.endMonth) : "—",
              ];
            })}
          />
        </Section>

        {horizons.length > 0 && (
          <Section title="Projection">
            <Table
              head={["Année", "Dette restante", "Patrimoine net", "Cash-flow annuel"]}
              rows={horizons.map((r) => [String(r.year), eurCompact(r.debt), t.unvalued ? "—" : eurCompact(r.net), eurSigned(r.cashflow)])}
            />
            <p className="mt-2 text-xs text-muted">
              Hypothèses : valeurs {pct(data.settings.valueGrowthPct ?? 0)}/an, loyers {pct(data.settings.rentGrowthPct ?? 0)}/an.
            </p>
          </Section>
        )}
        <p className="mt-8 text-center text-xs text-muted">Document confidentiel — consultation uniquement, aucune modification possible.</p>
      </main>
    </div>
  );
}

function HeroTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
      <div className="text-[12px] text-white/60">{label}</div>
      <div className="tabular text-[18px] font-bold">{value}</div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-card rounded-[20px] px-4 py-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="tabular text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-[17px] font-bold text-navy">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <div className="soft-card rounded-[20px] px-4 py-4 text-sm text-muted">Aucun élément.</div>;
  return (
    <div className="soft-card overflow-x-auto rounded-[20px]">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2.5 font-medium ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-2.5 ${j > 0 ? "tabular text-right" : "font-medium text-ink"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
