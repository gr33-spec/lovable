"use client";

import { Check, Clock, FileText, Store, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { chrono, jourMois, prochaineClotureParDefaut } from "@/lib/cycle";
import { InviterCollegue } from "@/components/inviter";
import { BoucleNegoce } from "@/components/boucle-negoce";
import type { Groupe } from "@/components/groupe";
import { Button, ButtonLink, Chrono, ErrorNotice, Field, SectionTitle } from "@/components/ui";
import { api, ApiError, newActionKey } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LA COMMANDE COMMUNE (Greg, 22 octobre 2026, au soir ; cycle raccourci le 23 : le 1er et le 15) côté écran : une commande toutes les deux semaines avec les couvreurs de
 * la région. On parle en QUANTITÉS, jamais en nombre d'entreprises ; le chrono est partout ; « Sans engagement : tu
 * commandes seulement si le prix te plaît ». Toutes les phrases viennent de l'API (calculées par le domaine).
 */
export interface NegoceDuResultat {
  negoceId: string;
  nom: string;
  totalHt: number;
  marchandiseHt: number;
  livraisonHt: number;
  manquantes: number;
  complet: boolean;
  /** Faux quand un chantier de l'entreprise est au-delà de la distance maximale du négoce : « Ne livre pas ta zone ». */
  livrable: boolean;
  /** Les prix « non garantis » (matière cotée) : indicatifs, hors total, hors garantie. */
  indicatives: { designation: string; prixUnitaire: number }[];
  premierSurLeTotal: boolean;
}

/** La grille garantie 30 jours (Greg, 23 octobre 2026) : le négoce retenu tient ses prix pour tout artisan de la zone. */
export interface GarantieVue {
  cycleId: string;
  mois: string;
  de: string;
  zone: string;
  titre: string;
  jusquau: string;
  negoce: { id: string; nom: string };
  livraison: string;
  lignes: { cle: string; designation: string; unite: string; prixUnitaire: number }[];
  commandes: { numero: number; totalHt: number; le: string; adresse: string }[];
}

export interface CommandeDuMois {
  cycleId: string;
  numero: number;
  mois: string;
  de: string;
  phase: "inscriptions" | "negoces" | "resultats";
  clotureDans: string | null;
  reponseDans: string | null;
  toi: string;
  tout: string;
  cloture: string | null;
  premier: string | null;
  mesLignes: { id: string; designation: string; quantite: number; unite: string; nature: string | null; chantier: string; projectId: string }[];
  suivi: { etape: number; phrase: string; aFaire: string | null };
  /** Le suivi des demandes de prix (Greg, 24 octobre 2026) ; absent d'une ancienne API. */
  demandes?: SuiviDesDemandes | null;
  /** « Ton négoce X a répondu » : les négoces que l'artisan a mis dans la boucle (phase des négoces). */
  mesNegoces?: string[];
  /** La liste reportée d'une commande sans réponse. */
  report?: string | null;
  resultats: null | {
    parDefaut: string | null;
    moinsCherPourToi: string | null;
    negoces: NegoceDuResultat[];
    choix: { negoceId: string; totalHt: number; commandeLe: string | null; libelle?: string | null } | null;
    /** Multimétier (Greg, 25 octobre 2026) : les 2 ou 3 meilleures combinaisons livrées, la moins chère d'abord. */
    combinaisons?: Combinaison[];
    /** Les familles de sa liste qu'aucun négoce n'a entièrement chiffrées (« second œuvre »). */
    sansPrix?: string[];
  };
}

/** « Tout chez X : 4 200 €, 1 livraison » ou « Placo chez Y, tuiles chez Z : 3 950 €, 2 livraisons ». */
export interface Combinaison {
  cle: string;
  libelle: string;
  totalHt: number;
  livraisons: number;
  phraseLivraisons: string;
  ecartHt: number;
  toutChez: string | null;
  parts: { negoceId: string; nom: string; familles: string[]; lignes: number; totalHt: number; livraisonHt: number }[];
}

/** Des comptes, jamais un nom ni un prix avant les résultats : phrases calculées par le domaine (`suiviDesDemandes`). */
export interface SuiviDesDemandes {
  titre: string;
  resultatsLe: string | null;
  compteur: string | null;
  progression: number | null;
  phrase: string | null;
  boucle: boolean;
}

export interface EtatDuMois {
  mode: "mois" | "lots";
  commandes: CommandeDuMois[];
  /** La commande ouverte du département du chantier (si `projectId` est donné), sinon de celui de l'entreprise. */
  prochaine: { mois: string; de: string; zone?: string; clotureLe: string; clotureDans: string; toi: string | null; tout: string; vide: boolean } | null;
  /** Les grilles garanties encore ouvertes dans la zone, la plus récente d'abord (vide pour une ancienne API). */
  garanties?: GarantieVue[];
  phrases: { sansEngagement: string };
}

export function useCommandeDuMois(actif: boolean, projectId?: string) {
  const fetchEtat = useCallback(
    (signal: AbortSignal) => (actif ? api<EtatDuMois>(`/v1/commande-du-mois${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`, { signal }) : Promise.resolve(null)),
    [actif, projectId],
  );
  return useResource(fetchEtat);
}

/** La prochaine clôture telle que l'écran la montre : les dates de l'API quand elle répond, sinon la règle par défaut. */
export interface Prochaine {
  mois: string;
  de: string;
  clotureLe: string;
  clotureDans: string;
  /** « Toi seul : … » quand l'entreprise a déposé ; null sinon (ou quand l'API n'a pas répondu). */
  toi: string | null;
  /** « Toute la commande … » ; null quand l'API n'a pas répondu. */
  tout: string | null;
  vide: boolean;
  /** `api` : les dates et quantités viennent de l'API ; `defaut` : règle par défaut (API muette). */
  source: "api" | "defaut";
}

/** Le chrono se recalcule chaque minute dans le navigateur : un vrai minuteur, pas une phrase figée. */
export function useChrono(clotureLe: string | null): string | null {
  const [texte, setTexte] = useState<string | null>(() => (clotureLe ? chrono(new Date(), new Date(clotureLe)) : null));
  useEffect(() => {
    if (!clotureLe) return;
    const calcule = () => setTexte(chrono(new Date(), new Date(clotureLe)));
    calcule();
    const t = setInterval(calcule, 30_000);
    return () => clearInterval(t);
  }, [clotureLe]);
  return clotureLe ? texte : null;
}

/**
 * LA PROCHAINE COMMANDE, TOUJOURS (Greg, 23 octobre : « je ne vois pas de minuteur »). L'API d'abord (dates réglées par
 * l'admin, quantités) ; si elle ne répond pas, la règle par défaut : le minuteur est là quoi qu'il arrive.
 */
export function useProchaineCommande(actif: boolean, projectId?: string): { prochaine: Prochaine | null; etat: EtatDuMois | null; loading: boolean; reload: () => void; error: ReturnType<typeof useCommandeDuMois>["error"] } {
  const { data, error, loading, reload } = useCommandeDuMois(actif, projectId);
  const p = data?.prochaine ?? null;
  const defaut = prochaineClotureParDefaut();
  const clotureLe = p?.clotureLe ?? defaut.clotureLe;
  const texte = useChrono(actif ? clotureLe : null);
  if (!actif) return { prochaine: null, etat: data, loading: false, reload, error };
  if (p) return { prochaine: { mois: p.mois, de: p.de, clotureLe: p.clotureLe, clotureDans: texte ?? p.clotureDans, toi: p.toi, tout: p.tout, vide: p.vide, source: "api" }, etat: data, loading, reload, error };
  if (loading) return { prochaine: null, etat: data, loading: true, reload, error };
  return { prochaine: { mois: defaut.mois, de: defaut.de, clotureLe: defaut.clotureLe, clotureDans: texte ?? chrono(new Date(), new Date(defaut.clotureLe)), toi: null, tout: null, vide: true, source: "defaut" }, etat: data, loading: false, reload, error };
}

/** Le gros minuteur : « Clôture dans » puis le temps qui reste, en très grand. Le même partout. */
export function GrosChrono({ clotureDans, className = "", heros = false }: { clotureDans: string; className?: string; heros?: boolean }) {
  return (
    <p role="status" className={`flex flex-col ${heros ? "gap-2" : "gap-1"} ${className}`}>
      {heros ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-on-accent">
          <Clock size={14} aria-hidden="true" />
          Clôture dans
        </span>
      ) : (
        <span className="text-[14px] font-semibold text-muted">Clôture dans</span>
      )}{" "}
      <span className={`font-display leading-none font-extrabold tracking-[-0.04em] tabular-nums ${heros ? "text-[64px] text-accent" : "text-[40px] text-ink"}`}>{clotureDans}</span>
    </p>
  );
}

