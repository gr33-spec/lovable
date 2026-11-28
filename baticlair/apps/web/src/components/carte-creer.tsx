"use client";

import { Briefcase, ClipboardList, Users, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

interface Tuile {
  href: string;
  titre: string;
  sous: string;
  Icone: LucideIcon;
  bientot?: boolean;
}

/**
 * LA CARTE DU ＋ (Greg, 18 novembre 2026, navigation définitive du téléphone) : trois grandes tuiles pour créer.
 * « Nouveau quantitatif » ouvre la création ; « Besoin groupé », « Publier un besoin groupé » ; « Mission », l'écran
 * Missions (grisée avec « Bientôt » tant que Mission est coupée : l'écran explique alors le principe). Fond voilé avec un
 * léger flou (clair ou sombre selon le thème), la carte monte en douceur, le ＋ de la barre tourne en croix. Elle se ferme
 * par la croix, le voile, Échap ou le bouton retour du téléphone.
 */
export function CarteCreer({ missionsBientot, groupe, onFermer }: { missionsBientot: boolean; groupe: boolean; onFermer: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const premier = useRef<HTMLButtonElement>(null);
  const historique = useRef(false);

  useEffect(() => {
    premier.current?.focus();
    // Le bouton retour du téléphone ferme la carte au lieu de quitter l'écran.
    window.history.pushState({ carteCreer: true }, "");
    historique.current = true;
    const retour = () => {
      historique.current = false;
      onFermer();
    };
    const touche = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    window.addEventListener("popstate", retour);
    window.addEventListener("keydown", touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", retour);
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = avant;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Fermer : on retire l'étape ajoutée à l'historique (le retour du navigateur referme alors la carte). */
  function fermer() {
    if (historique.current) window.history.back();
    else onFermer();
  }
  /** Ouvrir une tuile : l'écran remplace l'étape de la carte, le retour ramène à l'écran d'avant. */
  function ouvrir(href: string) {
    historique.current = false;
    router.replace(href);
    onFermer();
  }

  const tuiles: Tuile[] = [
    { href: "/chantiers/nouveau", titre: "Nouveau quantitatif", sous: "Faire une liste de matériaux", Icone: ClipboardList },
    ...(groupe ? [{ href: "/achats-groupes/publier", titre: "Besoin groupé", sous: "Acheter à plusieurs, moins cher", Icone: Users }] : []),
    { href: "/missions", titre: "Mission", sous: "Trouver ou proposer du renfort", Icone: Briefcase, bientot: missionsBientot },
  ];
  const sombre = theme !== "clair";
  return (
    <div
      className={`fixed top-0 left-0 z-[29] flex h-[100dvh] w-full items-end justify-center backdrop-blur-md lg:hidden ${sombre ? "bg-black/55" : "bg-[rgba(251,248,243,0.6)]"}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) fermer();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Créer"
        className="carte-creer-monte mx-3 flex w-full max-w-md flex-col gap-2.5 rounded-[28px] bg-surface p-3 text-ink shadow-float ring-1 ring-line"
        style={{ marginBottom: "calc(var(--nav-space) + 12px)" }}
      >
        <div className="flex items-center justify-between px-2 pt-1">
          <p className="text-[18px] font-extrabold">Créer</p>
          <button type="button" onClick={fermer} aria-label="Fermer" className="pressable grid size-11 place-items-center rounded-full bg-(--voile-3)">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {tuiles.map((t, i) => (
          <button
            key={t.href}
            ref={i === 0 ? premier : undefined}
            type="button"
            onClick={() => ouvrir(t.href)}
            className={`pressable flex min-h-[76px] items-center gap-4 rounded-[20px] bg-ground px-4 py-3 text-left ring-1 ring-line ${t.bientot ? "opacity-60" : ""}`}
          >
            <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-full ${t.bientot ? "bg-(--voile-3) text-muted" : "bg-accent text-on-accent"}`}>
              <t.Icone size={23} strokeWidth={2.3} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 text-[17px] leading-tight font-extrabold">
                {t.titre}
                {t.bientot ? <span className="rounded-full bg-accent px-2 text-[11px] leading-5 font-extrabold text-on-accent">Bientôt</span> : null}
              </span>
              <span className="text-[14px] leading-snug text-muted">{t.sous}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
