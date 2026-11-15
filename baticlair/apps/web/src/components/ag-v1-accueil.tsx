"use client";

import { Check, Plus, ChevronRight, Package, Sparkles, Timer, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CARTE, LigneZone } from "@/components/ag-v1-commun";
import { PageTitle, Skeleton } from "@/components/ui";
import { CarteAction } from "@/components/ux-kit";
import { api } from "@/lib/api";
import { dateCourte, FILTRES_V1, libelleLot, lotPrincipal, SIGNATURE, zoneLisible, type AchatV1, type BesoinV1, type EtatV1 } from "@/lib/ag-v1";
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
  // Seuls les métiers qui ont des produits ouverts sont proposés.
  const metiers = FILTRES_V1.filter((f) => etat.produits.some((p) => lotPrincipal(p.lot) === f.id));
  const fermerChoix = useCallback(() => setChoix(false), []);

  return (
    <div className="flex flex-col gap-4 pb-32 lg:mx-auto lg:w-full lg:max-w-[48rem] lg:pb-24">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <PageTitle>Achats groupés</PageTitle>
          {/* Sur ordinateur : un bouton normal dans l'en-tête (Greg, 15 novembre 2026). */}
          <button type="button" onClick={() => setChoix(true)} className="pressable hidden min-h-12 items-center gap-2 rounded-full bg-accent px-5 text-[16px] font-extrabold text-on-accent lg:inline-flex">
            <Plus size={20} aria-hidden="true" /> Publier un besoin
          </button>
        </div>
        <p className="text-[15px] leading-relaxed text-muted">Achète avec d&apos;autres artisans de ton secteur{etat.zone ? ` · ${zoneLisible(etat.zone)}` : ""}, pour payer moins cher. Tu décides à la réception de l&apos;offre.</p>
      </div>
      {/* Lot E (Greg, 15 novembre 2026, capture 11) : une confirmation compacte, qui s'efface seule ; le besoin publié est
          juste dessous, dans « Mes besoins ». Avant : un grand bandeau vert qui restait. */}
      {ajoutes && confirmation ? (
        <p role="status" className="inline-flex items-center gap-2 self-start rounded-full bg-ok-bg px-3 py-1.5 text-[14px] font-semibold text-ok">
          <Check size={16} aria-hidden="true" /> {Number(ajoutes) > 1 ? `${ajoutes} besoins publiés` : "Besoin publié"} · tu décides à la réception de l&apos;offre
        </p>
      ) : null}
      {/* UX SIMPLIFIÉE (Greg, 8 novembre 2026) : l'onglet montre seulement « Mes besoins » puis « Achats ouverts ». */}
      <section aria-labelledby="ag-mes-besoins" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="ag-mes-besoins" className="text-[18px] font-extrabold">
            Mes besoins
          </h2>
          {mesBesoins.length ? (
            <Link href="/achats-groupes/mes-besoins" className="min-h-11 py-2 text-[15px] font-semibold underline underline-offset-4">
              Tout voir
            </Link>
          ) : null}
        </div>
        {mes === null ? (
          <Skeleton card="h-16" lines={0} label="Chargement de tes besoins…" />
        ) : mesBesoins.length === 0 ? (
          <p className={`${CARTE} p-4 text-[15px] text-muted`}>Aucun pour le moment. Touche « Publier un besoin » : tu peux être le premier, d&apos;autres artisans te rejoindront.</p>
        ) : (
          <ul aria-label="Mes besoins" className={`${CARTE} flex flex-col`}>
            {mesBesoins.slice(0, 5).map((b) => (
              <li key={b.id} className="border-b border-line last:border-b-0">
                <Link href={`/achats-groupes/besoins/${b.id}`} className="pressable flex min-h-14 items-center gap-3 px-4 py-2.5">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[16px] leading-snug font-semibold break-words">{b.nom}</span>
                    <span className="text-[13px] text-muted">
                      {b.quantite.lisible} · {b.statut.libelle}
                    </span>
                    {/* Lot H : la dynamique réelle, dès la première entreprise ; jamais un nom. */}
                    {b.achat.resume?.volume ? (
                      <span className="text-[13px] font-semibold">
                        {b.achat.resume.entreprises} entreprise{b.achat.resume.entreprises > 1 ? "s" : ""} · {b.achat.resume.volume}
                        {b.depuisPublication?.quantite ? ` · ${b.depuisPublication.quantite} depuis ta publication` : ""}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {!etat.zone ? <LigneZone zone={null} /> : null}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-extrabold whitespace-nowrap">Achats ouverts</h2>
        <label className="flex min-w-0 items-center gap-2 text-[15px]">
          <span className="text-muted">Métier</span>
          <select aria-label="Filtrer par métier" value={lot} onChange={(e) => setLot(e.target.value)} className="min-h-11 max-w-[11rem] min-w-0 truncate rounded-full border border-line bg-surface px-3 text-[15px] font-semibold">
            <option value="">Tous</option>
            {metiers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.libelle}
              </option>
            ))}
          </select>
        </label>
      </div>
      {data === null ? (
        <Skeleton card="h-24" lines={0} label="Chargement des achats groupés…" />
      ) : data.achats.length === 0 ? (
        // Revue UX (8 novembre 2026) : liste vide, l'action vit dans la carte (le bouton flottant recouvrait ce texte).
        <div className={`${CARTE} flex flex-col items-start gap-3 p-4`}>
          <p className="text-[15px] text-muted">Aucun achat groupé ouvert{lot ? " pour ce métier" : ""} pour le moment. Les articles que tu ajoutes depuis ton quantitatif en ouvrent un.</p>
        </div>
      ) : (
        // Greg, 12 novembre 2026 (dossier de corrections UX, point 8) : chaque achat groupé est une opportunité AUTONOME,
        // donc une carte à elle, et non une ligne d'une même liste. Deux achats du même matériau se distinguent par ce
        // que l'on sait vraiment : le métier, le secteur, la réception, la date de besoin, l'échéance. RÈGLE CHANGÉE (Greg,
        // 15 novembre 2026, lot H) : le volume total et le nombre d'entreprises se lisent dès la première ; toujours aucun
        // nom d'entreprise, aucune économie annoncée.
        <ul aria-label="Achats groupés ouverts" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[...data.achats].sort((x, y) => x.ouvertJusquau.localeCompare(y.ouvertJusquau)).slice(0, tout ? undefined : ACHATS_VISIBLES).map((a) => (
            <li key={a.id} className="flex">
              <Link href={lienAchat(a)} className={`pressable flex w-full flex-col gap-1.5 p-4 ${CARTE}`}>
                <span className="self-start rounded-md bg-[#ffe98a] px-2 py-0.5 text-[11px] font-extrabold tracking-[0.04em] text-[#130901] uppercase">{libelleLot(a.lot)}</span>
                <span className="text-[16px] leading-snug font-extrabold break-words">{a.nom}</span>
                <span className="text-[13px] leading-snug text-muted">
                  {a.zone.nom} · {a.reception === "livraison" ? "Livraison sur chantier" : "Retrait au dépôt"} · besoin avant le {dateCourte(a.dateBesoin)}
                </span>
                {a.resume?.volume ? (
                  <span className="text-[13px] font-semibold">
                    {a.resume.entreprises} entreprise{a.resume.entreprises > 1 ? "s" : ""} · {a.resume.volume}
                  </span>
                ) : null}
                <span className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <Timer size={14} aria-hidden="true" className="shrink-0" />
                    <span>{finDans(a.ouvertJusquau)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 text-[14px] font-extrabold">
                    Voir
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && data.achats.length > ACHATS_VISIBLES ? (
        <button type="button" onClick={() => setTout(!tout)} className="min-h-11 self-center py-2 text-[15px] font-semibold underline underline-offset-4">
          {tout ? "Voir moins" : `Voir les ${data.achats.length - ACHATS_VISIBLES} autres achats ouverts`}
        </button>
      ) : null}
      <p className="pt-2 text-center text-[13px] text-muted">{SIGNATURE}</p>
      {/* PUBLIER UN BESOIN (Greg, 15 novembre 2026, dossier UX mobile : « aucun point d'entrée évident pour être le premier à
          publier un besoin »). Sur téléphone : un bouton flottant jaune, juste au-dessus de la barre du bas, visible au
          défilement ; la page garde sa place en bas (`pb-32`) pour qu'il ne masque rien. RÈGLE CHANGÉE : avant, un lien
          discret « Ajouter un matériau sans quantitatif » en bas de page. */}
      <button
        type="button"
        onClick={() => setChoix(true)}
        className="pressable fixed right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-accent px-5 text-[16px] font-extrabold text-on-accent shadow-float lg:hidden"
        style={{ bottom: "calc(var(--nav-space) + 4px)" }}
      >
        <Plus size={22} aria-hidden="true" /> Publier un besoin
      </button>
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
