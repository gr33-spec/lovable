import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, PackageX, Plus, Printer, TrendingDown } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";
import { DemoCard } from "@/components/admin/demo-card";
import { IncidentsCard } from "@/components/admin/incidents";
import { StatusBadge } from "@/components/admin/ui";
import { formatPrice, formatRelative } from "@/lib/format";
import { SalesOverview } from "@/components/admin/sales-overview";
import { dashboard, salesStats, type StatsPeriod } from "@/lib/server/admin-queries";
import { getSettings } from "@/lib/server/cached";
import { paymentConfig } from "@/lib/server/env";
import { runQuickMaintenance } from "@/lib/server/maintenance";
import { missingLegalInfo } from "@/lib/server/settings";
import { query } from "@/lib/server/db";
import { hasPlaceholders } from "@/lib/rich-text";

export const metadata = { title: "Tableau de bord" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode } = await searchParams;
  const period: StatsPeriod = periode === "7j" || periode === "12m" ? periode : "30j";
  const settings = await getSettings();
  const [d, stats] = await Promise.all([dashboard(settings.lowStockThreshold), salesStats(period)]);
  // Petite maintenance en arrière-plan à chaque visite (e-mails en attente, réservations expirées).
  after(() => runQuickMaintenance());
  const payment = paymentConfig();
  const missing = missingLegalInfo(settings);
  const shipping = await query<{ n: string }>("SELECT count(*) AS n FROM shipping_method WHERE is_active");
  const legalPages = await query<{ body: string }>("SELECT body FROM legal_page");
  const pagesToComplete = legalPages.filter((p) => hasPlaceholders(p.body)).length;
  const products = await query<{ n: string }>("SELECT count(*) AS n FROM product WHERE status = 'published'");
  const catalog = await query<{ total: string; demo: string }>("SELECT count(*) AS total, count(*) FILTER (WHERE is_demo) AS demo FROM product");
  const setup = [
    { done: Number(products[0].n) - Number(catalog[0].demo) > 0, label: "Publier une première création", href: "/admin/produits/nouveau" },
    { done: Number(catalog[0].demo) === 0, label: "Retirer les créations d'exemple", href: "/admin" },
    { done: Number(shipping[0].n) > 0, label: "Activer au moins un mode de livraison", href: "/admin/livraison" },
    { done: missing.length === 0, label: `Compléter les informations légales${missing.length ? ` (${missing.length} manquantes)` : ""}`, href: "/admin/parametres" },
    { done: pagesToComplete === 0, label: `Compléter les pages légales (CGV, confidentialité…)${pagesToComplete ? ` — ${pagesToComplete} à finir` : ""}`, href: "/admin/parametres#pages" },
    { done: Boolean(settings.logo), label: "Ajouter votre logo", href: "/admin/apparence#identite" },
    { done: !hasPlaceholders(settings.aboutText), label: "Écrire votre présentation (page « L'atelier »)", href: "/admin/apparence#identite" },
    { done: payment.ok && payment.provider === "stripe", label: "Connecter le compte Stripe", href: "/admin/parametres#paiement" },
  ];
  const setupLeft = setup.filter((s) => !s.done);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-text-2">Bonjour ✨</p>
          <h1 className="text-3xl sm:text-4xl">Tableau de bord</h1>
        </div>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" /> Ajouter un produit
        </Link>
      </header>

      {Number(catalog[0].total) === 0 && <DemoCard mode="load" />}
      {Number(catalog[0].demo) > 0 && <DemoCard mode="remove" />}

      {setupLeft.length > 0 && (
        <section className="card mb-6 p-5" aria-labelledby="titre-ouverture">
          <h2 id="titre-ouverture" className="font-sans text-base font-semibold">
            Avant d&apos;ouvrir la boutique
          </h2>
          <ul className="mt-3 space-y-2">
            {setup.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex min-h-10 items-center gap-3 rounded-xl text-[15px] no-underline hover:underline">
                  {s.done ? <CheckCircle2 size={20} className="text-success" aria-label="Fait" /> : <span className="h-5 w-5 rounded-full border-2 border-border" aria-label="À faire" />}
                  <span className={s.done ? "text-text-2 line-through" : ""}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <IncidentsCard incidents={d.incidents.map((i) => ({ ...i, created_at: new Date(i.created_at).toISOString() }))} emailsFailed={d.emailsFailed} paymentProblem={payment.ok ? null : payment.reason} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/commandes?statut=a-preparer" className="card p-5 no-underline transition hover:border-primary">
          <p className="flex items-center gap-2 text-sm text-text-2">
            <ClipboardList size={17} aria-hidden="true" /> À préparer
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{d.toPrepareCount}</p>
          <p className="text-sm text-text-2">{d.newCount ? `dont ${d.newCount} nouvelle${d.newCount > 1 ? "s" : ""}` : "commande(s)"}</p>
        </Link>
        <Link href="/admin/produits?stock=epuise" className="card p-5 no-underline transition hover:border-primary">
          <p className="flex items-center gap-2 text-sm text-text-2">
            <PackageX size={17} aria-hidden="true" /> Épuisés
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{d.soldOut.length}</p>
          <p className="text-sm text-text-2">produit(s) en ligne</p>
        </Link>
        <Link href="/admin/produits" className="card p-5 no-underline transition hover:border-primary">
          <p className="flex items-center gap-2 text-sm text-text-2">
            <TrendingDown size={17} aria-hidden="true" /> Stock faible
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{d.lowStock.length}</p>
          <p className="text-sm text-text-2">{settings.lowStockThreshold ? `à ${settings.lowStockThreshold} pièce(s) ou moins` : "alerte désactivée"}</p>
        </Link>
      </div>

      <section className="mt-8" aria-labelledby="titre-preparer">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="titre-preparer" className="font-serif text-2xl">
            Commandes à préparer
          </h2>
          <span className="flex flex-wrap items-center gap-4">
            {d.toPrepareCount > 0 && (
              <Link href="/admin/bons?commande=a-preparer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Printer size={15} aria-hidden="true" /> Imprimer les bons
              </Link>
            )}
            <Link href="/admin/commandes" className="text-sm font-semibold text-primary">
              Toutes les commandes
            </Link>
          </span>
        </div>
        {d.toPrepare.length === 0 ? (
          <div className="card flex items-center gap-3 p-5 text-text-2">
            <CheckCircle2 className="text-success" aria-hidden="true" /> Tout est expédié. Rien à préparer pour le moment.
          </div>
        ) : (
          <ul className="card divide-y divide-border">
            {d.toPrepare.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/commandes/${o.id}`} className="flex items-center gap-3 p-4 no-underline hover:bg-surface-2/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {o.first_name} {o.last_name}
                      {o.needs_attention && <AlertTriangle size={16} className="ml-2 inline text-warning" aria-label="À vérifier" />}
                    </p>
                    <p className="text-sm text-text-2">
                      {o.number} · {o.item_count} article{Number(o.item_count) > 1 ? "s" : ""} · {formatRelative(o.paid_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(o.total_cents)}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  <ArrowRight size={18} className="text-text-2" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {d.toPrepareCount > 5 && (
          <Link href="/admin/commandes?statut=a-preparer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Voir les {d.toPrepareCount} commandes à préparer <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </section>

      <SalesOverview stats={stats} />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="titre-epuises">
          <h2 id="titre-epuises" className="mb-3 font-serif text-2xl">
            Épuisés
          </h2>
          {d.soldOut.length ? (
            <ul className="card divide-y divide-border">
              {d.soldOut.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/produits/${p.id}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 no-underline hover:bg-surface-2/50">
                    <span className="truncate">{p.name}</span>
                    <span className="badge bg-error-bg text-error">0</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-5 text-text-2">Aucun produit épuisé.</p>
          )}
        </section>
        <section aria-labelledby="titre-faible">
          <h2 id="titre-faible" className="mb-3 flex items-center gap-2 font-serif text-2xl">
            <TrendingDown size={20} className="text-warning" aria-hidden="true" /> Stock faible
          </h2>
          {d.lowStock.length ? (
            <ul className="card divide-y divide-border">
              {d.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/produits/${p.id}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 no-underline hover:bg-surface-2/50">
                    <span className="truncate">{p.name}</span>
                    <span className="badge bg-warning-bg text-warning">{p.stock}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-5 text-text-2">{settings.lowStockThreshold ? `Aucun produit à ${settings.lowStockThreshold} pièce(s) ou moins.` : "Alerte désactivée (Paramètres)."}</p>
          )}
        </section>
      </div>
    </>
  );
}
