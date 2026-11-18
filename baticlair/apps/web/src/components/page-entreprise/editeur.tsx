"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  Hammer,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Loader2,
  Maximize2,
  Monitor,
  Palette,
  Phone,
  Plus,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { lienGooglePropre, photoDefautDe, photoPubliqueDefaut, texteSurCouleur, type ContenuPage, type Prestation } from "@baticlair/domain/page-entreprise";
import { Button, Skeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useTyping } from "@/lib/typing";
import { envoyerPhoto, GaleriePhotos, type PhotoEditeur } from "./editeur-photos";
import { rafraichirPagePublique } from "./rafraichir";
import { LIBELLES, VuePage, initiales } from "./vue-page";

/**
 * « MON SITE » (Greg, 16 novembre 2026), onglet de la navigation principale. RÈGLE CHANGÉE (Greg, 17 novembre 2026 :
 * « plus intuitif, style Lovable ») : avant, une longue colonne de cartes et l'aperçu à côté ; maintenant le site est
 * TOUJOURS visible et se met à jour à chaque changement, les réglages sont rangés en sept onglets (Couleurs, Photos,
 * Prestations, Chantiers, À propos, Contact, Publier). Ordinateur : le panneau des réglages à gauche (un quart de la
 * largeur), le site en grand à droite. Téléphone, RÈGLE CHANGÉE (Greg, 18 novembre 2026) : avant, le site en haut et une
 * barre d'onglets flottante en bas, qui recouvrait les couleurs ; maintenant une colonne d'onglets collée à gauche (en L
 * avec le menu de l'app), le téléphone en entier à droite, et le tiroir des réglages qui monte du bas sous lui (la moitié
 * de l'écran au plus). Rien ne recouvre rien : l'état « Enregistré » vit au-dessus du site. Chaque changement
 * s'enregistre tout seul.
 */
interface Reglages {
  visible: boolean;
  masquee: boolean;
  adresse: string;
  adresseModifiable: boolean;
  couleur: string | null;
  couleurBoutons: string | null;
  photoDefaut: string | null;
  prestations: Prestation[];
  accroche: string | null;
  presentation: string | null;
  telephone: string | null;
  zone: string | null;
  horaires: string | null;
  siteWeb: string | null;
  lienGoogle: string | null;
  engagements: string[];
  creeeEn: number | null;
  certifications: string[];
  afficherAdresse: boolean;
  photosAccord: boolean;
  couvertureId: string | null;
}
interface PhotoGalerie {
  id: string;
  nom: string;
  metier: string | null;
  vignette: string;
}
interface MaPage {
  reglages: Reglages;
  profil: { nom: string; metiers: string[]; telephone: string | null; zone: string | null; adressePostale: string | null; siret: string | null; verifiee: boolean; logo: boolean };
  contenu: ContenuPage;
  photos: (PhotoEditeur & { largeur: number; hauteur: number; partage: string | null })[];
  realisations: { id: string; titre: string }[];
  choix: {
    teintes: readonly { id: string; nom: string; hex: string }[];
    couleursBoutons: readonly { id: string; nom: string; hex: string }[];
    photosDefaut: readonly PhotoGalerie[];
    certifications: readonly string[];
    engagements: readonly string[];
    theme: { nom: string; teinte: string; accroche: string; presentation: string; prestations: Prestation[] };
    limites: { accroche: number; presentation: number; photos: number; prestations: number };
    stockagePhotos: boolean;
    missions: boolean;
  };
}

type Etat = "pret" | "enregistrement" | "enregistre" | "erreur";
const CHAMPS_TEXTE = new Set<keyof Reglages>(["accroche", "presentation", "telephone", "zone", "horaires", "siteWeb", "lienGoogle", "prestations"]);

type Onglet = "couleurs" | "photos" | "prestations" | "chantiers" | "apropos" | "contact" | "publier";
const ONGLETS: { id: Onglet; libelle: string; Icone: LucideIcon }[] = [
  { id: "couleurs", libelle: "Couleurs", Icone: Palette },
  { id: "photos", libelle: "Photos", Icone: ImageIcon },
  { id: "prestations", libelle: "Prestations", Icone: Wrench },
  { id: "chantiers", libelle: "Chantiers", Icone: Hammer },
  { id: "apropos", libelle: "À propos", Icone: UserRound },
  { id: "contact", libelle: "Contact", Icone: Phone },
  { id: "publier", libelle: "Publier", Icone: Send },
];

/** La partie du site que règle chaque onglet : le téléphone y défile quand l'onglet s'ouvre. */
const CIBLE_APERCU: Record<Onglet, string> = { couleurs: ".pe-actions", photos: "haut", prestations: "#prestations", chantiers: "#realisations", apropos: "#a-propos", contact: "#contact", publier: "haut" };