/**
 * LE BANDEAU DU MOIS, sur chaque écran de l'app sauf l'accueil (qui a le bloc entier) : une ligne, « Commande d'octobre ·
 * Clôture dans 2 j 4 h », qui mène à l'onglet. N'importe qui comprend en 10 secondes de quoi parle l'app.
 */
export function BandeauDuMois() {
  const { features } = useSession();
  const pathname = usePathname();
  const actif = features.groupe === true && features.commandeCommune !== "lots" && pathname !== "/";
  const { prochaine, etat } = useProchaineCommande(actif);
  if (!actif || !prochaine) return null;
  // Les prix demandés (Greg, 24 octobre 2026) : tant que les négoces chiffrent une commande de l'artisan, le bandeau dit
  // où ils en sont (« 4/10 réponses · Résultats le 08/11 à 18 h ») ; sinon, la prochaine clôture.
  const demandes = (etat?.commandes ?? []).find((c) => c.phase === "negoces" && c.demandes);
  if (demandes?.demandes) {
    const d = demandes.demandes;
    const court = d.compteur ? d.compteur.replace(/^(\d+) négoces? sur (\d+) (?:ont|a) répondu$/, "$1/$2 réponses").replace(/^Aucun négoce sur (\d+) n'a encore répondu$/, "0/$1 réponse").replace(/^Les (\d+) négoces ont répondu$/, "$1/$1 réponses") : "Prix demandés";
    return (
      <Link
        href="/groupe"
        aria-label={`Commande ${demandes.de} : ${d.compteur ?? d.titre}. ${d.resultatsLe ?? ""}`}
        className="pressable -mt-1 flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold text-ink active:bg-ground"
      >
        <Store size={16} aria-hidden="true" className="shrink-0 text-accent-text" />
        <span className="truncate">{court}</span>
        {d.resultatsLe ? <span className="ml-auto shrink-0 text-accent-text tabular-nums">{d.resultatsLe}</span> : null}
      </Link>
    );
  }
  return (
    <Link
      href="/groupe"
      aria-label={`Commande ${prochaine.de}, clôture dans ${prochaine.clotureDans} : voir la commande commune`}
      className="pressable -mt-1 flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold text-ink active:bg-ground"
    >
      <Clock size={16} aria-hidden="true" className="shrink-0 text-accent-text" />
      <span className="truncate">{`Commande ${prochaine.de}`}</span>
      <span className="ml-auto shrink-0 text-accent-text tabular-nums">{`Clôture dans ${prochaine.clotureDans}`}</span>
    </Link>
  );
}

/**
 * LE BLOC DU MOIS, en haut de l'accueil (Greg, 23 octobre 2026) : la commande du mois, le gros minuteur, la règle en une
 * phrase et trois étapes, les quantités (« Toi seul », « Toute la commande ») quand l'API les donne, et LE bouton :
 * « Dépose ta liste avant le JJ/MM ». Façon Qonto : un chiffre, une action.
 */
export function BlocDuMois({ prochaine: p }: { prochaine: Prochaine }) {
  return (
    // LA carte de l'écran (Greg, 23 octobre au soir : « un truc qui déchire ») : noire, le chrono en jaune signal très
    // grand, les étapes sur pastilles translucides, « Toi » et « Toute la commande » en tuiles sombres, le bouton jaune.
    <section aria-label={`Commande ${p.de}`} className="flex flex-col gap-4 rounded-2xl bg-hero p-5 text-white shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-[16px] font-extrabold">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden="true">
            <Users size={16} />
          </span>
          {`Commande ${p.de}`}
        </p>
        <Link href="/groupe" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent">
          Voir
        </Link>
      </div>
      <GrosChrono clotureDans={p.clotureDans} heros />
      <p className="text-[15px] leading-snug text-white/70">Une commande toutes les deux semaines avec les artisans de ta région.</p>
      <EtapesDuMois compact surNuit />
      {p.toi || p.tout ? (
        <div className="flex flex-col gap-2">
          {p.toi ? (
            <p className="rounded-xl bg-white/8 px-4 py-3 text-[15px] font-semibold">
              <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">Toi</span>
              {p.toi.replace(/^Toi seul : /, "")}
            </p>
          ) : null}
          {p.tout ? (
            <p className="rounded-xl bg-white/8 px-4 py-3 text-[15px] font-semibold">
              <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">Toute la commande</span>
              {p.vide ? "Pour l'instant, la commande est vide. Ta liste peut la lancer." : p.tout.replace(/^Toute la commande [^:]+: /, "")}
            </p>
          ) : null}
        </div>
      ) : null}
      <ButtonLink href="/chantiers/nouveau">{`Dépose ta liste avant le ${jourMois(p.clotureLe)}`}</ButtonLink>
    </section>
  );
}

/** Une carte (comme `Card`), mais une région nommée : « Commande d'octobre ». */
const CARTE = "flex flex-col rounded-xl bg-surface p-4 shadow-card";
const unite = (u: string) => (u === "ml" ? "m" : u);
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const quantite = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Les pastilles pastel des trois étapes (ciel, lavande, menthe) : une couleur par étape. */
const TEINTES = ["bg-accent-soft text-ink", "bg-accent-soft text-ink", "bg-accent-soft text-ink"];

/** Les trois étapes, en mots d'enfant de 12 ans (Greg, 22 octobre). */
export function EtapesDuMois({ compact = false, surNuit = false }: { compact?: boolean; surNuit?: boolean }) {
  const taille = compact ? 16 : 20;
  const etapes = [
    { icone: <FileText size={taille} aria-hidden="true" />, texte: "Dépose ta liste avant la clôture." },
    { icone: <Store size={taille} aria-hidden="true" />, texte: "On envoie tout le volume aux négoces." },
    { icone: <Check size={taille} aria-hidden="true" />, texte: "Tu vois le meilleur prix et tu commandes si ça te plaît." },
  ];
  return (
    <ol aria-label="Comment ça marche" className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      {etapes.map((e, i) => (
        <li key={e.texte} className={`flex items-center gap-3 ${compact ? "text-[15px]" : "text-[16px]"}`}>
          <span className={`flex shrink-0 items-center justify-center rounded-full ${surNuit ? "bg-white/10 text-accent" : (TEINTES[i] ?? TEINTES[0])} ${compact ? "size-8" : "size-10"}`}>{e.icone}</span>
          <span className={surNuit ? "text-white/90" : ""}>
            <span className={`font-semibold ${surNuit ? "text-accent" : "text-accent-text"}`}>{i + 1}.</span> {e.texte}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Sur « Ton chantier », pendant qu'on coche : chantier signé ou stock (les deux vont dans la même commande), la phrase
 * « sans engagement », puis « Ajouter à la commande d'octobre ». Ni dates, ni engagement à cocher.
 */
export function CommandeDuMoisBar({
  count,
  de,
  phrase,
  onCancel,
  onDeposer,
  onAdresse,
  adresseConnue = true,
}: {
  adresseConnue?: boolean;
  count: number;
  de: string;
  phrase: string;
  onCancel: () => void;
  onDeposer: (nature: "chantier" | "stock") => Promise<void>;
  onAdresse?: (adresse: string) => Promise<void>;
}) {
  const id = useId();
  const [adresse, setAdresse] = useState("");
  const [nature, setNature] = useState<"chantier" | "stock" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const choix = "pressable inline-flex min-h-12 grow items-center justify-center rounded-full border px-3 text-[15px] font-semibold";
  const adresseManque = (error?.reason === "adresse_requise" || !adresseConnue) && Boolean(onAdresse);
  return (
    <section aria-label={`Ajouter à la commande ${de}`} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-[16px] font-semibold">{count === 0 ? `Coche les lignes à ajouter à la commande ${de}` : `${count} ligne${count > 1 ? "s" : ""} pour la commande ${de}`}</p>
      <p className="text-[14px] leading-snug text-muted">{phrase}</p>
      <p className="text-[14px] font-semibold">C&apos;est pour quoi ?</p>
      <div role="radiogroup" aria-label="C'est pour quoi ?" className="flex gap-2">
        {(
          [
            ["chantier", "Un chantier signé"],
            ["stock", "Du stock"],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={nature === v} onClick={() => setNature(v)} className={`${choix} ${nature === v ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {adresseManque ? (
        <Field id={`${id}-adresse`} label="Adresse du chantier, avec le code postal" hint="La commande se fait avec les artisans de ton département : il faut l'adresse de livraison." value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="4 rue du Port, 22500 Paimpol" autoComplete="street-address" />
      ) : error ? (
        <ErrorNotice error={error} />
      ) : null}
      <div className="flex gap-2">
        <Button className="grow" variant="secondary" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button
          className="grow"
          pending={pending}
          disabled={count === 0 || !nature || (adresseManque && !/\d{5}/.test(adresse))}
          onClick={async () => {
            if (!nature) return;
            setPending(true);
            setError(null);
            try {
              if (adresseManque && onAdresse) await onAdresse(adresse.trim());
              await onDeposer(nature);
            } catch (e) {
              setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
            } finally {
              setPending(false);
            }
          }}
        >
          <Users size={18} aria-hidden="true" />
          Ajouter
        </Button>
      </div>
    </section>
  );
}

/**
 * En haut de « Ton chantier » : « Commande commune de novembre », le chrono, les quantités de toute la commande (jamais un
 * nombre d'entreprises), puis « Ajouter à la commande du 1er novembre ». Après un dépôt tardif : « Trop tard pour le 15 octobre… ».
 */
export function CommandeDuMoisBloc({ etat, onAjouter, message }: { etat: EtatDuMois | null; onAjouter: () => void; message: string | null }) {
  // Greg (23 octobre) : la commande du département du CHANTIER (`prochaine`, lue avec son `projectId`), jamais celle de
  // l'entreprise quand le chantier est ailleurs.
  const p = etat?.prochaine ?? null;
  const defaut = prochaineClotureParDefaut();
  const de = p?.de ?? defaut.de;
  const vivant = useChrono(p?.clotureLe ?? defaut.clotureLe);
  const chronoTexte = `Clôture dans ${vivant ?? p?.clotureDans ?? chrono(new Date(), new Date(defaut.clotureLe))}`;
  const tout = p && !p.vide ? p.tout : null;
  return (
    <section aria-label={de ? `Commande commune ${de}` : "Commande commune"} className="mb-3 flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <p className="flex items-center gap-2 text-[16px] font-extrabold">
        <Users size={18} aria-hidden="true" className="text-accent-text" />
        {de ? `Commande commune ${de}` : "Commande commune"}
      </p>
      <p className="text-[14px] leading-snug text-muted">Une commande toutes les deux semaines avec les artisans de ta région.</p>
      <Chrono>{chronoTexte}</Chrono>
      {tout ? <p className="text-[15px] font-semibold">{tout}</p> : null}
      {message ? (
        <p role="status" className="rounded-xl bg-ground p-3 text-[14px] font-semibold">
          {message}
        </p>
      ) : null}
      <Button variant="secondary" className="self-start" onClick={onAjouter}>
        {de ? `Ajouter à la commande ${de}` : "Ajouter à la commande"}
      </Button>
    </section>
  );
}

/** Sous la liste : ce que ce chantier a mis dans la commande du mois, avec « Retirer » tant qu'elle n'est pas close. */
export function MesLignesDuMois({ groupe }: { groupe: Groupe }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const ids = new Set([...groupe.besoins.values()].map((b) => b.id));
  const commandes = (groupe.mois?.commandes ?? []).map((c) => ({ c, lignes: c.mesLignes.filter((l) => ids.has(l.id)) })).filter((x) => x.lignes.length > 0);
  if (commandes.length === 0) return null;
  return (
    <>
      {commandes.map(({ c, lignes }) => (
        <section key={c.cycleId} aria-label={`Dans la commande ${c.de}`} className="mt-3 flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-card">
          <h3 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">{`Dans la commande ${c.de}`}</h3>
          <p className="text-[14px] font-semibold text-accent-text">{c.suivi.phrase}</p>
          <ul className="flex flex-col gap-1.5">
            {lignes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ground px-3 py-3">
                <span className="min-w-0 text-[15px] font-semibold">
                  {l.designation} <span className="font-extrabold">{`· ${quantite(l.quantite)} ${unite(l.unite)}`}</span>
                  <span className="block text-[12px] font-semibold text-muted">{l.nature === "stock" ? "Stock" : "Chantier signé"}</span>
                </span>
                {c.phase === "inscriptions" ? (
                  <Button
                    variant="secondary"
                    className="min-h-11 px-4 text-[14px]"
                    pending={pending === l.id}
                    onClick={async () => {
                      setPending(l.id);
                      setError(null);
                      try {
                        await api(`/v1/commande-du-mois/lignes/${encodeURIComponent(l.id)}`, { method: "DELETE" });
                        groupe.rechargerMois();
                      } catch (e) {
                        setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    Retirer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {error ? <ErrorNotice error={error} /> : null}
        </section>
      ))}
    </>
  );
}

/**
 * Le dépôt d'une liste dans la commande commune (« Trop tard pour le 15 octobre… » renvoyé tel quel). `mois` : la commande
 * que l'écran montrait ; close entre-temps, l'API le dit.
 */
export async function deposerDansLeMois(projectId: string, articles: string[], nature: "chantier" | "stock", mois: string | null = null): Promise<{ mois: string; message: string | null }> {
  return api(`/v1/projects/${encodeURIComponent(projectId)}/commande-du-mois`, { method: "POST", body: { articles, nature, mois }, idempotencyKey: newActionKey() });
}

/** L'onglet « Commande commune » : chaque commande du mois, ses chiffres en quantités, le partage, puis les résultats. */
export function CommandeDuMoisPanneau({ etat, onChange }: { etat: EtatDuMois; onChange: () => void }) {
  const commandes = etat.commandes;
  const ouverte = commandes.find((c) => c.phase === "inscriptions");
  return (
    <div className="flex flex-col gap-4">
      {!ouverte && etat.prochaine ? (
        <section aria-label={`Commande ${etat.prochaine.de}`} className={`${CARTE} gap-3`}>
          <div className="-mx-4 -mt-4 flex flex-col gap-3 rounded-t-xl bg-hero p-4 text-white">
            <SectionTitle>{`Commande ${etat.prochaine.de}`}</SectionTitle>
            <GrosChrono clotureDans={etat.prochaine.clotureDans} heros />
          </div>
          <p className="text-[16px] font-semibold">{etat.prochaine.vide ? "Pour l'instant, la commande est vide. Dépose ta liste pour la lancer." : etat.prochaine.tout}</p>
          <InviterCollegue texte="Plus on est nombreux dans la commande, plus les prix baissent." />
          <BoucleNegoce />
        </section>
      ) : null}
      {commandes.map((c) => (
        <CarteDuMois key={c.cycleId} c={c} onChange={onChange} />
      ))}
      {(etat.garanties ?? []).map((g) => (
        <BlocGarantie key={g.cycleId} g={g} onChange={onChange} />
      ))}
    </div>
  );
}

/**
 * LE SUIVI DES DEMANDES DE PRIX (Greg, 24 octobre 2026) : « Demandes envoyées à 10 négoces de ton secteur », le chrono
 * des résultats, « 4 négoces sur 10 ont répondu » et sa barre, la relance ou le bilan ; ses négoces à lui (répondu ou
 * pas) ; et quand personne ne peut répondre, « Mets ton négoce dans la boucle ». Jamais un nom de concurrent ni un prix.
 */
export function SuiviDesDemandesBloc({ d, mesNegoces = [] }: { d: SuiviDesDemandes; mesNegoces?: string[] }) {
  const pourcent = d.progression === null ? null : Math.round(d.progression * 100);
  return (
    <section aria-label="Prix demandés" className="flex flex-col gap-2 rounded-xl bg-ground p-4">
      <p className="text-[16px] font-extrabold">{d.titre}</p>
      {d.resultatsLe ? <Chrono className="text-[15px]">{d.resultatsLe}</Chrono> : null}
      {d.compteur && pourcent !== null ? (
        <>
          <p role="status" className="text-[15px] font-semibold">
            {d.compteur}
          </p>
          <div role="progressbar" aria-label="Réponses des négoces" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pourcent} className="h-2.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${pourcent}%` }} />
          </div>
        </>
      ) : null}
      {d.phrase ? <p className="text-[15px] font-semibold">{d.phrase}</p> : null}
      {mesNegoces.length > 0 ? (
        <ul aria-label="Tes négoces" className="flex flex-col gap-1">
          {mesNegoces.map((m) => (
            <li key={m} className="text-[14px] text-muted">
              {m}
            </li>
          ))}
        </ul>
      ) : null}
      {d.boucle ? <BoucleNegoce /> : null}
    </section>
  );
}

/** Sur l'accueil : chaque commande de l'artisan dont les prix sont demandés ou viennent d'arriver, en une carte. */
export function DemandesEnCours({ etat }: { etat: EtatDuMois | null }) {
  const enCours = (etat?.commandes ?? []).filter((c) => c.demandes && (c.phase === "negoces" || (c.phase === "resultats" && !c.resultats?.choix?.commandeLe)));
  if (enCours.length === 0) return null;
  return (
    <>
      {enCours.map((c) => (
        <section key={c.cycleId} aria-label={`Prix demandés, commande ${c.de}`} className={`${CARTE} gap-3`}>
          <div className="flex items-start justify-between gap-3">
            <SectionTitle>{`Commande ${c.de}`}</SectionTitle>
            <Link href="/groupe" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent-text underline">
              Voir
            </Link>
          </div>
          <SuiviDesDemandesBloc d={c.demandes!} mesNegoces={c.mesNegoces} />
        </section>
      ))}
    </>
  );
}

function CarteDuMois({ c, onChange }: { c: CommandeDuMois; onChange: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const run = async (cle: string, f: () => Promise<unknown>) => {
    setPending(cle);
    setError(null);
    try {
      await f();
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(null);
    }
  };
  const r = c.resultats;
  // Multimétier : la moins chère d'abord, cochée d'office ; l'artisan choisit.
  const combinaisons = r?.combinaisons ?? [];
  const commandee = r?.choix?.commandeLe ? r.choix : null;
  const selection = combinaisons.find((x) => x.cle === choisi) ?? combinaisons[0] ?? null;
  const nomsDe = (x: Combinaison) => x.parts.map((p) => p.nom).join(" et ");
  return (
    <section aria-label={`Commande ${c.de}`} className={`${CARTE} gap-3`}>
      {/* Haute visibilité : tant que la commande est ouverte, son en-tête est de nuit, le chrono en jaune (comme l'accueil). */}
      {c.phase === "inscriptions" && c.clotureDans ? (
        <div className="-mx-4 -mt-4 flex flex-col gap-3 rounded-t-xl bg-hero p-4 text-white">
          <SectionTitle>{`Commande ${c.de}`}</SectionTitle>
          <GrosChrono clotureDans={c.clotureDans} heros />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <SectionTitle>{`Commande ${c.de}`}</SectionTitle>
          {c.phase === "inscriptions" && c.cloture ? <Chrono>{c.cloture}</Chrono> : c.demandes ? null : <p className="text-[15px] font-semibold text-accent-text">{c.phase === "negoces" ? `Commande close. Les négoces chiffrent : leurs prix dans ${c.reponseDans}.` : "Les prix sont là."}</p>}
        </div>
      )}
      {c.report ? (
        <p role="status" className="rounded-xl bg-warn-bg p-3 text-[14px] font-semibold text-warn">
          {c.report}
        </p>
      ) : null}
      {c.demandes ? <SuiviDesDemandesBloc d={c.demandes} mesNegoces={c.mesNegoces} /> : null}
      <div className="flex flex-col divide-y divide-line">
        <p className="py-3 text-[16px] font-semibold">{c.toi}</p>
        <p className="py-3 text-[16px] font-semibold">{c.tout}</p>
      </div>
      {c.premier ? <p className="rounded-xl bg-ground p-3 text-[14px]">{c.premier}</p> : null}
      {c.phase === "inscriptions" ? (
        <>
          <InviterCollegue texte="Plus on est nombreux dans la commande, plus les prix baissent." />
          <BoucleNegoce />
        </>
      ) : null}

      {c.mesLignes.length > 0 ? (
        <section aria-label="Mes lignes" className="flex flex-col gap-1.5">
          <h3 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Mes lignes</h3>
          <ul className="flex flex-col gap-1.5">
            {c.mesLignes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ground px-3 py-3">
                <span className="min-w-0 text-[15px] font-semibold">
                  {l.designation} <span className="font-extrabold">{`· ${quantite(l.quantite)} ${unite(l.unite)}`}</span>
                  <span className="block text-[12px] font-semibold text-muted">{`${l.nature === "stock" ? "Stock" : "Chantier signé"} · ${l.chantier}`}</span>
                </span>
                {c.phase === "inscriptions" ? (
                  <Button variant="secondary" className="min-h-11 px-4 text-[14px]" pending={pending === l.id} onClick={() => run(l.id, () => api(`/v1/commande-du-mois/lignes/${encodeURIComponent(l.id)}`, { method: "DELETE" }))}>
                    Retirer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {r ? (
        <section aria-label="Tes prix" className="flex flex-col gap-2">
          <h3 className="text-[16px] font-extrabold">Tes meilleures options, livraison comprise</h3>
          {commandee ? (
            <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">{`Commandé${commandee.libelle ? ` : ${commandee.libelle}` : ""}, ${euros(commandee.totalHt)} HT livré. Chaque négoce a reçu sa part du bon de commande.`}</p>
          ) : null}
          {!commandee && combinaisons.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {combinaisons.map((x, i) => (
                <li key={x.cle}>
                  <label className={`flex items-start gap-3 rounded-xl border-2 bg-surface p-4 transition-[border-color] duration-150 ${selection?.cle === x.cle ? "border-accent" : "border-line"}`}>
                    <input type="radio" name={`combinaison-${c.cycleId}`} checked={selection?.cle === x.cle} onChange={() => setChoisi(x.cle)} className="mt-1 size-5 shrink-0 accent-accent" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[16px] font-extrabold">{`${x.libelle} : ${euros(x.totalHt)} HT livré, ${x.phraseLivraisons}`}</span>
                      {i === 0 ? <span className="text-[13px] font-bold text-ok">La moins chère</span> : <span className="text-[13px] font-bold text-muted">{`${euros(x.ecartHt)} de plus`}</span>}
                      {x.parts.length > 1 ? (
                        <span className="text-[13px] font-semibold text-muted">{x.parts.map((p) => `${p.nom} : ${euros(p.totalHt)} (${p.lignes} article${p.lignes > 1 ? "s" : ""}, livraison ${p.livraisonHt > 0 ? euros(p.livraisonHt) : "gratuite"})`).join(" · ")}</span>
                      ) : (
                        <span className="text-[13px] font-semibold text-muted">{`Livraison ${x.parts[0]!.livraisonHt > 0 ? euros(x.parts[0]!.livraisonHt) : "gratuite"}`}</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          {r.sansPrix && r.sansPrix.length > 0 ? (
            <p role="status" className="rounded-xl bg-warn-bg p-4 text-[14px] font-semibold text-warn">{`Aucun négoce n'a chiffré : ${r.sansPrix.join(", ")}. Commande ces lignes en direct chez ton négoce.`}</p>
          ) : null}
          {!commandee && !selection ? (
            <p role="status" className="rounded-xl bg-warn-bg p-4 text-[14px] font-semibold text-warn">
              Aucun négoce n&apos;a chiffré toute ta liste : commande-la en direct chez ton négoce.
            </p>
          ) : null}
          {!commandee && selection && !confirmer ? <Button onClick={() => setConfirmer(true)}>{`Commander : ${selection.libelle}`}</Button> : null}
          {!commandee && selection && confirmer ? (
            <ConfirmationCommande negoce={nomsDe(selection)} pending={pending === "commander"} onAnnuler={() => setConfirmer(false)} onConfirmer={() => run("commander", () => api(`/v1/commande-du-mois/${encodeURIComponent(c.cycleId)}/commander`, { method: "POST", body: { combinaison: selection.cle } }))} />
          ) : null}
          <p className="text-[14px] text-muted">Sans engagement : tu commandes seulement si le prix te plaît. Chaque négoce retenu reçoit seulement sa part du bon, avec ton nom ; tu paies sur ton compte, comme d&apos;habitude.</p>
        </section>
      ) : c.phase === "resultats" ? (
        <p className="text-[14px] font-semibold text-muted">Aucun négoce n&apos;a chiffré ta liste cette fois-ci.</p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
    </section>
  );
}

/**
 * CONFIDENTIALITÉ (point 4) : avant « Commander », le négoce ne voit que la grille et des communes ; au clic, tes coordonnées
 * et ton adresse partent au négoce choisi, et à lui seul. L'écran le dit, et attend ta confirmation.
 */
function ConfirmationCommande({ negoce, pending, onAnnuler, onConfirmer }: { negoce: string; pending: boolean; onAnnuler: () => void; onConfirmer: () => void }) {
  return (
    <div role="group" aria-label="Confirmer la commande" className="flex flex-col gap-3 rounded-xl bg-ground p-4">
      <p className="text-[15px] font-semibold">{`En commandant, tu transmets tes coordonnées et ton adresse de livraison à ${negoce}.`}</p>
      <div className="flex flex-wrap gap-3">
        <Button pending={pending} onClick={onConfirmer}>
          Confirmer la commande
        </Button>
        <Button variant="secondary" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

/**
 * LA GRILLE GARANTIE 30 JOURS (Greg, 23 octobre 2026, point 6) : après les résultats, le négoce retenu tient ses prix
 * pour tout artisan de la zone, nouvel inscrit compris. « Prix garantis jusqu'au <date> », la liste des articles au prix
 * garanti, « Recommander à ce prix » : des quantités, une adresse, la confirmation, et le bon part au négoce. Deux
 * fenêtres ouvertes = deux blocs, la plus récente d'abord ; fin de fenêtre = le bloc disparaît.
 */
export function BlocGarantie({ g, onChange }: { g: GarantieVue; onChange: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [quantites, setQuantites] = useState<Record<string, string>>({});
  const [adresse, setAdresse] = useState("");
  const [confirmer, setConfirmer] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fait, setFait] = useState<{ numero: number; totalHt: number } | null>(null);
  const lignes = g.lignes.map((l) => ({ ...l, quantite: Number((quantites[l.cle] ?? "").replace(",", ".")) || 0 })).filter((l) => l.quantite > 0);
  const marchandise = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const pret = lignes.length > 0 && /\b\d{5}\b/.test(adresse);
  async function commander() {
    setPending(true);
    setError(null);
    try {
      const r = await api<{ numero: number; totalHt: number }>(`/v1/commande-du-mois/${encodeURIComponent(g.cycleId)}/recommander`, { method: "POST", body: { lignes: lignes.map((l) => ({ cle: l.cle, quantite: l.quantite })), adresseLivraison: adresse.trim() }, idempotencyKey: newActionKey() });
      setFait(r);
      setOuvert(false);
      setConfirmer(false);
      setQuantites({});
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setConfirmer(false);
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label={g.titre} className={`${CARTE} gap-3`}>
      <div className="flex flex-col gap-1">
        <SectionTitle>{g.titre}</SectionTitle>
        <p className="text-[15px] font-semibold text-accent-text">{`Chez ${g.negoce.nom}, sur la grille garantie ${g.de}.`}</p>
        <p className="text-[14px] text-muted">{`Les prix de la commande ${g.de}, tenus pour tout artisan du ${g.zone} jusqu'au ${jourMois(g.jusquau)}. Livraison : ${g.livraison}`}</p>
      </div>
      {fait ? <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">{`C'est commandé : bon n° ${fait.numero}, ${euros(fait.totalHt)} HT livré, parti chez ${g.negoce.nom}. Commande sur grille garantie ${g.de}.`}</p> : null}
      {g.commandes.length > 0 ? (
        <ul aria-label="Mes commandes sur cette grille" className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          {g.commandes.map((c) => (
            <li key={c.numero}>{`Bon n° ${c.numero} · ${euros(c.totalHt)} HT · ${jourMois(c.le)}`}</li>
          ))}
        </ul>
      ) : null}
      {!ouvert ? (
        <>
          <ul className="flex flex-col divide-y divide-line text-[15px]">
            {g.lignes.map((l) => (
              <li key={l.cle} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0">{l.designation}</span>
                <span className="shrink-0 font-semibold tabular-nums">{`${euros(l.prixUnitaire)} HT / ${unite(l.unite)}`}</span>
              </li>
            ))}
          </ul>
          <Button onClick={() => setOuvert(true)}>Recommander à ce prix</Button>
        </>
      ) : (
        <form
          aria-label="Recommander à ce prix"
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmer(true);
          }}
          noValidate
        >
          <ul className="flex flex-col divide-y divide-line text-[15px]">
            {g.lignes.map((l) => (
              <li key={l.cle} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <label htmlFor={`garantie-${g.cycleId}-${l.cle}`} className="min-w-0 grow">
                  {l.designation}
                  <span className="block text-[13px] font-semibold text-muted">{`${euros(l.prixUnitaire)} HT / ${unite(l.unite)}`}</span>
                </label>
                <span className="flex items-center gap-2">
                  <input id={`garantie-${g.cycleId}-${l.cle}`} inputMode="decimal" value={quantites[l.cle] ?? ""} onChange={(e) => setQuantites({ ...quantites, [l.cle]: e.currentTarget.value })} className="min-h-11 w-24 rounded-xl border border-line bg-surface px-3 text-right text-[16px] font-bold outline-none focus-visible:border-accent" />
                  <span className="text-[13px] font-semibold text-muted">{unite(l.unite)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Field id={`garantie-${g.cycleId}-adresse`} label="Adresse de livraison (avec le code postal)" autoComplete="street-address" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          {lignes.length > 0 ? <p className="text-[15px] font-semibold">{`${euros(marchandise)} HT de matériaux, livraison selon les paliers du négoce.`}</p> : null}
          {error ? <ErrorNotice error={error} /> : null}
          {confirmer ? (
            <ConfirmationCommande negoce={g.negoce.nom} pending={pending} onAnnuler={() => setConfirmer(false)} onConfirmer={commander} />
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={!pret}>
                {`Commander chez ${g.negoce.nom}`}
              </Button>
              <Button variant="secondary" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
            </div>
          )}
          <p className="text-[13px] text-muted">{`Commande sur grille garantie ${g.de} : le bon part au négoce avec tes coordonnées et cette adresse. Tu paies sur ton compte, comme d'habitude.`}</p>
        </form>
      )}
    </section>
  );
}
