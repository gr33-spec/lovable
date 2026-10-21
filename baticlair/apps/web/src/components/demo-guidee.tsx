"use client";

import { Check, FileText, Tag, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * LA DÉMO GUIDÉE (plan 2 du 21 octobre 2026, bloc 3) : au premier lancement, trois écrans qui montrent l'app avec un
 * faux chantier (devis exemple ardoise, lot exemple, offre exemple), sans compte ni API. Un bouton « Passer » sur chaque
 * écran ; une fois vue (ou passée), elle ne revient plus (clé locale), sauf par `?demo` dans l'adresse. Les données sont
 * fictives et marquées comme telles sur chaque écran.
 */
export const CLE_DEMO_VUE = "baticlair.demoVue";

/** Le faux devis d'ardoise et ce que BatiClair en sort. Tous les chiffres sont inventés. */
export const EXEMPLE = {
  devis: { numero: "D-2026-042", client: "Maison Le Goff", adresse: "Ploubazlanec (22)", objet: "Couverture ardoise 32 × 22, 118 m²" },
  liste: [
    { designation: "Ardoise 32 × 22 Espagne 1er choix", quantite: "2 760 pièces" },
    { designation: "Crochet inox 100 mm", quantite: "3 paquets" },
    { designation: "Liteau sapin traité 27 × 38", quantite: "480 m" },
    { designation: "Écran sous-toiture HPV 1,5 × 50 m", quantite: "4 rouleaux" },
    { designation: "Faîtage zinc dév. 33", quantite: "6 longueurs de 2 m" },
  ],
  lot: { numero: 12, departement: "Côtes-d'Armor", reference: "Ardoise 32 × 22 Espagne 1er choix", artisans: 3, volume: "8 200 pièces", negoces: 4 },
  offre: { quantite: "2 760 pièces", prix: "0,92 € HT l'unité", negoce: "Négoce Exemple, Guingamp", baisse: "−11 %", livraison: "3 novembre", economie: "315 €" },
} as const;

type Ecran = 0 | 1 | 2;

export function DemoGuidee() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [ecran, setEcran] = useState<Ecran>(0);
  // « Revoir la démo » (`/?demo`) : une navigation côté client sur la même page, d'où la lecture par le routeur.
  const forcee = useSearchParams().has("demo");

  useEffect(() => {
    let vue = false;
    try {
      vue = localStorage.getItem(CLE_DEMO_VUE) !== null;
    } catch {
      vue = false;
    }
    // Lu après le rendu : le serveur ne connaît pas le réglage local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(forcee || !vue);
    if (forcee) setEcran(0);
  }, [forcee]);

  function fermer() {
    try {
      localStorage.setItem(CLE_DEMO_VUE, new Date().toISOString());
    } catch {
      // Sans stockage local, la démo reviendra : rien de grave.
    }
    setVisible(false);
  }

  if (!visible) return null;
  const titres = ["Ton devis devient ta liste", "Le groupé, avec les artisans du département", "Ton offre, ton prix"];
  return (
    <section aria-labelledby="demo-titre" className="flex min-h-[calc(100svh-4rem)] flex-col gap-4 rounded-[28px] bg-hero p-4 text-white shadow-[0_24px_48px_-16px_rgba(26,21,80,0.6)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-extrabold tracking-[0.04em] text-[#c9ced6]">Démo · écran {ecran + 1} sur 3 · données fictives</span>
          <h2 id="demo-titre" className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
            {titres[ecran]}
          </h2>
        </div>
        <button type="button" onClick={fermer} className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white/10 px-4 text-[15px] font-extrabold">
          Passer
        </button>
      </div>

      {ecran === 0 ? <EcranDevis /> : ecran === 1 ? <EcranLot /> : <EcranOffre />}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <ol aria-label="Écrans de la démo" className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <li key={i} aria-current={i === ecran ? "step" : undefined} className={`size-2.5 rounded-full ${i === ecran ? "bg-white" : "bg-white/30"}`} />
          ))}
        </ol>
        {ecran < 2 ? (
          <button type="button" onClick={() => setEcran((ecran + 1) as Ecran)} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-cta px-5 text-[15px] font-extrabold shadow-cta">
            Suivant
          </button>
        ) : (
          <Link href="/inscription" onClick={fermer} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-cta px-5 text-[15px] font-extrabold shadow-cta">
            Créer un compte
          </Link>
        )}
      </div>
    </section>
  );
}

