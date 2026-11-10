"use client";

import { Check, ChevronLeft, ChevronRight, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBack } from "@/lib/history";

/**
 * LE KIT DES ÉCRANS « PREMIUM » (Greg, 10 novembre 2026, captures MOBIIZ-PREMIUM) : les pièces communes aux nouveaux
 * parcours (Missions, Messages et réponses, Compte). Noir profond, cartes ivoire, UN jaune par écran pour l'action
 * principale, textes forts. Tout est un vrai lien, un vrai bouton ou un vrai champ : rien n'est une image.
 */

export const CARTE = "rounded-[20px] bg-surface text-ink shadow-card";
const JAUNE = "bg-accent bg-[linear-gradient(135deg,#ffe45c_0%,#fed206_45%,#f1c400_100%)] text-on-accent";

/** L'en-tête d'un écran intérieur : la flèche retour (écran précédent, sinon `retour`) et son titre. */
export function EcranTitre({ titre, retour }: { titre: string; retour: string }) {
  const back = useBack(retour);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={back} aria-label="Retour" className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-ink">
        <ChevronLeft size={26} aria-hidden="true" />
      </button>
      <p className="truncate text-[17px] font-extrabold">{titre}</p>
    </div>
  );
}

export function GrandTitre({ sur, children, sous }: { sur?: string; children: React.ReactNode; sous?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      {sur ? <p className="text-[13px] font-bold text-accent-text">{sur}</p> : null}
      <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em] text-balance lg:text-[32px]">{children}</h1>
      {sous ? <p className="text-[14px] text-muted">{sous}</p> : null}
    </header>
  );
}

export function TitreSection({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-1">
      <h2 className="text-[12px] font-extrabold tracking-[0.06em] text-ink/80 uppercase">{children}</h2>
      {action}
    </div>
  );
}

type Ton = "jaune" | "vert" | "gris";
const TONS: Record<Ton, string> = { jaune: "bg-[#ffe98a] text-[#130901]", vert: "bg-[#d9f1e3] text-[#0b6b43]", gris: "bg-ground/10 text-muted" };
/** L'étiquette d'état d'une carte (« MISSION », « DISPONIBLE », « NÉGOCE ») : un mot, jamais la couleur seule. */
export function Etiquette({ ton = "jaune", children }: { ton?: Ton; children: React.ReactNode }) {
  return <span className={`inline-flex self-start rounded-md px-2.5 py-1 text-[11px] font-extrabold tracking-[0.05em] uppercase ${TONS[ton]}`}>{children}</span>;
}

