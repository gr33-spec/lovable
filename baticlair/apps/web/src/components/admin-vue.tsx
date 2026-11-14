"use client";

import Link from "next/link";

/** Les pièces communes de l'espace admin (Greg, 14 novembre 2026) : libellés, dates, lignes de fiche. */
export const METIERS_ADMIN: Record<string, string> = {
  roofing: "Couverture",
  zinc: "Zinguerie",
  waterproofing: "Étanchéité",
  carpentry: "Charpente",
  painting: "Peinture",
  masonry: "Maçonnerie",
  electricity: "Électricité",
  plumbing: "Plomberie",
  drywall: "Plâtrerie",
  tiling: "Carrelage",
  joinery: "Menuiserie",
  heating: "Chauffage",
  facade: "Façade",
};
export const metier = (id: string) => METIERS_ADMIN[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
export const FORMULES_ADMIN: Record<string, string> = { decouverte: "Découverte", essentiel: "Essentiel", pro: "Pro", gratuit: "Gratuit" };
export const formule = (f: string) => FORMULES_ADMIN[f] ?? f;
export const famille = (f: string) => (f === "generaliste" ? "Généraliste" : f.charAt(0).toUpperCase() + f.slice(1));
export const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "jamais");
export const jourEtHeure = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "jamais");

export const PUCE = (actif: boolean) => `min-h-11 rounded-full border px-4 text-[15px] font-semibold ${actif ? "border-ink bg-ink text-ground" : "border-line"}`;

/** Une ligne « libellé : valeur » d'une fiche. */
export function Info({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-line py-2 last:border-b-0">
      <dt className="text-[14px] text-muted">{titre}</dt>
      <dd className="text-right text-[16px] font-semibold break-words">{children}</dd>
    </div>
  );
}

/** Les raccourcis du haut de chaque écran admin : tout à trois clics au plus. */
export function RaccourcisAdmin({ ici }: { ici: string }) {
  const liens = [
    { href: "/admin", texte: "Accueil" },
    { href: "/admin/artisans", texte: "Artisans" },
    { href: "/admin/negoces", texte: "Négoces" },
    { href: "/admin/question", texte: "Pose ta question" },
    { href: "/admin/reglages", texte: "Réglages" },
  ];
  return (
    <nav aria-label="Espace admin" className="flex flex-wrap gap-2">
      {liens.map((l) => (
        <Link key={l.href} href={l.href} aria-current={ici === l.href ? "page" : undefined} className={`flex items-center ${PUCE(ici === l.href)}`}>
          {l.texte}
        </Link>
      ))}
    </nav>
  );
}