/** Écran d'ordinateur (1024 px et plus) : le panneau à gauche, le site en grand à droite. */
function useOrdinateur(): boolean {
  return useSyncExternalStore(
    (rappel) => {
      const m = window.matchMedia("(min-width: 1024px)");
      m.addEventListener("change", rappel);
      return () => m.removeEventListener("change", rappel);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

/** Le message quand l'envoi de photos n'est pas ouvert sur ce site (stockage pas encore créé) : jamais un échec muet. */
const PHRASE_STOCKAGE = "L'envoi de tes propres photos n'est pas encore ouvert sur ce site. En attendant, choisis une photo dans la galerie : ton site reste beau.";

function Interrupteur({ actif, onChange, label, aide }: { actif: boolean; onChange: (v: boolean) => void; label: string; aide?: string }) {
  return (
    <button type="button" role="switch" aria-checked={actif} onClick={() => onChange(!actif)} className="pressable flex w-full items-center justify-between gap-4 rounded-2xl py-2 text-left">
      <span>
        <span className="block text-[16px] font-bold">{label}</span>
        {aide ? <span className="block text-[14px] text-muted">{aide}</span> : null}
      </span>
      <span aria-hidden="true" className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${actif ? "bg-accent" : "bg-black/25"}`}>
        <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] ${actif ? "left-7" : "left-1"}`} />
      </span>
    </button>
  );
}

function Champ({ label, valeur, onChange, placeholder, max, multi = false, type = "text", aide, inputMode }: { label: string; valeur: string; onChange: (v: string) => void; placeholder?: string; max: number; multi?: boolean; type?: string; aide?: string; inputMode?: "tel" | "url" | "numeric" }) {
  const cls = "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[16px] outline-none placeholder:text-muted focus-visible:border-accent";
  return (
    <label className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
      <span className="flex items-baseline justify-between gap-2 text-[14px] font-bold">
        {label}
        {multi || max <= 120 ? (
          <span className="text-[12px] font-normal text-muted">
            {valeur.length}/{max}
          </span>
        ) : null}
      </span>
      {multi ? <textarea rows={5} maxLength={max} value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} /> : <input type={type} inputMode={inputMode} maxLength={max} value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${cls} min-h-13`} />}
      {aide ? <span className="text-[13px] text-muted">{aide}</span> : null}
    </label>
  );
}

/** L'année de création : tapée librement, enregistrée quand elle est complète (4 chiffres, 1900 à cette année). */
function AnneeChamp({ valeur, onChange }: { valeur: number | null; onChange: (n: number | null) => void }) {
  const [texte, setTexte] = useState(valeur ? String(valeur) : "");
  return (
    <Champ
      label="Année de création"
      inputMode="numeric"
      valeur={texte}
      max={4}
      placeholder="2008"
      aide="Facultatif : « Depuis 2008 » s'affiche avec tes garanties."
      onChange={(v) => {
        const t = v.replace(/\D/g, "").slice(0, 4);
        setTexte(t);
        const n = Number(t);
        if (!t) onChange(null);
        else if (t.length === 4 && n >= 1900 && n <= new Date().getFullYear()) onChange(n);
      }}
    />
  );
}

/** Un titre de bloc dans un onglet. */
function Bloc({ titre, aide, children }: { titre: string; aide?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-label={titre}>
      <h3 className="text-[17px] font-extrabold">{titre}</h3>
      {aide ? <p className="-mt-1 text-[14px] text-muted">{aide}</p> : null}
      {children}
    </section>
  );
}

/**
 * Un VRAI bouton d'envoi de fichier (Greg, 17 novembre 2026 : « visiblement cliquable ») : plein, avec son icône. Sans
 * stockage, il reste visible mais grisé, et la raison se lit dessous.
 */
function BoutonFichier({ libelle, actif, onFichier, multiple = false }: { libelle: string; actif: boolean; onFichier: (f: File) => void | Promise<void>; multiple?: boolean }) {
  const [envoi, setEnvoi] = useState(false);
  return (
    <label className={`pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-extrabold ${actif ? "cursor-pointer bg-ink text-ground" : "cursor-not-allowed bg-black/10 text-muted"}`} aria-disabled={!actif || undefined}>
      {envoi ? <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" /> : <ImagePlus size={18} aria-hidden="true" />} {libelle}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={!actif || envoi}
        className="sr-only"
        onChange={async (e) => {
          const fichiers = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!fichiers.length) return;
          setEnvoi(true);
          try {
            for (const f of fichiers) await onFichier(f);
          } finally {
            setEnvoi(false);
          }
        }}
      />
    </label>
  );
}

/** Le site dans son cadre : il défile au doigt, il se dessine à la taille choisie (téléphone ou ordinateur). */
function CadreApercu({ contenu, ecran, hauteur = "100%", interactif = false, testid = "apercu-page", ajuste = false, cible = null }: { contenu: ContenuPage; ecran: "telephone" | "ordinateur"; hauteur?: string; interactif?: boolean; testid?: string; ajuste?: boolean; cible?: string | null }) {
  const cadre = useRef<HTMLDivElement>(null);
  const defile = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(360);
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargeur(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ordinateur = ecran === "ordinateur";
  const echelle = ordinateur ? Math.min(1, largeur / 1200) : 1;
  /** Un lien interne défile dans l'aperçu ; rien ne part. */
  const clic = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    e.preventDefault();
    const cible = a.getAttribute("href");
    if (cible?.startsWith("#") && cible.length > 1) defile.current?.querySelector(cible)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  if (ajuste) return <TelephoneEntier contenu={contenu} testid={testid} clic={clic} defile={defile} cible={cible} />;
  return (
    <div ref={cadre} className={`mx-auto w-full overflow-hidden rounded-[22px] border-[5px] border-black/85 bg-black/85 ${ordinateur ? "" : "max-w-[430px]"}`}>
      {/* Le `transform` fait du cadre le repère de la barre d'appel (position fixe) : elle reste dans l'aperçu. Le défilement
          est sur ce cadre, jamais rendu inerte : le doigt fait défiler le site (Greg, 17 novembre 2026). */}
      <div ref={defile} className="overscroll-contain overflow-y-auto bg-white" style={{ height: hauteur, transform: "translateZ(0)", WebkitOverflowScrolling: "touch" }} data-testid={testid} onClickCapture={clic}>
        {/* Ordinateur : le site se dessine sur 1200 px puis se RÉDUIT par `zoom` (Greg, 18 novembre 2026 : sur iPhone, l'aperçu
            « Ordinateur » restait blanc un long moment). Avant : `transform: scale`, qui faisait de la page entière une
            image géante que Safari met du temps à peindre ; `zoom` se dessine comme une page normale, et le défilement
            suit la vraie hauteur. */}
        <div style={ordinateur ? { width: 1200, zoom: echelle } : undefined} {...(interactif ? {} : { inert: true, "aria-hidden": true })}>
          <VuePage contenu={contenu} apercu />
        </div>
      </div>
    </div>
  );
}

/** Largeur et hauteur d'un téléphone de référence : le site s'y dessine à sa vraie taille, puis le tout est réduit. */
const TEL_L = 390;
const TEL_H = 844;

/**
 * Le téléphone EN ENTIER, de haut en bas (Greg, 18 novembre 2026) : le site se dessine sur un écran de 390 px, puis le
 * téléphone est réduit pour tenir dans la place qui reste (largeur et hauteur). Il défile au doigt comme le vrai site.
 */
function TelephoneEntier({ contenu, testid, clic, defile, cible }: { contenu: ContenuPage; testid: string; clic: (e: React.MouseEvent) => void; defile: React.RefObject<HTMLDivElement | null>; cible: string | null }) {
  const zone = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ l: 0, h: 0, pleine: 0 });
  useEffect(() => {
    const el = zone.current;
    // La hauteur « pleine » est celle du téléphone tiroir fermé : tiroir ouvert, il garde sa taille (lisible) et on voit
    // son haut au-dessus du tiroir, au lieu d'un téléphone devenu minuscule.
    const colonne = el?.closest<HTMLElement>("[data-colonne-apercu]");
    if (!el || !colonne) return;
    const mesurer = () => setPlace({ l: el.clientWidth, h: el.clientHeight, pleine: colonne.clientHeight - el.offsetTop + colonne.offsetTop });
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    ro.observe(colonne);
    return () => ro.disconnect();
  }, []);
  const bord = 6;
  // La plus grande taille qui tient en largeur ET dans la hauteur pleine, sans jamais agrandir le site.
  const echelle = place.l && place.pleine ? Math.min(1, (place.l - 2 * bord) / TEL_L, (place.pleine - 2 * bord) / TEL_H) : 0;
  const hauteurEcran = Math.min(TEL_H * echelle, Math.max(0, place.h - 2 * bord));
  // Un onglet ouvert : le téléphone défile jusqu'à la partie du site qu'il règle (les boutons pour Couleurs…).
  useEffect(() => {
    const d = defile.current;
    if (!d || !cible || !echelle) return;
    const el = cible === "haut" ? null : d.querySelector<HTMLElement>(cible);
    // La barre du haut du site reste collée en haut : on s'arrête juste sous elle.
    const barre = d.querySelector<HTMLElement>(".pe-entete")?.offsetHeight ?? 0;
    const haut = el ? (el.getBoundingClientRect().top - d.getBoundingClientRect().top) / echelle + d.scrollTop - barre - 16 : 0;
    d.scrollTo({ top: Math.max(0, haut), behavior: "smooth" });
  }, [cible, echelle, defile]);
  return (
    <div ref={zone} className="flex h-full min-h-0 w-full items-start justify-center">
      {echelle ? (
        <div className="overflow-hidden rounded-[26px] bg-black shadow-card" style={{ padding: bord, width: TEL_L * echelle + 2 * bord, height: hauteurEcran + 2 * bord }}>
          <div className="overflow-hidden rounded-[20px] bg-white" style={{ width: TEL_L * echelle, height: hauteurEcran }}>
            {/* Réduit par `zoom`, jamais par `transform` (Greg, 18 novembre 2026 : sur iPhone, la barre « Appeler » restait
                figée au milieu du petit téléphone) : Safari colle mal une barre `sticky` dans un cadre transformé. Avec
                `zoom`, la barre se colle au bas du cadre qui défile, comme sur la vraie page. */}
            <div ref={defile} data-testid={testid} onClickCapture={clic} className="overscroll-contain overflow-y-auto bg-white [scrollbar-width:none]" style={{ width: TEL_L, height: hauteurEcran / echelle, zoom: echelle, WebkitOverflowScrolling: "touch" }}>
              <div inert aria-hidden>
                <VuePage contenu={contenu} apercu />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * L'éditeur sur téléphone occupe l'écran entre l'en-tête de l'app et son menu du bas, sans défilement de la page : la
 * couche est fixe, posée là où commence la page ; une cale garde sa place dans le flux. Clavier ouvert (menu caché), elle
 * descend jusqu'en bas.
 */
function CoucheTelephone({ basse, children }: { basse: boolean; children: React.ReactNode }) {
  const cale = useRef<HTMLDivElement>(null);
  const [haut, setHaut] = useState<number | null>(null);
  useEffect(() => {
    const mesurer = () => {
      const el = cale.current;
      if (el) setHaut(Math.max(0, el.getBoundingClientRect().top + window.scrollY));
    };
    mesurer();
    // Un bandeau de l'app qui apparaît ou disparaît au-dessus déplace le début de la page.
    const ro = new ResizeObserver(mesurer);
    const main = cale.current?.closest("main");
    if (main) ro.observe(main);
    window.addEventListener("resize", mesurer);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, []);
  return (
    <>
      <div ref={cale} aria-hidden="true" style={{ height: `calc(100dvh - ${haut ?? 0}px - var(--nav-space))` }} />
      {haut === null ? null : (
        <div className="fixed left-0 right-0 z-20 flex gap-2 pr-3" style={{ top: haut, bottom: basse ? 8 : "calc(var(--nav-height) + var(--nav-gap) + 8px)" }}>
          {children}
        </div>
      )}
    </>
  );
}

function ChoixEcran({ ecran, onChange, sombre = false }: { ecran: "telephone" | "ordinateur"; onChange: (e: "telephone" | "ordinateur") => void; sombre?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Taille de l'aperçu" className={`flex gap-1 rounded-full p-1 ${sombre ? "bg-white/12" : "bg-black/10"}`}>
      {(["telephone", "ordinateur"] as const).map((e) => (
        <button key={e} type="button" role="radio" aria-checked={ecran === e} onClick={() => onChange(e)} className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${ecran === e ? "bg-surface text-ink shadow" : sombre ? "text-white" : ""}`}>
          {e === "telephone" ? <Smartphone size={15} aria-hidden="true" /> : <Monitor size={15} aria-hidden="true" />} {e === "telephone" ? "Téléphone" : "Ordinateur"}
        </button>
      ))}
    </div>
  );
}

