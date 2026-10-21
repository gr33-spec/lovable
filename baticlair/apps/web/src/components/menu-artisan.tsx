"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, Truck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

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

  const item = "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-bold hover:bg-ground";
  return (
    <div ref={box} className="relative flex items-center justify-between">
      <span className="truncate text-[15px] font-extrabold">{company?.name}</span>
      <button
        type="button"
        aria-label="Mon menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-extrabold shadow-card"
      >
        {initials(me.user.name)}
      </button>
      {open ? (
        <div role="menu" aria-label="Mon menu" className="absolute top-12 right-0 z-40 flex w-64 flex-col rounded-2xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-12px_rgba(20,24,60,0.35)]">
          <Link role="menuitem" href="/fournisseurs" onClick={() => setOpen(false)} className={item}>
            <Truck size={20} aria-hidden="true" className="text-muted" />
            Mes fournisseurs
          </Link>
          <Link role="menuitem" href="/compte" onClick={() => setOpen(false)} className={item}>
            <UserRound size={20} aria-hidden="true" className="text-muted" />
            Mon compte
          </Link>
          <button type="button" role="menuitem" onClick={() => void demo()} disabled={pending} className={`${item} disabled:opacity-60`}>
            <FlaskConical size={20} aria-hidden="true" className="text-muted" />
            {pending ? "Préparation…" : "Essayer avec un chantier fictif"}
          </button>
          {error ? <p className="px-3 py-2 text-[13px] font-semibold text-warn">Ça n&apos;a pas marché, réessaie.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