/** Une grande carte cliquable : pastille d'icône, titre, sous-titre, chevron. `jaune` : l'action principale de l'écran. */
export function CarteLien({ href, onClick, icone: Icone, titre, sous, jaune = false, pastille, etiquette, label }: { href?: string; onClick?: () => void; icone?: LucideIcon; titre: string; sous?: React.ReactNode; jaune?: boolean; pastille?: React.ReactNode; etiquette?: React.ReactNode; /** Le nom lu par un lecteur d'écran, quand il doit commencer par l'action et non par l'étiquette. */ label?: string }) {
  const classe = `pressable flex w-full items-center gap-3 rounded-[20px] p-4 text-left shadow-card ${jaune ? JAUNE : "bg-surface text-ink"}`;
  const contenu = (
    <>
      {Icone ? (
        <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-full ${jaune ? "bg-black/10" : "bg-[#efece6]"}`}>
          <Icone size={22} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {etiquette}
        <span className="text-[17px] leading-tight font-extrabold text-balance">{titre}</span>
        {sous ? <span className={`text-[13px] leading-snug ${jaune ? "text-on-accent/85" : "text-[#5c5648]"}`}>{sous}</span> : null}
      </span>
      {pastille}
      <ChevronRight size={20} aria-hidden="true" className="shrink-0" />
    </>
  );
  return href ? (
    <Link href={href} className={classe} {...(label ? { "aria-label": label } : {})}>
      {contenu}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classe}>
      {contenu}
    </button>
  );
}

/** Les filtres en pastilles (« Tous · Missions · Négoces · Non lus ») : des boutons à bascule, un seul actif. */
export function Puces<T extends string>({ choix, valeur, onChange, label }: { choix: readonly { id: T; libelle: string }[]; valeur: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
      {choix.map((c) => (
        <button key={c.id} type="button" aria-pressed={valeur === c.id} onClick={() => onChange(c.id)} className={`pressable min-h-11 shrink-0 rounded-full px-4 text-[14px] font-extrabold whitespace-nowrap ${valeur === c.id ? "bg-accent text-on-accent" : "border border-ink/35 text-ink"}`}>
          {c.libelle}
        </button>
      ))}
    </div>
  );
}

export function Recherche({ valeur, onChange, placeholder }: { valeur: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className={`flex min-h-13 items-center gap-3 px-4 ${CARTE}`}>
      <Search size={20} aria-hidden="true" className="shrink-0" />
      <input type="search" value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#7a7466]" />
    </label>
  );
}

/** L'encart sombre d'information (« Mise en relation uniquement. ») : un titre court et une phrase. */
export function Encart({ titre, children }: { titre: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-line bg-(--voile-2) px-4 py-3">
      <p className="text-[14px] font-extrabold">{titre}</p>
      {children ? <p className="text-[13px] leading-snug text-muted">{children}</p> : null}
    </div>
  );
}

const BOUTON = "pressable inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] px-5 text-center text-[17px] leading-tight font-extrabold disabled:cursor-not-allowed disabled:opacity-50";
/** Le bouton principal d'un écran : jaune, pleine largeur ; son texte passe à la ligne plutôt que d'être coupé. */
export function BoutonJaune({ children, pending = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button type="button" {...props} disabled={props.disabled || pending} aria-busy={pending || undefined} className={`${BOUTON} ${JAUNE} shadow-card`}>
      {pending ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
export function LienJaune({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${BOUTON} ${JAUNE} shadow-card`}>
      {children}
    </Link>
  );
}
const CONTOUR = `${BOUTON} min-h-13 border-2 border-accent bg-transparent text-[15px] text-accent-text`;
export function BoutonContour({ children, pending = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button type="button" {...props} disabled={props.disabled || pending} aria-busy={pending || undefined} className={CONTOUR}>
      {children}
    </button>
  );
}
export function LienContour({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={CONTOUR}>
      {children}
    </Link>
  );
}

const CHAMP = `flex min-h-16 flex-col justify-center gap-0.5 px-4 py-2.5 ${CARTE} focus-within:ring-2 focus-within:ring-accent`;
const SAISIE = "w-full min-w-0 bg-transparent text-[16px] font-extrabold text-ink outline-none placeholder:font-semibold placeholder:text-[#8a8474]";
/** Un champ en carte : le petit libellé au-dessus, la valeur en gras dessous (les lignes des captures 07, 08, 49 à 51). */
export function Champ({ label, erreur, children }: { label: string; erreur?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`${CHAMP} ${erreur ? "ring-2 ring-danger" : ""}`}>
        <span className="text-[12px] text-[#6b6557]">{label}</span>
        {children}
      </label>
      {erreur ? (
        <p role="alert" className="px-1 text-[13px] font-semibold text-[#ff8a7a]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
export function ChampTexte(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; erreur?: string | undefined }) {
  const { label, erreur, ...reste } = props;
  return (
    <Champ label={label} erreur={erreur}>
      <input {...reste} aria-invalid={erreur ? true : undefined} className={SAISIE} />
    </Champ>
  );
}
export function ChampChoix({ label, erreur, choix, vide, ...reste }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; erreur?: string | undefined; choix: readonly { id: string; libelle: string }[]; vide?: string }) {
  return (
    <Champ label={label} erreur={erreur}>
      <select {...reste} aria-invalid={erreur ? true : undefined} className={`${SAISIE} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23130901%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m9 18 6-6-6-6%22/></svg>')] bg-[position:right_center] bg-no-repeat pr-7`}>
        {vide !== undefined ? <option value="">{vide}</option> : null}
        {choix.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </select>
    </Champ>
  );
}
export function ChampLong({ label, erreur, ...reste }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; erreur?: string | undefined }) {
  return (
    <Champ label={label} erreur={erreur}>
      <textarea rows={3} {...reste} aria-invalid={erreur ? true : undefined} className={`${SAISIE} resize-none leading-snug`} />
    </Champ>
  );
}

/** Une case à cocher en carte (« J'accepte de partager mes coordonnées… ») : une vraie case, toute la carte la coche. */
export function Coche({ coche, onChange, titre, sous, sombre = false }: { coche: boolean; onChange: (v: boolean) => void; titre: string; sous?: string; sombre?: boolean }) {
  return (
    <label className={`relative flex cursor-pointer items-start gap-3 rounded-[18px] p-4 ${sombre ? "border border-line bg-(--voile-2)" : `${CARTE}`}`}>
      {/* La vraie case couvre toute la carte (invisible) : un tap n'importe où la coche, au clavier comme au doigt. */}
      <input type="checkbox" checked={coche} onChange={(e) => onChange(e.target.checked)} className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
      <span aria-hidden="true" className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${coche ? "border-accent bg-accent text-on-accent" : sombre ? "border-ink/50" : "border-[#8a8474]"}`}>
        {coche ? <Check size={16} strokeWidth={3} /> : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] leading-snug font-extrabold">{titre}</span>
        {sous ? <span className={`text-[13px] ${sombre ? "text-muted" : "text-[#5c5648]"}`}>{sous}</span> : null}
      </span>
    </label>
  );
}

/** Un interrupteur (réglages de notification) : `role="switch"`, activable au clavier. */
export function Interrupteur({ actif, onChange, titre, sous, disabled = false }: { actif: boolean; onChange: (v: boolean) => void; titre: string; sous: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-4 ${CARTE}`}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[16px] font-extrabold">{titre}</span>
        <span className="text-[13px] text-[#5c5648]">{sous}</span>
      </span>
      <button type="button" role="switch" aria-checked={actif} aria-label={titre} disabled={disabled} onClick={() => onChange(!actif)} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50 ${actif ? "bg-accent" : "bg-[#1c1c1f]"}`}>
        <span aria-hidden="true" className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] duration-150 ${actif ? "left-7" : "left-1"}`} />
      </button>
    </div>
  );
}