/** Le site en plein écran : il défile, on le parcourt (menu, « Voir plus ») ; « Retour » ou Échap ramène aux réglages. */
function ApercuPlein({ contenu, onFermer }: { contenu: ContenuPage; onFermer: () => void }) {
  const [ecran, setEcran] = useState<"telephone" | "ordinateur">("telephone");
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", touche);
    return () => {
      document.body.style.overflow = avant;
      window.removeEventListener("keydown", touche);
    };
  }, [onFermer]);
  return (
    <div className="fixed top-0 left-0 z-[70] flex h-dvh w-full flex-col gap-3 bg-[#0b0b0c]/95 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur" role="dialog" aria-modal="true" aria-label="Aperçu de mon site">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onFermer} className="pressable flex min-h-11 items-center gap-1.5 rounded-full bg-white pr-4 pl-3 text-[15px] font-extrabold text-black">
          <ArrowLeft size={18} aria-hidden="true" /> Retour
        </button>
        <ChoixEcran ecran={ecran} onChange={setEcran} sombre />
      </div>
      <div className="min-h-0 flex-1">
        <CadreApercu contenu={contenu} ecran={ecran} hauteur="calc(100dvh - 90px)" interactif />
      </div>
    </div>
  );
}

/** « Enregistrement… » / « Enregistré » : au-dessus du site, jamais par-dessus un champ ou un texte. */
function Statut({ etat, erreur, compact = false }: { etat: Etat; erreur: string | null; compact?: boolean }) {
  return (
    <div className="min-w-0 flex-1" aria-live="polite">
      {erreur ? (
        <p className="text-[13px] leading-tight font-bold text-red-700 dark:text-red-300" role="alert">
          {erreur}
        </p>
      ) : etat === "enregistrement" || etat === "enregistre" ? (
        <p className="flex items-center gap-1.5 text-[13px] leading-tight text-muted" role="status">
          {etat === "enregistrement" ? <Loader2 size={14} className="shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <Check size={14} className="shrink-0 text-ok" aria-hidden="true" />}
          {etat === "enregistrement" ? "Enregistrement…" : "Enregistré : ton site est à jour."}
        </p>
      ) : compact ? null : (
        <p className="text-[13px] leading-tight text-muted">Chaque changement s&apos;enregistre tout seul.</p>
      )}
    </div>
  );
}

function Partager({ url, nom, onFermer }: { url: string; nom: string; onFermer: () => void }) {
  const [copie, setCopie] = useState(false);
  const texte = `${nom} : notre site, nos réalisations et nos coordonnées ${url}`;
  return (
    <div role="dialog" aria-modal="true" aria-label="Partager mon site" className="fixed top-0 left-0 z-[80] flex h-dvh w-full items-end justify-center bg-black/60 sm:items-center" onClick={onFermer}>
      <div className="w-full max-w-md rounded-t-[24px] bg-surface p-5 sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[20px] font-extrabold">Partager mon site</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="flex size-11 items-center justify-center rounded-full bg-black/10">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="mb-3 rounded-xl bg-black/5 px-3 py-2 text-[14px] break-all">{url}</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <Button
            onClick={async () => {
              await navigator.clipboard?.writeText(url).catch(() => undefined);
              setCopie(true);
            }}
          >
            {copie ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />} {copie ? "Lien copié" : "Copier le lien"}
          </Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener" className="pressable flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line px-4 text-[16px] font-bold">
            Envoyer sur WhatsApp
          </a>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <Button variant="secondary" onClick={() => navigator.share({ title: nom, text: texte, url }).catch(() => undefined)}>
              <Share2 size={18} aria-hidden="true" /> Autres applications
            </Button>
          ) : null}
        </div>
        <figure className="mt-4 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v1/ma-page/qr.svg" alt={`QR code de l'adresse ${url}`} width={180} height={180} className="rounded-xl bg-white p-2" />
          <figcaption className="text-[13px] text-muted">À imprimer sur un devis, un véhicule ou une carte.</figcaption>
        </figure>
      </div>
    </div>
  );
}

/** L'accord avant d'envoyer ses propres photos (droits, personnes reconnaissables). */
function AccordPhotos({ onAccord }: { onAccord: () => void }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border-2 border-line p-3 text-[14px]">
      <input
        type="checkbox"
        className="mt-0.5 size-6 shrink-0 accent-[#FED206]"
        onChange={(e) => {
          if (e.target.checked) onAccord();
        }}
      />
      <span>J&apos;ai pris ces photos ou j&apos;ai le droit de les utiliser. Les clients concernés sont d&apos;accord, et les personnes reconnaissables aussi (salariés compris). Je retire une photo dès qu&apos;on me le demande.</span>
    </label>
  );
}

/**
 * LA GALERIE DES PHOTOS PAR DÉFAUT (Greg, 17 novembre 2026) : « Selon mon métier » (elle suit le métier principal), puis
 * les photos des métiers et les photos neutres du bâtiment. Un toucher la met en couverture.
 */
function GalerieDefaut({ photos, choisie, onChoisir, metierPhoto }: { photos: readonly PhotoGalerie[]; choisie: string | null; onChoisir: (id: string | null) => void; metierPhoto: PhotoGalerie | null }) {
  const neutres = photos.filter((p) => p.metier === null);
  const metiers = photos.filter((p) => p.metier !== null);
  const vignette = (p: PhotoGalerie | null, id: string | null, libelle: string) => {
    const actif = choisie === id;
    return (
      <li key={id ?? "metier"}>
        <button type="button" role="radio" aria-checked={actif} aria-label={libelle} onClick={() => onChoisir(id)} className={`pressable grid w-full gap-1 rounded-2xl border-2 p-1 text-left ${actif ? "border-accent bg-accent/15" : "border-transparent"}`}>
          <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-black/10">
            {p ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.vignette} alt="" loading="lazy" className="size-full object-cover" />
            ) : null}
            {actif ? (
              <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-accent text-on-accent">
                <Check size={15} aria-hidden="true" />
              </span>
            ) : null}
          </span>
          <span className="px-1 pb-0.5 text-[12.5px] leading-tight font-bold text-ink">{libelle}</span>
        </button>
      </li>
    );
  };
  return (
    <div role="radiogroup" aria-label="Galerie de photos" className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">{vignette(metierPhoto, null, "Selon mon métier")}</ul>
      {neutres.length ? (
        <>
          <p className="text-[13px] font-bold text-muted">Bâtiment (tous métiers)</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">{neutres.map((p) => vignette(p, p.id, p.nom))}</ul>
        </>
      ) : null}
      <p className="text-[13px] font-bold text-muted">Par métier</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">{metiers.map((p) => vignette(p, p.id, `${LIBELLES[p.metier!] ?? p.nom}`))}</ul>
    </div>
  );
}

