"use client";

import { Check, Plus, ChevronRight, Package, Search, Sparkles, Timer, Users, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CARTE, LigneZone, ligneRegroupement } from "@/components/ag-v1-commun";
import { PageTitle, Skeleton } from "@/components/ui";
import { CarteAction } from "@/components/ux-kit";
import { api } from "@/lib/api";
import { FILTRES_V1, libelleLot, lotPrincipal, SIGNATURE, zoneLisible, type AchatV1, type BesoinV1, type EtatV1 } from "@/lib/ag-v1";
import { useResource } from "@/lib/use-resource";

/**
 * Le lien de « Rejoindre » d'un achat : le parcours direct prérempli avec SON produit exact. `achat` verrouille le produit
 * (Greg, 8 novembre 2026 : « je dois pouvoir ajouter des choses mais pas les modifier si c'étaient de vraies demandes
 * d'autres artisans ») : on ajoute sa quantité, on ne change jamais le produit des autres.
 */
export const lienAchat = (a: AchatV1) => `/achats-groupes/nouveau?type=${encodeURIComponent(a.type)}&${Object.entries(a.attributs).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}&reception=${a.reception}&achat=${encodeURIComponent(a.id)}`;

/** Greg, 8 novembre 2026 (« mets que quelques exemples, là c'est trop ») : les 5 qui se terminent le plus tôt d'abord. */
export const ACHATS_VISIBLES = 5;

/** Le temps qui reste avant la fin des inscriptions (« Se termine dans 21 jours »). */
export function finDans(ouvertJusquau: string, maintenant = new Date()): string {
  const fin = new Date(ouvertJusquau.length === 10 ? `${ouvertJusquau}T23:59:59` : ouvertJusquau);
  const jours = Math.ceil((fin.getTime() - maintenant.getTime()) / 86_400_000);
  if (jours <= 0) return "Se termine aujourd'hui";
  if (jours === 1) return "Se termine demain";
  return `Se termine dans ${jours} jours`;
}

/** « clôture dans 5 jours » : la fin des inscriptions, dans la phrase d'une carte (Greg, 18 novembre 2026). */
export function clotureDans(ouvertJusquau: string, maintenant = new Date()): string {
  return finDans(ouvertJusquau, maintenant).replace(/^Se termine/, "clôture");
}

/**
 * L'ACCUEIL DES ACHATS GROUPÉS (V5.2, écran 1 ; RÈGLE CHANGÉE, Greg, 8 novembre 2026, capture : « des filtres mais pas plein
 * de boutons… les vignettes beaucoup trop grosses… uniquement le nom du produit avec une sorte de chronomètre… un bouton
 * flottant ») : « Mes besoins groupés » et le département en une ligne, UN filtre (« Métier »), la liste des achats ouverts
 * réduite au nom du produit et au temps qui reste, et le bouton flottant « Ajouter un matériau » (Mobiiz, ou depuis un
 * quantitatif).
 */
