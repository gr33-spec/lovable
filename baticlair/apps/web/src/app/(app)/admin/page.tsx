"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { RaccourcisAdmin } from "@/components/admin-vue";
import { BackButton, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Carte {
  cle: string;
  valeur: number;
  avant: number;
  reference: string;
  lien: string;
}
interface Probleme {
  type: string;
  nombre: number;
  lien: string;
}
const TITRES: Record<string, string> = { inscrits: "Inscrits", payants: "Abonnés payants", decouverte: "En Découverte", revenus: "Revenus du mois", inscriptions_semaine: "Inscriptions de la semaine", negoces: "Négoces inscrits" };
const PROBLEMES: Record<string, (n: number) => string> = {
  signalement: (n) => `${n} bug${n > 1 ? "s" : ""} signalé${n > 1 ? "s" : ""} à regarder`,
  paiement_refuse: (n) => `${n} paiement${n > 1 ? "s" : ""} refusé${n > 1 ? "s" : ""}`,
  erreur_serveur: (n) => `${n} erreur${n > 1 ? "s" : ""} serveur depuis 24 heures`,
  negoce_a_verifier: (n) => `${n} négoce${n > 1 ? "s" : ""} en attente de vérification`,
};
const nombre = (cle: string, n: number) => (cle === "revenus" ? `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €` : n.toLocaleString("fr-FR"));

/**
 * L'ACCUEIL DE L'ESPACE ADMIN (Greg, 14 novembre 2026 : « un écran d'accueil, tout accessible en 3 clics maximum ») : six
 * grosses cartes avec leur tendance, chacune mène à sa liste ; un bandeau rouge en haut UNIQUEMENT s'il y a un problème.
 */
export default function AdminAccueilPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/" />
      <PageTitle>Espace admin</PageTitle>
      <PorteAdmin>
        <Accueil />
      </PorteAdmin>
    </div>
  );
}

function Tendance({ c }: { c: Carte }) {
  const ecart = c.valeur - c.avant;
  const pct = c.avant > 0 ? Math.round((ecart / c.avant) * 100) : null;
  const Icone = ecart > 0 ? ArrowUpRight : ecart < 0 ? ArrowDownRight : ArrowRight;
  const signe = ecart > 0 ? "+" : ecart < 0 ? "−" : "";
  const texte = ecart === 0 ? "Pareil" : `${signe}${nombre(c.cle, Math.abs(ecart))}${pct !== null ? ` (${signe}${Math.abs(pct)} %)` : ""}`;
  return (
    <span className={`flex items-center gap-1 text-[14px] font-semibold ${ecart > 0 ? "text-ok" : ecart < 0 ? "text-danger" : "text-muted"}`}>
      <Icone size={16} aria-hidden="true" />
      {texte}
      <span className="font-normal text-muted">par rapport à {c.reference}</span>
    </span>
  );
}

function Accueil() {
  const charger = useCallback((signal: AbortSignal) => api<{ cartes: Carte[]; problemes: Probleme[] }>("/v1/admin/vue/accueil", { signal }), []);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <>
      {data.problemes.length > 0 ? (
        <section role="alert" aria-label="Problèmes à regarder" className="flex flex-col gap-1 rounded-[20px] bg-danger-bg p-4 text-danger">
          <p className="flex items-center gap-2 text-[16px] font-extrabold">
            <TriangleAlert size={20} aria-hidden="true" /> À regarder
          </p>
          <ul className="flex flex-col">
            {data.problemes.map((p) => (
              <li key={p.type}>
                <Link href={p.lien} className="flex min-h-11 items-center text-[16px] font-semibold underline underline-offset-4">
                  {PROBLEMES[p.type]?.(p.nombre) ?? `${p.nombre} à regarder`}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <RaccourcisAdmin ici="/admin" />
      <ul aria-label="Chiffres clés" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.cartes.map((c) => (
          <li key={c.cle}>
            <Link href={c.lien} aria-label={`${TITRES[c.cle] ?? c.cle} : ${nombre(c.cle, c.valeur)}. Voir la liste`} className="pressable flex h-full flex-col gap-1 rounded-[20px] bg-surface p-5 shadow-card">
              <span className="text-[15px] font-semibold text-muted">{TITRES[c.cle] ?? c.cle}</span>
              <span className="font-display text-[40px] leading-none font-extrabold">{nombre(c.cle, c.valeur)}</span>
              <Tendance c={c} />
            </Link>
          </li>
        ))}
      </ul>
      <Card className="flex flex-col gap-1 p-4">
        <p className="text-[15px] font-semibold text-muted">Le reste de l&apos;espace admin</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {[
            { href: "/admin/pilotage", texte: "Tableau de bord détaillé" },
            { href: "/admin/signalements", texte: "Signalements" },
            { href: "/admin/supervision", texte: "Supervision" },
            { href: "/admin/promos", texte: "Codes promo" },
            { href: "/admin/catalogue", texte: "Catalogue" },
            { href: "/admin/emails", texte: "E-mails mis de côté" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-11 items-center text-[16px] font-semibold underline underline-offset-4">
              {l.texte}
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
