"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, CreditCard, FlaskConical, LayoutDashboard, Phone, Truck, UserRound, Inbox } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { revoirLeGuide } from "./guide-premier-lancement";
import { Cloche } from "./achat-groupe";
import { PastilleEssai } from "./abonnement";

/** « Jean Martin » → « JM » ; « Jean » → « JE ». */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0]!.charAt(0) + words[words.length - 1]!.charAt(0) : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Simplification (21 octobre) : Fournisseurs et Compte ne sont plus dans la barre du bas. Ils vivent derrière l'initiale
 * de l'artisan, en haut à droite de chaque écran, avec l'essai sur un chantier fictif.
 */
export function MenuArtisan() {
  const { me, company } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Point 4 bis : pour un chasseur d'opportunités, l'entrée de son écran et le compteur « à traiter ».
  const [chasseur, setChasseur] = useState<{ aTraiter: number } | null>(null);
  // Greg (25 octobre 2026) : l'espace admin se trouve dans le menu, plus seulement par un lien de l'onglet Regroupement.
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
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function demo() {
    setPending(true);
    setError(false);
    try {
      const { projectId } = await api<{ projectId: string }>("/v1/demo/project", { method: "POST" });
      setOpen(false);
      router.push(`/chantiers/${projectId}`);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error);
    } finally {
      setPending(false);
    }
  }

  const item = "flex min-h-13 w-full items-center gap-3 px-4 text-left text-[16px] font-semibold transition-[background-color] duration-150 hover:bg-ground active:bg-ground";
  return (
    <div ref={box} className="relative flex items-center justify-between">
      <span className="truncate text-[16px] font-extrabold">{company?.name}</span>
      {/* Achat groupé (Greg, 27 octobre 2026, point 10) : la pastille de l'essai et la cloche, à côté de l'initiale. */}
      <span className="ml-auto flex items-center gap-2 pl-2">
        <PastilleEssai />
        <Cloche />
      </span>
      <button
        type="button"
        aria-label="Mon menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="pressable ml-2 flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[14px] font-extrabold active:bg-ground"
      >
        {initials(me.user.name)}
      </button>
      {open ? (
        <div role="menu" aria-label="Mon menu" className="animate-rise absolute top-13 right-0 z-40 flex w-64 flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {admin ? (
            <Link role="menuitem" href="/admin/pilotage" onClick={() => setOpen(false)} className={item}>
              <LayoutDashboard size={20} aria-hidden="true" className="text-muted" />
              Espace admin
            </Link>
          ) : null}
          {chasseur ? (
            <Link role="menuitem" href="/admin/chasseur" onClick={() => setOpen(false)} className={item}>
              <Phone size={20} aria-hidden="true" className="text-muted" />
              Chasseur d&apos;opportunités
              {chasseur.aTraiter > 0 ? (
                <span aria-label={`${chasseur.aTraiter} à traiter`} className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-[13px] font-extrabold text-on-accent">
                  {chasseur.aTraiter}
                </span>
              ) : null}
            </Link>
          ) : null}
          <Link role="menuitem" href="/fournisseurs" onClick={() => setOpen(false)} className={item}>
            <Truck size={20} aria-hidden="true" className="text-muted" />
            Mes fournisseurs
          </Link>
          <Link role="menuitem" href="/recus" onClick={() => setOpen(false)} className={item}>
            <Inbox size={20} aria-hidden="true" className="text-muted" />
            Mes reçus
          </Link>
          <Link role="menuitem" href="/abonnement" onClick={() => setOpen(false)} className={item}>
            <CreditCard size={20} aria-hidden="true" className="text-muted" />
            Mon abonnement
          </Link>
          <Link role="menuitem" href="/compte" onClick={() => setOpen(false)} className={item}>
            <UserRound size={20} aria-hidden="true" className="text-muted" />
            Mon compte
          </Link>
          <button type="button" role="menuitem" onClick={() => void demo()} disabled={pending} className={`${item} disabled:opacity-60`}>
            <FlaskConical size={20} aria-hidden="true" className="text-muted" />
            {pending ? "Préparation…" : "Essayer avec un chantier fictif"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              revoirLeGuide();
            }}
            className={item}
          >
            <CircleHelp size={20} aria-hidden="true" className="text-muted" />
            Revoir le guide
          </button>
          {error ? <p className="px-4 py-3 text-[14px] font-semibold text-warn">Ça n&apos;a pas marché, réessaie.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