/** Le rond des initiales d'une entreprise. */
export function Avatar({ initiales, jaune = false }: { initiales: string; jaune?: boolean }) {
  return (
    <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${jaune ? "bg-accent text-on-accent" : "bg-[#efece6] text-[#130901]"}`}>
      {initiales}
    </span>
  );
}

/** Une ligne « libellé … valeur » d'une carte de détail. */
export function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-[13px] text-[#6b6557]">{label}</dt>
      <dd className="text-right text-[14px] font-extrabold">{children}</dd>
    </div>
  );
}

/** Les états d'un écran : chargement, erreur (avec « Réessayer »), hors connexion, accès refusé ou introuvable. */
export function EtatEcran({ erreur, onReessayer, retour }: { erreur: { status: number; code: string; phrase?: string | undefined; message: string } | null; onReessayer?: () => void; retour?: { href: string; libelle: string } }) {
  const [horsLigne, setHorsLigne] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  if (!erreur) {
    return (
      <div role="status" aria-label="Chargement…" className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[20px] bg-(--voile-3)" />
        ))}
      </div>
    );
  }
  const reseau = horsLigne || erreur.code === "network";
  const introuvable = erreur.status === 404;
  const refuse = erreur.status === 403;
  const titre = reseau ? "Tu es hors connexion" : introuvable ? "Introuvable" : refuse ? "Accès refusé" : "Un souci est survenu";
  const phrase = reseau ? "Vérifie ton réseau. Rien n'est perdu : réessaie dès que la connexion revient." : (erreur.phrase ?? (introuvable ? "Cet élément n'existe plus ou ne t'est pas accessible." : refuse ? "Tu n'as pas accès à cet écran." : "Réessaie dans un instant."));
  return (
    <div role="alert" className={`flex flex-col items-start gap-3 p-5 ${CARTE}`}>
      <p className="text-[18px] font-extrabold">{titre}</p>
      <p className="text-[14px] text-[#5c5648]">{phrase}</p>
      <div className="flex flex-wrap gap-2">
        {onReessayer && !introuvable && !refuse ? (
          <button type="button" onClick={onReessayer} className="pressable min-h-11 rounded-full bg-accent px-5 text-[15px] font-extrabold text-on-accent">
            Réessayer
          </button>
        ) : null}
        {retour ? (
          <button type="button" onClick={() => router.push(retour.href)} className="pressable min-h-11 rounded-full border border-[#8a8474] px-5 text-[15px] font-extrabold">
            {retour.libelle}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** La phrase d'un refus d'action, sous le bouton qui l'a déclenché. */
export function Refus({ children }: { children: React.ReactNode }) {
  return children ? (
    <p role="alert" className="rounded-xl bg-[#3a1512] px-4 py-3 text-[14px] font-semibold text-[#ffb4a8]">
      {children}
    </p>
  ) : null;
}

/** Le rond jaune coché des écrans de confirmation (« Réponse envoyée », « C'est fait »). */
export function RondFait() {
  return (
    <span aria-hidden="true" className="mx-auto flex size-20 items-center justify-center rounded-full bg-accent text-on-accent">
      <Check size={36} strokeWidth={3} />
    </span>
  );
}