/** Les chantiers : un titre (« Toiture ardoise · Paimpol ») et leurs photos ; on les crée, renomme, range et retire. */
function Chantiers({ data, actif, onErreur, onChange }: { data: MaPage; actif: boolean; onErreur: (m: string | null) => void; onChange: (d?: MaPage) => void }) {
  const [titre, setTitre] = useState("");
  const total = data.photos.filter((p) => p.role === "galerie" && p.statut !== "erreur").length;
  const sansChantier = data.photos.filter((p) => p.role === "galerie" && !p.realisationId);
  const apres = async (appel: Promise<MaPage | { page: MaPage }>) => {
    try {
      const d = await appel;
      onChange("page" in d ? d.page : d);
      void rafraichirPagePublique();
    } catch (e) {
      onErreur((e as ApiError).phrase ?? "Ce changement n'a pas été enregistré.");
    }
  };
  const ordre = (i: number, pas: number) => {
    const ids = data.realisations.map((x) => x.id);
    const j = i + pas;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void apres(api<MaPage>("/v1/ma-page/realisations/ordre", { method: "PUT", body: { ids } }));
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {data.realisations.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-line p-3">
          <div className="flex items-center gap-1">
            <input
              aria-label="Titre du chantier"
              defaultValue={r.titre}
              maxLength={80}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.titre) void apres(api<MaPage>(`/v1/ma-page/realisations/${r.id}`, { method: "PATCH", body: { titre: v } }));
              }}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[16px] font-bold"
            />
            <button type="button" aria-label={`Monter « ${r.titre} »`} disabled={i === 0} onClick={() => ordre(i, -1)} className="flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30">
              <ArrowUp size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Descendre « ${r.titre} »`} disabled={i === data.realisations.length - 1} onClick={() => ordre(i, 1)} className="flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30">
              <ArrowDown size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Retirer le chantier « ${r.titre} »`}
              onClick={() => {
                if (window.confirm(`Retirer « ${r.titre} » et ses photos ?`)) void apres(api<MaPage>(`/v1/ma-page/realisations/${r.id}`, { method: "DELETE" }));
              }}
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
          <GaleriePhotos photos={data.photos} realisationId={r.id} total={total} max={data.choix.limites.photos} actif={actif} stockage={data.choix.stockagePhotos} onErreur={onErreur} onChange={() => onChange()} />
        </div>
      ))}
      {sansChantier.length ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-dashed border-line p-3">
          <span className="text-[14px] font-bold">Photos sans chantier</span>
          <GaleriePhotos photos={data.photos} realisationId={null} total={total} max={data.choix.limites.photos} actif={false} stockage={data.choix.stockagePhotos} onErreur={onErreur} onChange={() => onChange()} />
        </div>
      ) : null}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!titre.trim()) return;
          void apres(api<{ page: MaPage }>("/v1/ma-page/realisations", { method: "POST", body: { titre } })).then(() => setTitre(""));
        }}
      >
        <input aria-label="Titre du nouveau chantier" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={80} placeholder="Toiture ardoise · Paimpol" className="min-h-12 min-w-0 basis-full rounded-xl border border-line bg-surface px-3 text-[16px]" />
        <Button type="submit" variant="secondary" disabled={!titre.trim()}>
          <Plus size={18} aria-hidden="true" /> Nouveau chantier
        </Button>
      </form>
    </div>
  );
}

/** La photo « À propos » : l'artisan ou son équipe, facultative. */
function PhotoEquipe({ data, actif, onErreur, recharger }: { data: MaPage; actif: boolean; onErreur: (m: string | null) => void; recharger: () => Promise<void> }) {
  const photo = data.photos.find((p) => p.role === "equipe");
  return (
    <Bloc titre="Photo de toi ou de ton équipe" aide="Facultatif. Elle s'affiche dans « À propos ».">
      <div className="flex flex-wrap items-center gap-3">
        {photo?.variantes[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.variantes[0].webp} alt="Photo de l'équipe" className="h-20 w-28 rounded-xl object-cover" />
        ) : photo ? (
          <Loader2 size={18} className="motion-safe:animate-spin" aria-label="Préparation…" />
        ) : null}
        <BoutonFichier
          libelle={photo ? "Changer la photo" : "Ajouter une photo"}
          actif={actif}
          onFichier={async (f) => {
            const err = await envoyerPhoto(f, "equipe");
            if (err) onErreur(err);
            await recharger();
          }}
        />
        {photo ? (
          <button
            type="button"
            className="min-h-11 text-[14px] font-bold text-muted underline"
            onClick={async () => {
              await api("/v1/ma-page/equipe", { method: "DELETE" }).catch(() => undefined);
              await recharger();
              void rafraichirPagePublique();
            }}
          >
            Retirer
          </button>
        ) : null}
      </div>
      {!data.choix.stockagePhotos ? <p className="text-[13px] text-muted">L&apos;envoi de tes propres photos n&apos;est pas encore ouvert sur ce site.</p> : null}
    </Bloc>
  );
}