export function AccueilAchatsGroupesV1({ etat }: { etat: EtatV1 }) {
  const [lot, setLot] = useState<string>("");
  const [choix, setChoix] = useState(false);
  const [tout, setTout] = useState(false);
  const [cherche, setCherche] = useState("");
  const fetcher = useCallback((s: AbortSignal) => api<{ achats: AchatV1[] }>(`/v1/ag/achats${lot ? `?lot=${lot}` : ""}`, { signal: s }), [lot]);
  const { data } = useResource(fetcher);
  const { data: mes } = useResource(useCallback((s: AbortSignal) => api<{ aFaire: BesoinV1[]; enCours: BesoinV1[] }>("/v1/ag/besoins", { signal: s }).catch(() => ({ aFaire: [], enCours: [] })), []));
  const mesBesoins = mes ? [...mes.aFaire, ...mes.enCours] : [];
  const ajoutes = useSearchParams().get("ajoutes");
  const [confirmation, setConfirmation] = useState(true);
  useEffect(() => {
    if (!ajoutes) return;
    const t = window.setTimeout(() => setConfirmation(false), 6000);
    return () => window.clearTimeout(t);
  }, [ajoutes]);
  // Lot C (Greg, 15 novembre 2026) : la liste vient du serveur (un seul réglage) : les métiers ouverts d'abord, les autres
  // visibles et marqués « Bientôt », non sélectionnables. Avant : seulement les métiers qui avaient des produits.
  const metiers = etat.filtres ?? FILTRES_V1.filter((f) => etat.produits.some((p) => lotPrincipal(p.lot) === f.id)).map((f) => ({ ...f, ouvert: true }));
  const fermerChoix = useCallback(() => setChoix(false), []);
  // La recherche par matériau : sur le nom du produit (sans accents ni majuscules), les plus proches de la clôture d'abord.
  const sansAccent = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mots = sansAccent(cherche).split(/\s+/).filter(Boolean);
  const trouves = [...(data?.achats ?? [])].sort((x, y) => x.ouvertJusquau.localeCompare(y.ouvertJusquau)).filter((a) => mots.every((m) => sansAccent(a.nom).includes(m)));

  return (
    <div className="flex flex-col gap-4 lg:w-full lg:pb-24">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <PageTitle>Achats groupés</PageTitle>
          {/* Sur ordinateur : un bouton normal dans l'en-tête (Greg, 15 novembre 2026). */}
          <button type="button" onClick={() => setChoix(true)} className="pressable hidden min-h-12 items-center gap-2 rounded-full bg-accent px-5 text-[16px] font-extrabold text-on-accent lg:inline-flex">
            <Plus size={20} aria-hidden="true" /> Publier un besoin
          </button>
        </div>
        {/* Onglet « Groupés » (Greg, 18 novembre 2026) : ce qui se passe autour de moi. Mes propres besoins vivent dans
            Demandes › Groupées. */}
        <p className="text-[15px] leading-relaxed text-muted">Les regroupements ouverts près de toi. Rejoins-en un pour payer moins cher : tu décides à la réception de l&apos;offre.</p>
      </div>
      {/* Lot E (Greg, 15 novembre 2026, capture 11) : une confirmation compacte, qui s'efface seule ; le besoin publié est
          juste dessous, dans « Mes besoins ». Avant : un grand bandeau vert qui restait. */}
      {ajoutes && confirmation ? (
        <p role="status" className="inline-flex items-center gap-2 self-start rounded-full bg-ok-bg px-3 py-1.5 text-[14px] font-semibold text-ok">
          <Check size={16} aria-hidden="true" /> {Number(ajoutes) > 1 ? `${ajoutes} besoins publiés` : "Besoin publié"} · tu décides à la réception de l&apos;offre
        </p>
      ) : null}
      {/* Greg, 18 novembre 2026 : « Mes besoins » quitte cet écran (ce que j'ai lancé est dans Demandes › Groupées) ; une
          ligne y mène quand j'en ai. */}
      {mesBesoins.length ? (
        <Link href="/demandes?type=groupees" className={`pressable flex min-h-13 items-center gap-3 px-4 py-2.5 ${CARTE}`}>
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            {mesBesoins.length} besoin{mesBesoins.length > 1 ? "s" : ""} groupé{mesBesoins.length > 1 ? "s" : ""} en cours
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-[14px] font-extrabold">
            Voir
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </Link>
      ) : null}
      {!etat.zone ? <LigneZone zone={null} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-extrabold whitespace-nowrap">Regroupements ouverts</h2>
        <label className="flex min-w-0 items-center gap-2 text-[15px]">
          <span className="text-muted">Métier</span>
          <select aria-label="Filtrer par métier" value={lot} onChange={(e) => setLot(e.target.value)} className="min-h-11 max-w-[11rem] min-w-0 truncate rounded-full border border-line bg-surface px-3 text-[15px] font-semibold">
            <option value="">Tous</option>
            {metiers.map((f) => (
              <option key={f.id} value={f.id} disabled={!f.ouvert}>
                {f.ouvert ? f.libelle : `${f.libelle} · Bientôt`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
          <Search size={20} aria-hidden="true" className="shrink-0 text-muted" />
          <span className="sr-only">Chercher un matériau</span>
          <input type="search" enterKeyHint="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="Chercher un matériau" className="min-h-11 min-w-0 grow bg-transparent text-[16px] outline-none placeholder:text-muted" />
        </label>
        {/* Le secteur : un regroupement se fait par département (on ne rejoint que ceux du sien). */}
        {etat.zone ? <p className="text-[13px] text-muted">Secteur : {zoneLisible(etat.zone)}. Pour en changer, change l&apos;adresse de ton entreprise dans Profil.</p> : null}
      </div>
      {data === null ? (
        <Skeleton card="h-24" lines={0} label="Chargement des achats groupés…" />
      ) : trouves.length === 0 && data.achats.length > 0 ? (
        <p className={`${CARTE} p-4 text-[15px] text-muted`}>Aucun regroupement ouvert pour « {cherche.trim()} ». Publie ce besoin (<span className="lg:hidden">le ＋ en bas</span><span className="hidden lg:inline">« Publier un besoin »</span>) : d&apos;autres artisans te rejoindront.</p>
      ) : data.achats.length === 0 ? (
        // Revue UX (8 novembre 2026) : liste vide, l'action vit dans la carte (le bouton flottant recouvrait ce texte).
        <div className={`${CARTE} flex flex-col items-start gap-3 p-4 lg:items-center lg:gap-4 lg:px-10 lg:py-14 lg:text-center`}>
          <span aria-hidden="true" className="hidden size-14 items-center justify-center rounded-full bg-accent text-on-accent lg:flex">
            <Users size={26} />
          </span>
          <p className="text-[15px] text-muted lg:max-w-[38rem] lg:text-[16px]">Aucun regroupement ouvert{lot ? " pour ce métier" : ""} près de toi pour le moment. Sois le premier : <span className="lg:hidden">touche le ＋ en bas, « Besoin groupé »</span><span className="hidden lg:inline">touche « Publier un besoin »</span>. D&apos;autres artisans te rejoindront.</p>
        </div>
      ) : (
        // Greg, 12 novembre 2026 (dossier de corrections UX, point 8) : chaque achat groupé est une opportunité AUTONOME,
        // donc une carte à elle, et non une ligne d'une même liste. Deux achats du même matériau se distinguent par ce
        // que l'on sait vraiment : le métier, le secteur, la réception, la date de besoin, l'échéance. RÈGLE CHANGÉE (Greg,
        // 15 novembre 2026, lot H) : le volume total et le nombre d'entreprises se lisent dès la première ; toujours aucun
        // nom d'entreprise, aucune économie annoncée.
        // Greg, 18 novembre 2026 (onglet « Groupés ») : chaque carte dit en UNE phrase où ça en est (« 3 entreprises · 1 750
        // ardoises · clôture dans 5 jours ») et a UN bouton : « Rejoindre », ou « Voir » quand j'y suis déjà.
        <ul aria-label="Achats groupés ouverts" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {trouves.slice(0, tout ? undefined : ACHATS_VISIBLES).map((a) => {
            const phrase = `${a.resume && a.resume.entreprises > 0 ? ligneRegroupement(a.resume) : "Personne pour l'instant"} · ${clotureDans(a.ouvertJusquau)}`;
            const dedans = !!a.monBesoinId;
            return (
              <li key={a.id} className="flex">
                <Link href={dedans ? `/achats-groupes/besoins/${a.monBesoinId}` : lienAchat(a)} aria-label={`${a.nom}, ${phrase}, ${dedans ? "Voir" : "Rejoindre"}`} className={`pressable flex w-full items-center gap-3 p-4 ${CARTE}`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="self-start rounded-md bg-[#ffe98a] px-2 py-0.5 text-[11px] font-extrabold tracking-[0.04em] text-[#130901] uppercase">{libelleLot(a.lot)}</span>
                    <span className="text-[16px] leading-snug font-extrabold break-words">{a.nom}</span>
                    <span className="flex items-start gap-1.5 text-[13.5px] leading-snug font-semibold">
                      <Timer size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span>{phrase}</span>
                    </span>
                  </span>
                  <span aria-hidden="true" className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-extrabold ${dedans ? "border border-line text-ink" : "bg-accent text-on-accent"}`}>
                    {dedans ? "Voir" : "Rejoindre"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {trouves.length > ACHATS_VISIBLES ? (
        <button type="button" onClick={() => setTout(!tout)} className="min-h-11 self-center py-2 text-[15px] font-semibold underline underline-offset-4">
          {tout ? "Voir moins" : `Voir les ${trouves.length - ACHATS_VISIBLES} autres regroupements`}
        </button>
      ) : null}
      <p className="pt-2 text-center text-[13px] text-muted">{SIGNATURE}</p>
      {/* RÈGLE CHANGÉE (Greg, 18 novembre 2026) : le bouton flottant « Publier un besoin » du téléphone est retiré ; le ＋
          de la barre du bas le remplace (« Besoin groupé »). L'ordinateur garde son bouton d'en-tête. */}
      {choix ? <ChoixAjout onFermer={fermerChoix} /> : null}
    </div>
  );
}

/** Les deux façons d'ajouter un matériau (Greg, 8 novembre 2026 : « soit par la liste, soit par l'IA » ; le catalogue est retiré, il y manquera toujours des produits). */
function ChoixAjout({ onFermer }: { onFermer: () => void }) {
  // Au clavier (passe mobile, 15 novembre 2026) : « Échap » ferme, le premier bouton prend le focus à l'ouverture.
  const fermer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    fermer.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [onFermer]);
  return (
    <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/50 lg:items-center" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Publier un besoin" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-lg flex-col gap-3 rounded-t-[24px] bg-ground p-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-ink lg:rounded-[24px]">
        <div className="flex items-center justify-between">
          <p className="text-[18px] font-extrabold">Publier un besoin</p>
          <button ref={fermer} type="button" onClick={onFermer} aria-label="Fermer" className="grid size-11 place-items-center rounded-full">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {/* Lot A : deux actions de même poids, deux à quatre mots chacune, une ligne d'explication au plus. */}
        <CarteAction href="/achats-groupes/quantitatif" icone={Package} titre="Choisir une liste" sous="Dans un quantitatif que tu as déjà." />
        <CarteAction href="/achats-groupes/publier" icone={Sparkles} titre="Créer mon besoin" sous="À la main ou avec l'aide de Mobiiz." />
      </div>
    </div>
  );
}
