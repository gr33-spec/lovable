import { Download } from "lucide-react";
import { AccountSecurity } from "@/components/admin/account-security";
import { LegalPagesEditor } from "@/components/admin/legal-pages-editor";
import { SettingsForm } from "@/components/admin/settings-form";
import { StripeStatus } from "@/components/admin/stripe-status";
import { PageTitle } from "@/components/admin/ui";
import { formatDateTime, formatRelative } from "@/lib/format";
import { auditTrail } from "@/lib/server/admin-queries";
import { listSessions, requireAdminPage } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { deployEnv, paymentConfig } from "@/lib/server/env";
import { loadSettings } from "@/lib/server/settings";

export const metadata = { title: "Paramètres" };

const ACTIONS: Record<string, string> = {
  login: "Connexion",
  login_failed: "Connexion refusée",
  login_totp_failed: "Code de sécurité refusé",
  product_created: "Produit créé",
  product_updated: "Produit modifié",
  product_deleted: "Produit supprimé",
  products_bulk: "Modification groupée",
  order_status: "Statut de commande",
  order_cancelled: "Commande annulée",
  order_refunded: "Remboursement",
  order_anonymized: "Données effacées",
  settings_updated: "Paramètres modifiés",
  theme_changed: "Thème changé",
  brand_updated: "Identité modifiée",
  legal_page_updated: "Page légale modifiée",
  password_changed: "Mot de passe changé",
  password_reset: "Mot de passe réinitialisé",
  totp_enabled: "Double authentification activée",
  totp_disabled: "Double authentification désactivée",
  sessions_revoked: "Appareils déconnectés",
  export: "Export",
  shipping_saved: "Livraison modifiée",
};

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const [s, legalPages, sessions, trail] = await Promise.all([
    loadSettings(),
    query<{ slug: string; title: string; body: string }>("SELECT slug, title, body FROM legal_page ORDER BY slug"),
    listSessions(admin.id),
    auditTrail(60),
  ]);
  const payment = paymentConfig();
  return (
    <>
      <PageTitle title="Paramètres" />
      <nav aria-label="Sections" className="-mx-4 mb-6 overflow-x-auto px-4 no-scrollbar">
        <ul className="flex gap-2">
          {[
            ["#boutique", "Boutique"],
            ["#legal", "Informations légales"],
            ["#pages", "Pages légales"],
            ["#paiement", "Paiement"],
            ["#securite", "Sécurité"],
            ["#donnees", "Données"],
            ["#journal", "Journal"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="chip">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <SettingsForm
        initial={{
          contactEmail: s.contactEmail,
          notificationEmail: s.notificationEmail,
          lowStockThreshold: s.lowStockThreshold,
          ordersOpen: s.ordersOpen,
          closedMessage: s.closedMessage,
          allowPromotionCodes: s.allowPromotionCodes,
          reservationAutoExpire: s.reservationAutoExpire,
          vatRegime: s.vatRegime,
          vatRateBp: s.vatRateBp,
          addressRetentionMonths: s.addressRetentionMonths,
          legal: s.legal,
        }}
      />

      <LegalPagesEditor pages={legalPages} />

      <section id="paiement" className="mt-12 scroll-mt-6" aria-labelledby="titre-paiement">
        <h2 id="titre-paiement" className="mb-3 font-serif text-2xl">
          Paiement (Stripe)
        </h2>
        <StripeStatus configured={payment.ok ? { provider: payment.provider, mode: payment.mode } : null} problem={payment.ok ? null : payment.reason} environment={deployEnv()} />
      </section>

      <AccountSecurity
        email={admin.email}
        totpEnabled={admin.totpEnabled}
        sessions={sessions.map((x) => ({ id: x.id, userAgent: x.user_agent, lastSeen: formatRelative(x.last_seen_at), current: x.id === admin.sessionId }))}
      />

      <section id="donnees" className="mt-12 scroll-mt-6" aria-labelledby="titre-donnees">
        <h2 id="titre-donnees" className="mb-1 font-serif text-2xl">
          Sauvegardes et exports
        </h2>
        <p className="mb-4 text-sm text-text-2">
          Une sauvegarde complète est faite automatiquement chaque nuit (30 jours conservés). Vous pouvez aussi en télécharger une copie à garder chez vous.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["sauvegarde", "Sauvegarde complète (à conserver)"],
            ["commandes", "Ventes — livre des recettes (tableur)"],
            ["produits", "Produits et stocks (tableur)"],
            ["stock", "Mouvements de stock (tableur)"],
          ].map(([k, label]) => (
            <a key={k} href={`/api/admin/export/${k}`} className="card flex min-h-14 items-center gap-3 px-4 no-underline hover:border-primary">
              <Download size={18} className="text-primary" aria-hidden="true" /> {label}
            </a>
          ))}
        </div>
        <form action="/api/admin/export/cliente" method="get" className="card mt-4 space-y-3 p-4">
          <p className="font-semibold">Demande d&apos;une cliente (RGPD)</p>
          <p className="text-sm text-text-2">Exporte toutes les données liées à une adresse e-mail. Pour effacer ses données, ouvrez chacune de ses commandes.</p>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">E-mail de la cliente</span>
              <input name="email" type="email" required className="input" placeholder="cliente@exemple.fr" />
            </label>
            <button type="submit" className="btn btn-outline">
              Exporter
            </button>
          </div>
        </form>
      </section>

      <section id="journal" className="mt-12 scroll-mt-6" aria-labelledby="titre-journal">
        <h2 id="titre-journal" className="mb-3 font-serif text-2xl">
          Journal des actions
        </h2>
        <ul className="card max-h-96 divide-y divide-border overflow-y-auto text-sm">
          {trail.map((t, i) => (
            <li key={i} className="flex justify-between gap-3 px-4 py-2.5">
              <span>
                {ACTIONS[t.action] ?? t.action}
                {t.email ? <span className="text-text-2"> · {t.email}</span> : null}
              </span>
              <span className="shrink-0 text-text-2">{formatDateTime(t.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