export function EditeurMaPage() {
  const [data, setData] = useState<MaPage | null>(null);
  const [r, setR] = useState<Reglages | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState<ApiError | null>(null);
  const [etat, setEtat] = useState<Etat>("pret");
  const [apercuPlein, setApercuPlein] = useState(false);
  const fermerApercu = useCallback(() => setApercuPlein(false), []);
  const [partage, setPartage] = useState(false);
  const [proposition, setProposition] = useState<{ accroche: string; presentation: string; source: string; phrase: string | null } | null>(null);
  const [aide, setAide] = useState(false);
  const [nouvelleAdresse, setNouvelleAdresse] = useState<string | null>(null);
  const [versionLogo, setVersionLogo] = useState(0);
  const [galerie, setGalerie] = useState(false);
  const [ecran, setEcran] = useState<"telephone" | "ordinateur">("ordinateur");
  // Téléphone : aucun onglet ouvert au départ (le site en grand) ; ordinateur : « Couleurs ».
  const [onglet, setOnglet] = useState<Onglet | null>(null);
  const ordinateur = useOrdinateur();
  const typing = useTyping();
  const enAttente = useRef<Partial<Reglages>>({});
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charger = useCallback(async () => {
    try {
      const d = await api<MaPage>("/v1/ma-page");
      setData(d);
      setChargement(null);
    } catch (e) {
      setChargement(e instanceof ApiError ? e : new ApiError("network", 0));
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    api<MaPage>("/v1/ma-page", { signal: c.signal }).then(
      (d) => {
        setData(d);
        setR(d.reglages);
      },
      (e: unknown) => {
        if (!c.signal.aborted) setChargement(e instanceof ApiError ? e : new ApiError("network", 0));
      },
    );
    return () => c.abort();
  }, []);

  // Une photo en préparation (serveur) : on relit jusqu'à ce qu'elle soit prête.
  const enPreparation = data?.photos.some((p) => p.statut === "traitement") ?? false;
  useEffect(() => {
    if (!enPreparation) return;
    const t = setInterval(() => void charger(), 1500);
    return () => clearInterval(t);
  }, [enPreparation, charger]);

  const enregistrer = useCallback(async () => {
    const corps = enAttente.current;
    enAttente.current = {};
    if (!Object.keys(corps).length) return;
    setEtat("enregistrement");
    try {
      const d = await api<MaPage>("/v1/ma-page", { method: "PATCH", body: corps });
      setData(d);
      // Les valeurs nettoyées par le serveur (site web, téléphone) reviennent, sauf un champ qu'on est en train de taper.
      setR((avant) => (avant ? ({ ...d.reglages, ...Object.fromEntries(Object.keys(avant).filter((k) => CHAMPS_TEXTE.has(k as keyof Reglages) && k in enAttente.current).map((k) => [k, avant[k as keyof Reglages]])) } as Reglages) : d.reglages));
      // « Enregistré : ton site est à jour » seulement quand la page publique est régénérée.
      await rafraichirPagePublique();
      if (!Object.keys(enAttente.current).length) setEtat("enregistre");
      setErreur(null);
    } catch (e) {
      setEtat("erreur");
      setErreur((e as ApiError).phrase ?? "Ce changement n'a pas été enregistré. Réessaie.");
    }
  }, []);

  const changer = useCallback(
    <K extends keyof Reglages>(cle: K, valeur: Reglages[K]) => {
      setR((avant) => (avant ? { ...avant, [cle]: valeur } : avant));
      enAttente.current = { ...enAttente.current, [cle]: valeur };
      setEtat("enregistrement");
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => void enregistrer(), CHAMPS_TEXTE.has(cle) ? 700 : 50);
    },
    [enregistrer],
  );

  const couverture = data?.photos.find((p) => p.role === "couverture" && p.id === data.reglages.couvertureId) ?? null;

  // L'aperçu se dessine avec ce qui est à l'écran, à chaque toucher (une couleur change : le site change aussitôt).
  const contenu = useMemo<ContenuPage | null>(() => {
    if (!data || !r) return null;
    const vide = (s: string | null) => (s?.trim() ? s.trim() : null);
    const defaut = photoDefautDe(r.photoDefaut, data.contenu.metiers);
    return {
      ...data.contenu,
      couleur: r.couleur,
      couleurBoutons: r.couleurBoutons,
      photoDefaut: defaut ? photoPubliqueDefaut(defaut) : null,
      creditPhoto: !data.contenu.couverture && defaut ? defaut.credit : null,
      prestations: r.prestations.filter((x) => x.titre.trim()),
      accroche: vide(r.accroche),
      presentation: vide(r.presentation),
      telephone: vide(r.telephone) ?? data.profil.telephone,
      zone: vide(r.zone) ?? data.profil.zone,
      horaires: vide(r.horaires),
      siteWeb: vide(r.siteWeb),
      // L'aperçu ne montre le bouton que pour un lien que le serveur acceptera.
      lienGoogle: lienGooglePropre(r.lienGoogle),
      engagements: r.engagements,
      creeeEn: r.creeeEn,
      certifications: r.certifications,
      adressePostale: r.afficherAdresse ? data.profil.adressePostale : null,
      // La page privée n'a pas de logo public : l'aperçu lit celui du compte.
      logo: data.profil.logo ? `/v1/company/logo?v=${versionLogo}` : null,
    };
  }, [data, r, versionLogo]);

  const ouvrir = (o: Onglet) => {
    // Téléphone : toucher l'onglet ouvert referme le tiroir.
    setOnglet((avant) => (!ordinateur && avant === o ? null : o));
    setGalerie(false);
  };

  if (chargement && !data) return <p className="text-[15px] text-muted">Ton site ne s&apos;est pas chargé. Vérifie ta connexion et réessaie.</p>;
  if (!data || !r || !contenu) return <Skeleton lines={6} label="Chargement de ton site…" />;

  const url = `${window.location.origin}/e/${r.adresse}`;
  const theme = data.choix.theme;
  const couleurActive = r.couleur ?? null;
  const teinteMetier = data.choix.teintes.find((x) => x.id === theme.teinte)!;
  const couvertureEnCours = data.photos.some((p) => p.role === "couverture" && p.statut === "traitement");
  const actif = ordinateur ? (onglet ?? "couleurs") : onglet;
  const photosOk = data.choix.stockagePhotos && data.reglages.photosAccord;
  const photoMetier = (() => {
    const p = photoDefautDe(null, data.contenu.metiers);
    return p ? (data.choix.photosDefaut.find((x) => x.id === p.id) ?? null) : null;
  })();
  const photoEnCouverture = couverture?.variantes[1]?.webp ?? couverture?.variantes[0]?.webp ?? (contenu.photoDefaut ? contenu.photoDefaut.variantes[0]!.webp : null);
  const accord = async () => {
    const d = await api<MaPage>("/v1/ma-page/accord-photos", { method: "POST" }).catch(() => null);
    if (d) setData(d);
    else setErreur("Ton accord n'a pas été enregistré. Réessaie.");
  };
  const choisirPhotoDefaut = async (id: string | null) => {
    // Choisir dans la galerie remplace la couverture envoyée : la photo de la galerie prend sa place.
    if (couverture) {
      const d = await api<MaPage>("/v1/ma-page/couverture", { method: "DELETE" }).catch(() => null);
      if (d) setData(d);
    }
    changer("photoDefaut", id);
  };

  const panneaux: Record<Onglet, React.ReactNode> = {
    couleurs: (
      <>
        <Bloc titre="Couleur des boutons" aide="« Appeler », « Demander un devis », les petits traits et la ville du titre.">
          <div role="radiogroup" aria-label="Couleur des boutons" className="grid grid-cols-3 gap-2">
            {data.choix.couleursBoutons.map((c, i) => {
              // Le jaune Mobiiz est la valeur par défaut : choisi, rien n'est enregistré (null).
              const choisi = (r.couleurBoutons?.toLowerCase() ?? "#fed206") === c.hex.toLowerCase();
              return (
                <button key={c.id} type="button" role="radio" aria-checked={choisi} aria-label={c.nom} onClick={() => changer("couleurBoutons", i === 0 ? null : c.hex)} className={`pressable grid justify-items-center gap-1.5 rounded-2xl border-2 px-1 py-2.5 text-[12.5px] font-bold ${choisi ? "border-accent bg-accent/15" : "border-line"}`}>
                  {/* Un vrai petit bouton, dans sa couleur. */}
                  <span className="flex h-8 w-full max-w-[84px] items-center justify-center rounded-full text-[11px] font-extrabold" style={{ background: c.hex, color: texteSurCouleur(c.hex) }} aria-hidden="true">
                    Appeler
                  </span>
                  <span className="text-center leading-tight">{c.nom}</span>
                </button>
              );
            })}
          </div>
        </Bloc>
        <Bloc titre="Teinte" aide="La couleur des fonds sombres : le contact, ton logo, l'accueil sans photo.">
          <div role="radiogroup" aria-label="Teinte de la page" className="grid grid-cols-2 gap-2">
            {[{ id: "metier", nom: "Selon le métier", hex: teinteMetier.hex, valeur: null as string | null }, ...data.choix.teintes.map((c) => ({ ...c, valeur: c.hex as string | null }))].map((c) => {
              const choisi = couleurActive === c.valeur;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={choisi} onClick={() => changer("couleur", c.valeur)} className={`pressable flex min-h-14 items-center gap-2.5 rounded-2xl border-2 p-2 pr-3 text-left text-[14px] font-bold ${choisi ? "border-accent bg-accent/15" : "border-line"}`}>
                  {/* La pastille montre le rendu : la teinte et la couleur des boutons. */}
                  <span className="relative grid size-10 shrink-0 place-items-end overflow-hidden rounded-xl p-1.5" style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${c.hex} 85%, white 10%), ${c.hex} 70%)` }} aria-hidden="true">
                    <span className="h-1.5 w-4 rounded-full" style={{ background: r.couleurBoutons ?? "#FED206" }} />
                  </span>
                  <span className="min-w-0">{c.nom}</span>
                  {choisi ? <Check size={16} className="ml-auto shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </Bloc>
      </>
    ),
    photos: (
      <>
        <Bloc titre="Photo de couverture" aide="La grande photo en haut de ton site. Sans photo à toi, une belle photo de ton métier s'affiche.">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-black/5">
            {photoEnCouverture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoEnCouverture} alt="Photo de couverture" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center p-4 text-center text-[13px] text-muted">{couvertureEnCours ? "Préparation de la photo…" : "Pas encore de photo."}</span>
            )}
            {couvertureEnCours ? <Loader2 size={20} className="absolute top-3 right-3 motion-safe:animate-spin" aria-hidden="true" /> : null}
            <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2.5 py-1 text-[12px] font-bold text-white">{couverture ? "Ta photo" : "Photo de la galerie"}</span>
          </div>
          {data.choix.stockagePhotos && !data.reglages.photosAccord ? <AccordPhotos onAccord={() => void accord()} /> : null}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
            <BoutonFichier
              libelle={couverture ? "Changer ma photo" : "Ajouter une photo"}
              actif={photosOk}
              onFichier={async (f) => {
                setErreur(null);
                const err = await envoyerPhoto(f, "couverture");
                if (err) setErreur(err);
                await charger();
              }}
            />
            <button type="button" onClick={() => setGalerie((v) => !v)} aria-expanded={galerie} className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-ink/80 px-4 text-[15px] font-extrabold">
              <Images size={18} aria-hidden="true" /> Choisir dans la galerie <ChevronDown size={16} aria-hidden="true" className={galerie ? "rotate-180" : ""} />
            </button>
          </div>
          {!data.choix.stockagePhotos ? <p className="rounded-xl border border-accent/60 bg-surface px-3 py-2 text-[13.5px] font-semibold text-ink">{PHRASE_STOCKAGE}</p> : data.choix.stockagePhotos && !data.reglages.photosAccord ? <p className="text-[13px] text-muted">Coche la case ci-dessus pour envoyer tes photos.</p> : null}
          {galerie ? <GalerieDefaut photos={data.choix.photosDefaut} choisie={couverture ? "__aucune__" : r.photoDefaut} metierPhoto={photoMetier} onChoisir={(id) => void choisirPhotoDefaut(id)} /> : null}
          {couverture ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1 justify-self-start text-[14px] font-bold text-muted underline"
              onClick={async () => {
                const d = await api<MaPage>("/v1/ma-page/couverture", { method: "DELETE" }).catch(() => null);
                if (d) {
                  setData(d);
                  void rafraichirPagePublique();
                }
              }}
            >
              <Trash2 size={14} aria-hidden="true" /> Retirer ma photo (la galerie reprend sa place)
            </button>
          ) : null}
        </Bloc>
        <Bloc titre="Logo" aide="Le même que sur tes demandes de prix. Sans logo, tes initiales s'affichent.">
          <div className="flex flex-wrap items-center gap-3">
            {data.profil.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/v1/company/logo?v=${versionLogo}`} alt="Logo actuel" className="size-16 rounded-xl border border-line bg-white object-contain" />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-xl bg-[#1b2229] text-[18px] font-extrabold text-accent" aria-label="Sans logo : tes initiales">
                {initiales(data.profil.nom)}
              </span>
            )}
            <BoutonFichier
              libelle={data.profil.logo ? "Changer le logo" : "Ajouter un logo"}
              actif
              onFichier={async (f) => {
                try {
                  const { reduireImage } = await import("@/lib/reduire-image");
                  const blob = await reduireImage(f, 512, 0.9);
                  if (blob.size > 500_000) throw new Error("Logo trop lourd (500 Ko au plus).");
                  const form = new FormData();
                  form.append("file", blob, "logo.jpg");
                  await api("/v1/company/logo", { method: "PUT", body: form });
                  setVersionLogo((v) => v + 1);
                  setErreur(null);
                  await charger();
                  void rafraichirPagePublique();
                } catch (err) {
                  setErreur((err as ApiError).phrase ?? (err as Error).message ?? "Le logo n'a pas été enregistré.");
                }
              }}
            />
            {data.profil.logo ? (
              <button
                type="button"
                className="min-h-11 text-[14px] font-bold text-muted underline"
                onClick={async () => {
                  if (!window.confirm("Retirer le logo ? Il disparaît aussi de tes demandes de prix.")) return;
                  await api("/v1/company/logo", { method: "DELETE" }).catch(() => undefined);
                  await charger();
                  void rafraichirPagePublique();
                }}
              >
                Retirer le logo
              </button>
            ) : null}
          </div>
        </Bloc>
      </>
    ),
    prestations: (
      <Bloc titre="Prestations" aide={`Ce que tu fais, en quelques blocs : un titre et une phrase. ${data.choix.limites.prestations} au plus.`}>
        {r.prestations.map((x, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-2xl bg-black/5 p-3">
            <div className="flex items-center gap-2">
              <input
                aria-label={`Titre de la prestation ${i + 1}`}
                value={x.titre}
                maxLength={60}
                placeholder="Couverture ardoise"
                onChange={(e) => changer("prestations", r.prestations.map((y, k) => (k === i ? { ...y, titre: e.target.value } : y)))}
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[16px] font-bold"
              />
              <button type="button" aria-label={`Retirer la prestation ${x.titre || i + 1}`} onClick={() => changer("prestations", r.prestations.filter((_, k) => k !== i))} className="flex size-11 shrink-0 items-center justify-center rounded-full">
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
            <textarea
              aria-label={`Phrase de la prestation ${i + 1}`}
              value={x.texte}
              maxLength={200}
              rows={2}
              placeholder="Une phrase pour dire ce que tu fais."
              onChange={(e) => changer("prestations", r.prestations.map((y, k) => (k === i ? { ...y, texte: e.target.value } : y)))}
              className="w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-[15px]"
            />
          </div>
        ))}
        {r.prestations.length < data.choix.limites.prestations ? (
          <div className="flex flex-wrap gap-2">
            {theme.prestations
              .filter((x) => !r.prestations.some((y) => y.titre === x.titre))
              .map((x) => (
                <button key={x.titre} type="button" onClick={() => changer("prestations", [...r.prestations, x])} className="pressable inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-line px-3 text-[14px] font-bold">
                  <Plus size={16} aria-hidden="true" /> {x.titre}
                </button>
              ))}
            <button type="button" onClick={() => changer("prestations", [...r.prestations, { titre: "", texte: "" }])} className="pressable inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-line px-3 text-[14px] font-bold">
              <Plus size={16} aria-hidden="true" /> Autre prestation
            </button>
          </div>
        ) : null}
      </Bloc>
    ),
    chantiers: (
      <Bloc titre="Mes chantiers" aide="Un chantier = un titre et quelques photos. Sur ton site, la première photo s'affiche en grand ; on la touche pour voir les autres.">
        <p className="rounded-xl bg-accent/15 px-3 py-2 text-[13px]">
          Mets seulement tes propres photos de chantiers. Avant de publier une photo prise chez un client, demande-lui son accord ; évite les personnes reconnaissables, les plaques d&apos;immatriculation, les numéros de rue et les intérieurs qui permettent de situer un domicile.
        </p>
        {!data.choix.stockagePhotos ? <p className="rounded-xl bg-black/5 px-3 py-2 text-[13px]">L&apos;envoi de tes propres photos n&apos;est pas encore ouvert sur ce site. Tes chantiers s&apos;afficheront dès qu&apos;il le sera.</p> : null}
        {data.choix.stockagePhotos && !data.reglages.photosAccord ? <AccordPhotos onAccord={() => void accord()} /> : null}
        <Chantiers data={data} actif={photosOk} onErreur={setErreur} onChange={(d) => (d ? setData(d) : void charger())} />
      </Bloc>
    ),
    apropos: (
      <>
        <Bloc titre="Tes textes">
          <Champ label="Accroche" valeur={r.accroche ?? ""} onChange={(v) => changer("accroche", v || null)} max={data.choix.limites.accroche} placeholder={theme.accroche.replace("{zone}", contenu.zone ? ` à ${contenu.zone}` : "")} aide="Une phrase sous ton nom. Vide : ton métier et ta ville." />
          <Champ label="Présentation" multi valeur={r.presentation ?? ""} onChange={(v) => changer("presentation", v || null)} max={data.choix.limites.presentation} placeholder={theme.presentation} aide="Ta première phrase s'affiche dans une carte sous tes prestations, la suite dans « À propos »." />
          <Button
            variant="secondary"
            pending={aide}
            onClick={async () => {
              setAide(true);
              try {
                setProposition(await api("/v1/ma-page/aide-ecriture", { method: "POST", body: { accroche: r.accroche, presentation: r.presentation } }));
              } catch (e) {
                setErreur((e as ApiError).phrase ?? "Mobiiz n'a pas pu écrire pour l'instant.");
              } finally {
                setAide(false);
              }
            }}
          >
            <Sparkles size={18} aria-hidden="true" /> Mobiiz m&apos;aide à l&apos;écrire
          </Button>
          <p className="text-[13px] text-muted">Relis la proposition : n&apos;écris rien que tu ne peux pas prouver.</p>
          {proposition ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-2xl border-2 border-accent p-3" data-testid="proposition">
              <p className="text-[13px] text-muted">{proposition.phrase ?? (proposition.source === "ia" ? "Proposition de Mobiiz (compte comme une analyse). Modifie-la à ta guise." : "Proposition tirée de ton profil. Modifie-la à ta guise.")}</p>
              <p className="font-bold">{proposition.accroche}</p>
              <p className="text-[15px] whitespace-pre-line">{proposition.presentation}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    changer("accroche", proposition.accroche);
                    changer("presentation", proposition.presentation);
                    setProposition(null);
                  }}
                >
                  Utiliser ces textes
                </Button>
                <Button variant="secondary" onClick={() => setProposition(null)}>
                  Garder les miens
                </Button>
              </div>
            </div>
          ) : null}
        </Bloc>
        <PhotoEquipe data={data} actif={photosOk} onErreur={setErreur} recharger={charger} />
        <Bloc titre="Tes garanties">
          <span className="text-[14px] font-bold">Tes engagements</span>
          <div className="flex flex-wrap gap-2">
            {data.choix.engagements.map((c) => {
              const coche = r.engagements.includes(c);
              return (
                <button key={c} type="button" aria-pressed={coche} onClick={() => changer("engagements", coche ? r.engagements.filter((x) => x !== c) : [...r.engagements, c])} className={`pressable min-h-11 rounded-full border-2 px-3 text-[14px] font-bold ${coche ? "border-accent bg-accent/20" : "border-line"}`}>
                  {coche ? "✓ " : ""}
                  {c}
                </button>
              );
            })}
          </div>
          <span className="text-[13px] text-muted">Coche seulement ce que tu fais vraiment : ils s&apos;affichent en haut de ton site.</span>
          <AnneeChamp valeur={r.creeeEn} onChange={(n) => changer("creeeEn", n)} />
          <span className="text-[14px] font-bold">Certifications et assurances</span>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...data.choix.certifications, ...r.certifications])].map((c) => {
              const coche = r.certifications.includes(c);
              return (
                <button key={c} type="button" aria-pressed={coche} onClick={() => changer("certifications", coche ? r.certifications.filter((x) => x !== c) : [...r.certifications, c].slice(0, 10))} className={`pressable min-h-11 rounded-full border-2 px-3 text-[14px] font-bold ${coche ? "border-accent bg-accent/20" : "border-line"}`}>
                  {coche ? "✓ " : ""}
                  {c}
                </button>
              );
            })}
          </div>
          <input
            placeholder="Autre (ex. : Handibat), puis Entrée"
            aria-label="Autre certification"
            maxLength={60}
            className="min-h-12 rounded-xl border border-line bg-surface px-4 text-[16px]"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const v = e.currentTarget.value.trim();
              if (v && !r.certifications.includes(v)) changer("certifications", [...r.certifications, v].slice(0, 10));
              e.currentTarget.value = "";
            }}
          />
          <span className="text-[13px] text-muted">Seulement ce que tu as vraiment, à jour : tu en es responsable. « Entreprise vérifiée » s&apos;ajoute tout seul quand ton SIRET est vérifié{data.profil.verifiee ? " (c'est le cas)" : ""}.</span>
        </Bloc>
      </>
    ),
    contact: (
      <Bloc titre="Coordonnées">
        <div className="rounded-2xl bg-black/5 p-3 text-[14px]">
          <p>
            <span className="font-bold">{data.profil.nom}</span> · {data.profil.metiers.map((m) => LIBELLES[m] ?? m).join(", ") || "métier à choisir"}
          </p>
          <p className="text-muted">
            Repris de ton profil et synchronisés. <Link href="/compte/entreprise" className="font-bold underline">Modifier dans Mon entreprise</Link>
          </p>
        </div>
        <Champ label="Téléphone" type="tel" inputMode="tel" valeur={r.telephone ?? ""} onChange={(v) => changer("telephone", v || null)} max={25} placeholder={data.profil.telephone ?? "06 12 34 56 78"} aide={data.profil.telephone ? "Vide : celui de ton profil, mis à jour tout seul." : "Le bouton « Appeler » apparaît avec un numéro."} />
        <Champ label="Zone d'intervention" valeur={r.zone ?? ""} onChange={(v) => changer("zone", v || null)} max={120} placeholder={data.profil.zone ?? "Lannion, Perros-Guirec, Trégor"} aide={data.profil.zone ? `Vide : ${data.profil.zone}, d'après ton profil.` : undefined} />
        <Champ label="Horaires" valeur={r.horaires ?? ""} onChange={(v) => changer("horaires", v || null)} max={200} placeholder="Du lundi au vendredi, 8 h – 18 h" />
        <Champ label="Lien de ma fiche Google" type="url" inputMode="url" valeur={r.lienGoogle ?? ""} onChange={(v) => changer("lienGoogle", v || null)} max={500} placeholder="https://maps.app.goo.gl/…" aide="Dans Google Maps, ouvre ta fiche, touche « Partager » et colle le lien ici : un bouton « Voir nos avis Google » apparaît sur ton site." />
        <Champ label="Ton autre site internet" type="url" inputMode="url" valeur={r.siteWeb ?? ""} onChange={(v) => changer("siteWeb", v || null)} max={200} placeholder="www.mon-entreprise.fr" aide="Si tu en as déjà un : un lien « Voir mon site » apparaît en bas de ton site Mobiiz." />
        {data.profil.adressePostale ? <Interrupteur actif={r.afficherAdresse} onChange={(v) => changer("afficherAdresse", v)} label="Afficher mon adresse" aide={`${data.profil.adressePostale}. Désactivé : seule ta zone s'affiche.`} /> : null}
        <p className="text-[13px] text-muted">« Demander un devis » : le message du client t&apos;arrive par e-mail et dans « Messages et réponses ». Ton e-mail n&apos;est jamais montré.</p>
      </Bloc>
    ),
    publier: (
      <>
        <Bloc titre="Mettre en ligne">
          <div id="visibilite" data-testid="visibilite" className="grid grid-cols-[minmax(0,1fr)] gap-3">
            <Interrupteur actif={r.visible} onChange={(v) => changer("visible", v)} label="Page visible" aide={r.visible ? "En ligne : tout le monde peut voir ton site avec le lien." : "Privé : personne ne le voit pour l'instant."} />
            {r.masquee ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[14px] font-bold text-red-700 dark:text-red-300">Ton site a été masqué par l&apos;équipe Mobiiz après un signalement. Écris-nous à contact@mobiiz.fr.</p> : null}
            <p className="text-[14px] break-all">
              <span className="text-muted">Adresse : </span>
              <span className="font-bold">{url.replace(/^https?:\/\//, "")}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {r.visible && !r.masquee ? (
                <a href={`/e/${r.adresse}?depuis=mon-site`} className="pressable inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-line px-4 font-bold">
                  <ExternalLink size={18} aria-hidden="true" /> Ouvrir en ligne
                </a>
              ) : null}
              <Button variant="secondary" onClick={() => setPartage(true)} disabled={!r.visible}>
                <Share2 size={18} aria-hidden="true" /> Partager
              </Button>
            </div>
            {!r.visible ? <p className="text-[13px] text-muted">Rends ton site visible pour le partager.</p> : null}
          </div>
        </Bloc>
        <Bloc titre="Adresse du site">
          {r.adresseModifiable ? (
            nouvelleAdresse === null ? (
              <Button variant="secondary" onClick={() => setNouvelleAdresse(r.adresse)}>
                Modifier l&apos;adresse (une seule fois)
              </Button>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                <label className="grid grid-cols-[minmax(0,1fr)] gap-1 text-[14px] font-bold">
                  Nouvelle adresse
                  <span className="flex items-center rounded-xl border border-line bg-surface px-3">
                    <span className="text-muted">/e/</span>
                    <input value={nouvelleAdresse} maxLength={50} onChange={(e) => setNouvelleAdresse(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="min-h-12 min-w-0 flex-1 bg-transparent px-1 text-[16px] outline-none" />
                  </span>
                </label>
                <p className="text-[13px] text-muted">Tu ne pourras plus la changer ensuite. L&apos;ancienne adresse continuera de mener à ton site.</p>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const d = await api<MaPage>("/v1/ma-page/adresse", { method: "PUT", body: { adresse: nouvelleAdresse } });
                        setData(d);
                        setR(d.reglages);
                        setNouvelleAdresse(null);
                        void rafraichirPagePublique();
                      } catch (e) {
                        setErreur((e as ApiError).phrase ?? "Cette adresse n'est pas possible.");
                      }
                    }}
                  >
                    Valider
                  </Button>
                  <Button variant="secondary" onClick={() => setNouvelleAdresse(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )
          ) : (
            <p className="text-[13px] text-muted">Adresse déjà modifiée une fois.</p>
          )}
        </Bloc>
      </>
    ),
  };

  const libelleActif = ONGLETS.find((o) => o.id === actif)?.libelle ?? "";
  const barreOnglets = (
    <div role="tablist" aria-label="Réglages du site" aria-orientation={ordinateur ? "horizontal" : "vertical"} className={ordinateur ? "grid grid-cols-4 gap-1.5" : "flex h-full flex-col gap-0.5"}>
      {ONGLETS.map(({ id, libelle, Icone }) => {
        const choisi = actif === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={choisi}
            aria-controls="reglages-site"
            onClick={() => ouvrir(id)}
            className={
              ordinateur
                ? `pressable flex min-h-15 flex-col items-center justify-center gap-1 rounded-2xl text-[12.5px] font-bold ${choisi ? "bg-ink text-ground" : "bg-black/5 hover:bg-black/10"}`
                : // Téléphone (Greg, 18 novembre 2026) : une colonne collée à gauche ; l'onglet ouvert en noir, un trait jaune au bord.
                  `pressable relative flex max-h-[76px] min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] leading-none font-bold whitespace-nowrap ${choisi ? "bg-ink text-ground before:absolute before:inset-y-2 before:-left-1 before:w-1 before:rounded-r-full before:bg-accent" : "text-muted"}`
            }
          >
            <Icone size={ordinateur ? 19 : 21} aria-hidden="true" strokeWidth={choisi ? 2.4 : 2} />
            {libelle}
          </button>
        );
      })}
    </div>
  );
  const reglages = actif ? (
    ordinateur ? (
      <section id="reglages-site" role="tabpanel" aria-label={libelleActif} className="grid grid-cols-[minmax(0,1fr)] gap-6">
        {panneaux[actif]}
      </section>
    ) : (
      // Téléphone (Greg, 18 novembre 2026) : un tiroir qui monte du bas, la moitié de l'écran au plus ; le téléphone reste
      // visible au-dessus, en entier, et change en direct. Il ne recouvre rien : il prend sa place sous l'aperçu.
      <section key={actif} id="reglages-site" role="tabpanel" aria-label={libelleActif} className="flex max-h-[50dvh] min-h-0 shrink-0 animate-rise flex-col overflow-hidden rounded-[22px] bg-surface shadow-float ring-1 ring-ink/5">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line py-1.5 pr-1.5 pl-4">
          <h2 className="text-[17px] font-extrabold">{libelleActif}</h2>
          <button type="button" onClick={() => setOnglet(null)} aria-label={`Fermer les réglages ${libelleActif}`} className="pressable flex min-h-11 items-center gap-1 rounded-full bg-black/5 px-3 text-[14px] font-bold">
            <ChevronDown size={18} aria-hidden="true" /> Fermer
          </button>
        </div>
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-6 overflow-y-auto overscroll-contain px-3 pt-3 pb-4">{panneaux[actif]}</div>
      </section>
    )
  ) : null;

  return (
    <>
      {ordinateur ? (
        <div className="grid grid-cols-[minmax(340px,27%)_minmax(0,1fr)] items-start gap-6">
          <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" aria-label="Réglages">
            <div>
              <h1 className="font-display text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Mon site</h1>
              <p className="text-[14px] text-muted">Un vrai site pour ton entreprise. Touche un onglet, ton site change à droite.</p>
            </div>
            {barreOnglets}
            {reglages}
          </aside>
          <section className="sticky top-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2" aria-label="Aperçu de mon site">
            <div className="flex min-h-11 items-center gap-3">
              <Statut etat={etat} erreur={erreur} />
              <ChoixEcran ecran={ecran} onChange={setEcran} />
              <button type="button" onClick={() => setApercuPlein(true)} className="pressable flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-[14px] font-extrabold text-on-accent">
                <Maximize2 size={16} aria-hidden="true" /> Voir mon site
              </button>
            </div>
            <CadreApercu contenu={contenu} ecran={ecran} hauteur="calc(100dvh - 6.5rem)" />
          </section>
        </div>
      ) : (
        <CoucheTelephone basse={typing}>
          {/* Une colonne d'onglets collée à gauche, qui fait un L avec le menu de l'app ; à droite, le téléphone en entier ; le
              tiroir des réglages sous lui. Rien ne recouvre rien (Greg, 18 novembre 2026). */}
          <nav aria-label="Onglets des réglages" className="w-[66px] shrink-0 rounded-r-[20px] bg-surface p-1 shadow-card ring-1 ring-ink/5">
            {barreOnglets}
          </nav>
          {/* Le ＋ de la barre du bas dépasse au milieu : la colonne de droite s'arrête au-dessus de lui. */}
          <div data-colonne-apercu className="flex min-w-0 flex-1 flex-col gap-2 pb-6">
            <h1 className="sr-only">Mon site</h1>
            <section className="flex min-h-0 flex-1 flex-col gap-1.5" aria-label="Aperçu de mon site">
              {/* Une seule ligne : l'état (ou « le rendre visible ») à gauche, « Voir mon site » en petit à droite. */}
              <div className="flex min-h-8 shrink-0 items-center gap-2">
                {etat === "pret" && !erreur && !r.visible && actif !== "publier" ? (
                  <button type="button" onClick={() => ouvrir("publier")} className="min-w-0 flex-1 text-left text-[12.5px] leading-tight font-bold underline">
                    Site privé : le rendre visible
                  </button>
                ) : (
                  <Statut etat={etat} erreur={erreur} compact />
                )}
                <button type="button" onClick={() => setApercuPlein(true)} className="pressable flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 text-[12.5px] font-extrabold text-on-accent">
                  <Eye size={14} aria-hidden="true" /> Voir mon site
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <CadreApercu contenu={contenu} ecran="telephone" ajuste cible={actif ? CIBLE_APERCU[actif] : null} />
              </div>
            </section>
            {reglages}
          </div>
        </CoucheTelephone>
      )}
      {apercuPlein ? <ApercuPlein contenu={contenu} onFermer={fermerApercu} /> : null}
      {partage ? <Partager url={url} nom={data.profil.nom} onFermer={() => setPartage(false)} /> : null}
    </>
  );
}
