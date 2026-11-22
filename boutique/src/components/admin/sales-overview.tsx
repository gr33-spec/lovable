import { ArrowDownRight, ArrowUpRight, Heart, ShoppingBag, Sparkles, Truck, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { SalesStats, StatsPeriod } from "@/lib/server/admin-queries";
import { Img } from "../ui/img";

// Aperçu des ventes, sur le modèle des tableaux de bord des boutiques en ligne
// (Shopify, Etsy…) : période au choix, chiffres clés comparés à la période
// précédente, courbe des ventes, ce qui se vend le mieux.

const PERIODS: { id: StatsPeriod; label: string; previous: string }[] = [
  { id: "7j", label: "7 jours", previous: "aux 7 jours précédents" },
  { id: "30j", label: "30 jours", previous: "aux 30 jours précédents" },
  { id: "12m", label: "12 mois", previous: "aux 12 mois précédents" },
];

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (!previous && !current) return <span className="text-xs text-text-2">—</span>;
  if (!previous) return <span className="text-xs font-medium text-success">Nouveau sur la période</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-success" : "text-error"}`} title={`Par rapport ${label}`}>
      {up ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
      {up ? "+" : ""}
      {pct} %<span className="sr-only"> par rapport {label}</span>
    </span>
  );
}

function Kpi({ icon: Icon, label, value, current, previous, previousLabel }: { icon: typeof Wallet; label: string; value: string; current: number; previous: number; previousLabel: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[13px] text-text-2">
        <Icon size={15} aria-hidden="true" /> {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]">{value}</p>
      <Delta current={current} previous={previous} label={previousLabel} />
    </div>
  );
}

