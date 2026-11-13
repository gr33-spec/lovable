"use client";

import Link from "next/link";
import { BoutonTheme } from "@/components/bouton-theme";
import { SignalerProbleme, type SignalementHandle } from "@/components/signaler-probleme";
import { useRouter } from "next/navigation";
import { ChevronRight, CreditCard, LayoutGrid, LifeBuoy, Sparkles, UserRound, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Cloche } from "./achat-groupe";
import { PastilleEssai } from "./abonnement";
import { viderCacheAppareil } from "./service-worker";

/** « Jean Martin » → « JM » ; « Jean » → « JE ». */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0]!.charAt(0) + words[words.length - 1]!.charAt(0) : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

/**
 * LE MENU DU COMPTE (Greg, 10 novembre 2026, capture 17 ; avant : une petite liste déroulante, 21 octobre). Derrière
 * l'initiale, en haut à droite : une feuille ivoire, « Profil et paramètres » en tête (jaune), puis l'entreprise, les
 * documents, les opportunités commerciales (les comptes qui y ont droit), les négoces, les messages, l'abonnement avec ses
 * factures et reçus, l'aide. L'ADMINISTRATION N'APPARAÎT QUE POUR UN COMPTE AUTORISÉ (le serveur le dit, et il refuse de
 * toute façon les autres). Rien n'a disparu : « Essayer avec un chantier fictif » et « Revoir le guide » vivent dans
 * « Aide, guide et démonstration ».
 */
export function MenuArtisan() {
  const { me, company } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const signalement = useRef<SignalementHandle>(null);
  const [leaving, setLeaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const [chasseur, setChasseur] = useState<{ aTraiter: number } | null>(null);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!open) return;
    let vivant = true;
    api<{ chasseur: boolean; aTraiter: number }>("/v1/chasseur/statut")
      .then((s) => vivant && setChasseur(s.chasseur ? { aTraiter: s.aTraiter } : null))
      .catch(() => undefined);
    api<{ admin: boolean }>("/v1/admin/pilotage/statut")
      .then((s) => vivant && setAdmin(s.admin))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fermer = () => {
      setOpen(false);
      bouton.current?.focus();
    };
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("keydown", clavier);
    box.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => document.removeEventListener("keydown", clavier);
  }, [open]);

  async function signOut() {
    setLeaving(true);
    try {
      await api("/v1/auth/sign-out", { method: "POST", body: {} });
    } finally {
      await viderCacheAppareil();
      router.replace("/connexion");
    }
  }

  const ligne = (href: string, Icone: LucideIcon, titre: string, pastille?: React.ReactNode) => (
    <Link role="menuitem" href={href} onClick={() => setOpen(false)} className="flex min-h-14 items-center gap-4 px-2 text-[16px] font-extrabold transition-[background-color] duration-150 hover:bg-black/5 active:bg-black/5">
      <Icone size={22} aria-hidden="true" className="shrink-0 text-[#6b5300]" />
      <span className="min-w-0 flex-1">{titre}</span>
      {pastille}
      <ChevronRight size={18} aria-hidden="true" className="shrink-0" />
    </Link>
  );
  return (
    <div className="relative flex items-center justify-between">
      <span className="truncate text-[16px] font-extrabold tracking-[0.01em] uppercase">{company?.name}</span>
      <span className="ml-auto flex items-center gap-2 pl-2">
        <PastilleEssai />
        <BoutonTheme />
        <Cloche />
      </span>
      <button ref={bouton} type="button" aria-label="Mon menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="pressable bouton-nuit ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold">
        {initials(me.user.name)}
      </button>
      {/* La fenêtre de signalement vit hors du menu : elle reste ouverte quand il se referme. */}
      <SignalerProbleme connecte sansBouton ref={signalement} />
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 lg:items-start lg:justify-end lg:p-6" onPointerDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div ref={box} role="menu" aria-label="Mon menu" className="animate-rise flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-y-auto rounded-[28px] bg-surface p-4 text-[#130901] shadow-float lg:mt-14">
            <span aria-hidden="true" className="mx-auto mb-3 h-1.5 w-16 shrink-0 rounded-full bg-black/15 lg:hidden" />
            <div className="flex items-center gap-3 pb-3">
              <span aria-hidden="true" className="flex size-13 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-extrabold text-on-accent">
                {initials(me.user.name)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[20px] leading-tight font-extrabold">{me.user.name.split(" ")[0]}</span>
                <span className="truncate text-[13px] text-[#5c5648]">
                  {company?.name}
                  {me.user.emailVerified ? " · compte vérifié" : " · e-mail à confirmer"}
                </span>
              </span>
              <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} className="pressable flex size-11 shrink-0 items-center justify-center rounded-full">
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <Link role="menuitem" href="/compte" onClick={() => setOpen(false)} className="pressable mb-2 flex min-h-14 items-center gap-4 rounded-[18px] bg-accent bg-[linear-gradient(135deg,#ffe45c_0%,#fed206_45%,#f1c400_100%)] px-4 text-[16px] font-extrabold text-on-accent shadow-card">
              <UserRound size={22} aria-hidden="true" className="shrink-0" />
              <span className="flex-1">Profil et paramètres</span>
              <ChevronRight size={18} aria-hidden="true" className="shrink-0" />
            </Link>
            {/* Greg, 12 novembre 2026 (dossier de corrections UX, point 9) : un panneau court. Tout le reste a UN chemin :
                l'entreprise, les documents, l'aide et le guide dans « Profil et paramètres » ; « Mes négoces » et les réponses
                des négoces depuis les quantitatifs ; les conversations depuis Missions. */}
            <div className="flex flex-col divide-y divide-black/10 border-t border-black/10">
              {/* La page « Mon abonnement » réunit déjà l'offre, les factures et les reçus de paiement. */}
              {ligne("/abonnement", CreditCard, "Abonnement, factures et reçus")}
              {chasseur
                ? ligne(
                    "/admin/chasseur",
                    Sparkles,
                    "Opportunités commerciales",
                    chasseur.aTraiter > 0 ? (
                      <span aria-label={`${chasseur.aTraiter} à traiter`} className="flex h-7 min-w-9 items-center justify-center rounded-full bg-accent px-2 text-[13px] font-extrabold text-on-accent">
                        {chasseur.aTraiter}
                      </span>
                    ) : undefined,
                  )
                : null}
            </div>
            {admin ? (
              <Link role="menuitem" href="/admin/pilotage" onClick={() => setOpen(false)} className="pressable mt-3 flex min-h-14 items-center gap-4 rounded-[18px] bg-[#0b0b0c] px-4 text-[16px] font-extrabold text-white">
                <LayoutGrid size={22} aria-hidden="true" className="shrink-0 text-accent" />
                <span className="flex-1">Espace administration</span>
                <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-accent" />
              </Link>
            ) : null}
            {/* Greg, 13 novembre 2026 : « Signaler un problème » sur chaque écran de l'application, par « Mon menu ». */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signalement.current?.ouvrir();
              }}
              className="pressable mt-3 flex min-h-13 items-center gap-3 self-center px-4 text-[15px] font-extrabold"
            >
              <LifeBuoy size={18} aria-hidden="true" className="shrink-0" /> Signaler un problème
            </button>
            <button type="button" role="menuitem" onClick={() => void signOut()} disabled={leaving} className="mt-2 min-h-13 self-center px-4 text-[15px] font-extrabold text-[#a3261a] disabled:opacity-60">
              {leaving ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