function Exemple() {
  return <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-extrabold text-warn">Exemple</span>;
}

/** Écran 1 : le devis déposé et la liste qui en sort, dans les mots du comptoir. */
function EcranDevis() {
  const d = EXEMPLE.devis;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3">
        <FileText size={22} aria-hidden="true" className="shrink-0 text-accent-text" />
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 text-[14px] font-extrabold">
            Devis {d.numero} <Exemple />
          </span>
          <span className="truncate text-[13px] text-muted">
            {d.client} · {d.adresse} · {d.objet}
          </span>
        </div>
      </div>
      <p className="text-[14px] font-bold text-[#c9ced6]">Déposé en photo. Deux questions au comptoir, puis la liste :</p>
      <ul aria-label="Liste de fournitures (exemple)" className="flex flex-col divide-y divide-line rounded-2xl bg-white/95">
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
      <p className="text-[13px] text-[#c9ced6]">Prête à partir chez tes négoces, ou à proposer au groupé.</p>
    </div>
  );
}

/** Écran 2 : la ligne d'ardoise rejoint un lot du département ; personne ne voit son nom. */
function EcranLot() {
  const l = EXEMPLE.lot;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex flex-col gap-2 rounded-2xl bg-white/95 p-3">
        <span className="flex items-center gap-2 text-[14px] font-extrabold">
          <Users size={18} aria-hidden="true" className="text-accent-text" />
          Commande groupée n° {l.numero} · {l.departement} <Exemple />
        </span>
        <span className="text-[15px] font-bold">{l.reference}</span>
        <ul className="flex flex-col gap-1 text-[14px]">
          <li>
            <strong>{l.artisans} artisans</strong> du département, <strong>{l.volume}</strong> en tout, dont tes 2 760.
          </li>
          <li>
            Demande partie chez <strong>{l.negoces} négoces</strong>, réponses sous 7 jours.
          </li>
          <li>Un seul négoce retenu pour toute la commande : c&apos;est ce qui fait le prix.</li>
        </ul>
      </div>
      <p className="text-[14px] font-bold text-[#c9ced6]">Tu as coché « Chantier signé » : tu t&apos;engages à commander ces quantités au prix obtenu. Ton nom ne part pas avec.</p>
    </div>
  );
}

/** Écran 3 : l'offre personnelle, une information, pas une question. */
function EcranOffre() {
  const o = EXEMPLE.offre;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex flex-col gap-2 rounded-2xl bg-white/95 p-3">
        <span className="flex items-center gap-2 text-[14px] font-extrabold">
          <Tag size={18} aria-hidden="true" className="text-accent-text" />
          Mon offre · commande groupée n° {EXEMPLE.lot.numero} <Exemple />
        </span>
        <span className="text-[17px] leading-snug font-extrabold">
          {o.quantite} à {o.prix} chez {o.negoce} ({o.baisse})
        </span>
        <span className="text-[14px] text-muted">Livraison le {o.livraison}, sur ton chantier, sur ton compte chez lui. Bon de commande transmis.</span>
        <span className="text-[15px] font-extrabold text-ok">Économie estimée : {o.economie}</span>
      </div>
      <p className="text-[14px] font-bold text-[#c9ced6]">Gratuit pour toi : le négoce retenu verse 2 % à BatiClair. Tu dis « Livré » quand c&apos;est arrivé.</p>
    </div>
  );
}
