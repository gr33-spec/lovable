"use client";

import { SIGNATURE_APP } from "@/lib/nom";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AideBouton } from "@/components/aide";
import { BandeauAbonnement } from "@/components/abonnement";
import { initials } from "@/components/menu-artisan";
import { Badge, PageTitle } from "@/components/ui";
import { GROUPES_PROFIL } from "@/lib/rubriques-profil";
import { useMissionsActif, useRubriquesMasquees } from "@/lib/missions";
import { useSession } from "@/lib/session";

/**
 * « PROFIL ET PARAMÈTRES » (Greg, 1er novembre 2026) : un sommaire, plus aucun formulaire ici. Une carte compacte (nom,
 * e-mail, confirmation), puis quatre groupes de lignes ; chaque ligne ouvre sa rubrique (`/compte/<rubrique>`), où vivent
 * les réglages d'avant, tous gardés. « Profil » reste allumé dans le menu (il s'allume sur tout `/compte`).
 */
export default function ComptePage() {
  const { me } = useSession();
  const missions = useMissionsActif() === true;
  const masquees = useRubriquesMasquees();
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle>Profil et paramètres</PageTitle>
        <AideBouton sujet="compte" />
      </div>
      <Link
        href="/compte/informations"
        aria-label={`${me.user.name}, ${me.user.email}, ${me.user.emailVerified ? "e-mail confirmé" : "e-mail à confirmer"}`}
        className="pressable flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card lg:max-w-xl"
      >
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-[16px] font-extrabold text-on-accent">
          {initials(me.user.name || me.user.email)}
        </span>
        <span className="flex min-w-0 grow flex-col gap-1">
          <span className="text-[16px] font-bold break-words">{me.user.name}</span>
          <span className="text-[14px] break-all text-muted">{me.user.email}</span>
          <span>{me.user.emailVerified ? <Badge tone="ok">✓ E-mail confirmé</Badge> : <Badge tone="warn">E-mail à confirmer</Badge>}</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
      </Link>
      <BandeauAbonnement />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {GROUPES_PROFIL.map((g) => (
          <section key={g.titre} aria-label={g.titre} className="flex min-w-0 flex-col gap-2">
            <h2 className="px-1 text-[12px] font-extrabold tracking-[0.06em] text-ink/80 uppercase">{g.titre}</h2>
            <ul className="flex flex-col gap-2.5">
              {g.lignes.filter((l) => (!l.missions || missions) && !(l.masquable && masquees[l.masquable])).map((l) => {
                const Icone = l.icone;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/compte/${l.id}`}
                      className={`pressable flex min-h-16 items-center gap-3 rounded-[18px] px-4 py-3 text-ink shadow-card ${l.enAvant ? "bg-accent text-on-accent" : "bg-surface"}`}
                    >
                      <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${l.enAvant ? "bg-black/10 text-on-accent" : "bg-[#efece6] text-[#130901]"}`}>
                        <Icone size={20} />
                      </span>
                      <span className="flex min-w-0 grow flex-col">
                        <span className="text-[16px] leading-tight font-semibold">{l.titre}</span>
                        <span className={`text-[13px] leading-snug ${l.enAvant ? "text-on-accent/85" : "text-[#5c5648]"}`}>{l.sousTitre}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" className="shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {/* Lot 8 (prompt maître point 17) : la signature officielle. */}
      <p className="pt-2 text-center text-[13px] font-semibold text-muted">{SIGNATURE_APP}</p>
    </>
  );
}