/** Graphique en barres (SVG, sans bibliothèque) : chiffre d'affaires par jour ou par mois. */
function SalesChart({ series, months }: { series: SalesStats["series"]; months: boolean }) {
  const max = Math.max(...series.map((s) => s.revenueCents), 1);
  const n = series.length;
  const gap = n > 14 ? 2 : 6;
  const width = 600;
  const height = 170;
  const bar = (width - gap * (n - 1)) / n;
  const ticks = n <= 12 ? series.map((_, i) => i) : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  // Sur téléphone, le graphique est réduit : moins de dates, écrites plus gros.
  const mobileTicks = n <= 7 ? series.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  const total = series.reduce((a, s) => a + s.revenueCents, 0);
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height + 30}`} className="h-auto w-full" role="img" aria-label={`Chiffre d'affaires par ${months ? "mois" : "jour"} : ${formatPrice(total)} au total sur la période.`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={width} y1={height - height * f} y2={height - height * f} stroke="var(--c-border)" strokeWidth="1" />
        ))}
        {series.map((s, i) => {
          const h = s.revenueCents ? Math.max(3, (s.revenueCents / max) * (height - 8)) : 0;
          return (
            <g key={s.key}>
              <rect x={i * (bar + gap)} y={height - h} width={bar} height={h} rx={Math.min(6, bar / 2)} fill="var(--c-primary)" opacity={s.revenueCents ? 0.9 : 0}>
                <title>{`${s.label} : ${formatPrice(s.revenueCents)} (${s.orders} commande${s.orders > 1 ? "s" : ""})`}</title>
              </rect>
              {!s.revenueCents && <rect x={i * (bar + gap)} y={height - 2} width={bar} height={2} rx={1} fill="var(--c-border)" />}
            </g>
          );
        })}
        {ticks.map((i) => (
          <text key={`d${i}`} x={i * (bar + gap) + bar / 2} y={height + 18} textAnchor="middle" fontSize="12" fill="var(--c-text-muted)" className="max-sm:hidden">
            {series[i].label.replace(".", "")}
          </text>
        ))}
        {mobileTicks.map((i) => (
          <text
            key={`m${i}`}
            x={i === 0 ? 0 : i === n - 1 ? width : i * (bar + gap) + bar / 2}
            y={height + 24}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fontSize={n <= 7 ? "20" : "24"}
            fill="var(--c-text-muted)"
            className="sm:hidden"
          >
            {series[i].label.replace(".", "")}
          </text>
        ))}
      </svg>
      {/* Données du graphique pour les lecteurs d'écran */}
      <table className="sr-only">
        <caption>Ventes par {months ? "mois" : "jour"}</caption>
        <tbody>
          {series.map((s) => (
            <tr key={s.key}>
              <th scope="row">{s.label}</th>
              <td>{formatPrice(s.revenueCents)}</td>
              <td>{s.orders} commande(s)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{r.display}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SalesOverview({ stats }: { stats: SalesStats }) {
  const period = PERIODS.find((p) => p.id === stats.period) ?? PERIODS[1];
  const { current: c, previous: p } = stats;
  const hasSales = c.orders > 0;
  const totalCustomers = stats.returning.newCustomers + stats.returning.returningCustomers;
  const totalShipping = stats.shipping.reduce((a, s) => a + s.orders, 0);
  return (
    <section className="mt-10" aria-labelledby="titre-ventes">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titre-ventes" className="font-serif text-3xl">
            Ventes
          </h2>
          <p className="text-sm text-text-2">Montants nets des remboursements, commandes payées.</p>
        </div>
        <nav aria-label="Période" className="flex rounded-full border border-border bg-surface p-1">
          {PERIODS.map((x) => (
            <Link
              key={x.id}
              href={`/admin?periode=${x.id}#titre-ventes`}
              scroll={false}
              aria-current={x.id === stats.period ? "page" : undefined}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium no-underline transition aria-[current=page]:bg-primary aria-[current=page]:text-on-primary"
            >
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Chiffre d'affaires" value={formatPrice(c.revenueCents)} current={c.revenueCents} previous={p.revenueCents} previousLabel={period.previous} />
        <Kpi icon={ShoppingBag} label="Commandes" value={String(c.orders)} current={c.orders} previous={p.orders} previousLabel={period.previous} />
        <Kpi icon={Sparkles} label="Panier moyen" value={formatPrice(c.averageCents)} current={c.averageCents} previous={p.averageCents} previousLabel={period.previous} />
        <Kpi icon={Users} label="Clientes" value={String(c.customers)} current={c.customers} previous={p.customers} previousLabel={period.previous} />
      </div>

      <div className="card mt-3 p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base">Chiffre d&apos;affaires par {stats.period === "12m" ? "mois" : "jour"}</h3>
          <p className="text-sm text-text-2">
            {c.items} bijou{c.items > 1 ? "x" : ""} vendu{c.items > 1 ? "s" : ""}
          </p>
        </div>
        <SalesChart series={stats.series} months={stats.period === "12m"} />
      </div>

      {!hasSales ? (
        <p className="card mt-3 p-5 text-text-2">Pas encore de vente sur cette période. Les meilleures créations et les catégories apparaîtront ici dès les premières commandes.</p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="card p-4 sm:p-6">
            <h3 className="mb-4 text-base">Meilleures ventes</h3>
            <ol className="space-y-3">
              {stats.topProducts.map((t, i) => (
                <li key={t.productId ?? t.name} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-semibold text-text-2 tabular-nums">{i + 1}</span>
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <Img image={t.image} alt="" sizes="48px" className="h-full w-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    {t.productId ? (
                      <Link href={`/admin/produits/${t.productId}`} className="block truncate text-[15px] font-medium no-underline hover:underline">
                        {t.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-[15px] font-medium">{t.name}</span>
                    )}
                    <span className="text-sm text-text-2">
                      {t.quantity} vendu{t.quantity > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(t.revenueCents)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-3">
            <div className="card p-4 sm:p-6">
              <h3 className="mb-4 text-base">Ventes par catégorie</h3>
              <Bars rows={stats.categories.map((x) => ({ label: x.name, value: x.revenueCents, display: formatPrice(x.revenueCents) }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-base">
                  <Heart size={16} className="text-primary" aria-hidden="true" /> Clientes fidèles
                </h3>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.returning.returningCustomers}
                  <span className="text-base font-normal text-text-2"> / {totalCustomers}</span>
                </p>
                <p className="text-sm text-text-2">
                  déjà clientes avant cette période · {stats.returning.newCustomers} nouvelle{stats.returning.newCustomers > 1 ? "s" : ""}
                </p>
              </div>
              <div className="card p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-base">
                  <Truck size={16} className="text-primary" aria-hidden="true" /> Livraison
                </h3>
                <ul className="space-y-1 text-sm">
                  {stats.shipping.map((s) => (
                    <li key={s.name} className="flex justify-between gap-2">
                      <span className="truncate">{s.name}</span>
                      <span className="font-semibold tabular-nums">{totalShipping ? Math.round((s.orders / totalShipping) * 100) : 0} %</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
