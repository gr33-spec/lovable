"use client";

import { Check, FileText, Tag, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EXEMPLE } from "@/lib/exemple";

/**
 * LA DÉMO GUIDÉE (plan 2 du 21 octobre 2026, bloc 3) : au premier lancement, trois écrans qui montrent l'app avec un
 * faux chantier (devis exemple ardoise, lot exemple, offre exemple), sans compte ni API. Un bouton « Passer » sur chaque
 * écran ; une fois vue (ou passée), elle ne revient plus (clé locale), sauf par `?demo` dans l'adresse. Les données sont
 * fictives et marquées comme telles sur chaque écran. Nouveau cap (22 octobre) : ta liste → les couvreurs du secteur
 * regroupés (le compteur) → ton prix livré chez toi ; rien sur la rémunération, en suspens.
 */
export const CLE_DEMO_VUE = "baticlair.demoVue";

type Ecran = 0 | 1 | 2;

export function DemoGuidee() {
  // Rendue par le serveur (premier lancement : le cas par défaut) ; déjà vue, le script de la page l'a cachée avant
  // l'affichage (`html[data-demo-vue]`), puis elle sort ici sans rien décaler.
  const [visible, setVisible] = useState(true);
  const [ecran, setEcran] = useState<Ecran>(0);

  useEffect(() => {
    // « Revoir la démo » (`/?demo`) recharge la page : l'adresse se lit ici.
    const forcee = new URLSearchParams(window.location.search).has("demo");
    if (forcee) delete document.documentElement.dataset.demoVue;
    let vue = false;
    try {
      vue = localStorage.getItem(CLE_DEMO_VUE) !== null;
    } catch {
      vue = false;
    }
    // Lu après le rendu : le serveur ne connaît pas le réglage local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(forcee || !vue);
  }, []);

  function fermer() {
    try {
      localStorage.setItem(CLE_DEMO_VUE, new Date().toISOString());
    } catch {
      // Sans stockage local, la démo reviendra : rien de grave.
    }
    setVisible(false);
  }

  if (!visible) return null;
  const titres = ["Ta liste, remise au propre", "La commande commune, tous ensemble", "Ton prix, livré chez toi"];
  return (
    <section data-demo aria-labelledby="demo-titre" className="flex min-h-[calc(100svh-4rem)] flex-col gap-4 rounded-xl border border-line bg-surface p-4 text-ink sm:min-h-0 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-bold tracking-[0.04em] text-muted">Démo · écran {ecran + 1} sur 3 · données fictives</span>
          <h2 id="demo-titre" className="text-[26px] leading-tight font-extrabold tracking-[-0.03em]">
            {titres[ecran]}
          </h2>
        </div>
        <button type="button" onClick={fermer} className="pressable inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-4 text-[15px] font-semibold">
          Passer
        </button>
      </div>

      {ecran === 0 ? <EcranDevis /> : ecran === 1 ? <EcranLot /> : <EcranOffre />}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <ol aria-label="Écrans de la démo" className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <li key={i} aria-current={i === ecran ? "step" : undefined} className={`size-2.5 rounded-full ${i === ecran ? "bg-ink" : "bg-line"}`} />
          ))}
        </ol>
        {ecran < 2 ? (
          <button type="button" onClick={() => setEcran((ecran + 1) as Ecran)} className="pressable inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent hover:bg-accent-hover">
            Suivant
          </button>
        ) : (
          <Link href="/inscription" onClick={fermer} className="pressable inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent hover:bg-accent-hover">
            Je rejoins le mouvement
          </Link>
        )}
      </div>
    </section>
  );
}

function Exemple() {
  return <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-muted">Exemple</span>;
}

/** Écran 1 : la liste donnée en photo et ce qui en sort, dans les mots du comptoir. */
function EcranDevis() {
  const d = EXEMPLE.devis;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex items-center gap-3 rounded-xl bg-ground p-3">
        <FileText size={22} aria-hidden="true" className="shrink-0 text-accent-text" />
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 text-[14px] font-extrabold">
            {/* Plan « finition », bloc 4 : l'écran dit « ta liste, donnée en photo », la carte ne parle plus d'un devis. */}
            Photo de ta liste <Exemple />
          </span>
          <span className="truncate text-[13px] text-muted">
            {d.client} · {d.adresse} · {d.objet}
          </span>
        </div>
      </div>
      <p className="text-[14px] font-bold text-muted">Donnée en photo, remise au propre, ligne par ligne :</p>
      <ul aria-label="Liste de fournitures (exemple)" className="flex flex-col divide-y divide-line rounded-xl bg-ground">
        {EXEMPLE.liste.map((l) => (
          <li key={l.designation} className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-mark-ok text-white" aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="min-w-0 grow text-[14px] font-bold">{l.designation}</span>
            <span className="shrink-0 text-[14px] font-extrabold">{l.quantite}</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">Chaque ligne précise rejoint celles des artisans de ton secteur.</p>
    </div>
  );
}

/** Écran 2 : la commande commune du mois (Greg, 22 octobre 2026) : en quantités, le chrono ; jamais un nombre d'entreprises. */
function EcranLot() {
  const c = EXEMPLE.commande;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex flex-col gap-2 rounded-xl bg-ground p-3">
        <span className="flex items-center gap-2 text-[14px] font-extrabold">
          <Users size={18} aria-hidden="true" className="text-accent-text" />
          {`Commande ${c.de}`} <Exemple />
        </span>
        <p className="text-[15px] font-extrabold text-accent-text">{c.cloture}</p>
        <p className="text-[15px] font-bold">{c.toi}</p>
        <p className="text-[15px] font-bold">{c.tout}</p>
        <ul className="flex flex-col gap-1 text-[14px]">
          <li>À la clôture, tout le volume part aux négoces de la région.</li>
          <li>Tu vois le meilleur prix et tu commandes si ça te plaît.</li>
        </ul>
      </div>
      <p className="text-[14px] font-bold text-muted">Personne ne voit ton nom ni tes chantiers.</p>
    </div>
  );
}

/** Écran 3 : l'offre personnelle, une information, pas une question. */
function EcranOffre() {
  const o = EXEMPLE.offre;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex flex-col gap-2 rounded-xl bg-ground p-3">
        <span className="flex items-center gap-2 text-[14px] font-extrabold">
          <Tag size={18} aria-hidden="true" className="text-accent-text" />
          Ton prix · {EXEMPLE.lot.reference} <Exemple />
        </span>
        <span className="text-[17px] leading-snug font-extrabold">
          {o.quantite} à {o.prix} chez {o.negoce} ({o.baisse})
        </span>
        <span className="text-[15px] font-bold">
          Ton prix : {o.livre} (livraison {o.fraisLivraison}). Ton prix habituel : {o.habituel} l&apos;unité.
        </span>
        <span className="text-[14px] text-muted">Livraison le {o.livraison}, sur ton chantier, sur ton compte chez lui.</span>
        <span className="text-[15px] font-extrabold text-ok">Économie estimée : {o.economie}</span>
      </div>
      <p className="text-[14px] font-bold text-muted">Tu dis « Livré » quand c&apos;est arrivé.</p>
    </div>
  );
}
