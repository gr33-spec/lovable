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
  resultats: null | { parDefaut: string | null; moinsCherPourToi: string | null; negoces: NegoceDuResultat[]; choix: { negoceId: string; totalHt: number; commandeLe: string | null } | null };
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
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent-text">
          <Clock size={14} aria-hidden="true" />
          Clôture dans
        </span>
      ) : (
        <span className="text-[14px] font-semibold text-muted">Clôture dans</span>
      )}{" "}
      <span className={`leading-none font-extrabold tracking-[-0.04em] tabular-nums ${heros ? "text-[56px] text-ink" : "text-[40px] text-accent-text"}`}>{clotureDans}</span>
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
  const { prochaine } = useProchaineCommande(actif);
  if (!actif || !prochaine) return null;
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
    // LA carte de l'écran (retour de Greg, 23 octobre, 18 h 52 : « tendance et moderne ») : blanche avec un halo pastel,
    // le chrono en très grand, les étapes en pastilles pastel, « Toi » et « Toute la commande » en tuiles teintées.
    <section aria-label={`Commande ${p.de}`} className="flex flex-col gap-4 rounded-2xl bg-hero p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-[16px] font-extrabold">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-white" aria-hidden="true">
            <Users size={16} />
          </span>
          {`Commande ${p.de}`}
        </p>
        <Link href="/groupe" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent-text">
          Voir
        </Link>
      </div>
      <GrosChrono clotureDans={p.clotureDans} heros />
      <p className="text-[15px] leading-snug text-muted">Une commande toutes les deux semaines avec les couvreurs de ta région.</p>
      <EtapesDuMois compact />
      {p.toi || p.tout ? (
        <div className="flex flex-col gap-2">
          {p.toi ? (
            <p className="rounded-xl bg-tint-mint px-4 py-3 text-[15px] font-semibold">
              <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.08em] text-ok uppercase">Toi</span>
              {p.toi.replace(/^Toi seul : /, "")}
            </p>
          ) : null}
          {p.tout ? (
            <p className="rounded-xl bg-tint-peach px-4 py-3 text-[15px] font-semibold">
              <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.08em] text-warn uppercase">Toute la commande</span>
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
const TEINTES = ["bg-tint-sky text-accent-text", "bg-tint-lavender text-accent-text", "bg-tint-mint text-ok"];

/** Les trois étapes, en mots d'enfant de 12 ans (Greg, 22 octobre). */
export function EtapesDuMois({ compact = false }: { compact?: boolean }) {
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
          <span className={`flex shrink-0 items-center justify-center rounded-full ${TEINTES[i] ?? TEINTES[0]} ${compact ? "size-8" : "size-10"}`}>{e.icone}</span>
          <span>
            <span className="font-semibold text-accent-text">{i + 1}.</span> {e.texte}
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
}: {
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
  const adresseManque = error?.reason === "adresse_requise" && Boolean(onAdresse);
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
        <Field id={`${id}-adresse`} label="Adresse du chantier, avec le code postal" hint="La commande se fait avec les couvreurs de ton département : il faut l'adresse de livraison." value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="4 rue du Port, 22500 Paimpol" autoComplete="street-address" />
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
      <p className="text-[14px] leading-snug text-muted">Une commande toutes les deux semaines avec les couvreurs de ta région.</p>
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
          <SectionTitle>{`Commande ${etat.prochaine.de}`}</SectionTitle>
          <GrosChrono clotureDans={etat.prochaine.clotureDans} />
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
  const commande = r?.choix?.commandeLe ? r.negoces.find((n) => n.negoceId === r.choix!.negoceId) : null;
  const choisissable = (n: NegoceDuResultat) => n.complet && n.livrable;
  const parDefaut = r ? (r.negoces.find((n) => n.negoceId === r.parDefaut && choisissable(n)) ?? r.negoces.find((n) => n.negoceId === r.moinsCherPourToi && choisissable(n)) ?? null) : null;
  const selection = r ? (r.negoces.find((n) => n.negoceId === choisi && choisissable(n)) ?? parDefaut) : null;
  return (
    <section aria-label={`Commande ${c.de}`} className={`${CARTE} gap-3`}>
      <div className="flex flex-col gap-1">
        <SectionTitle>{`Commande ${c.de}`}</SectionTitle>
        {c.phase === "inscriptions" && c.clotureDans ? <GrosChrono clotureDans={c.clotureDans} /> : c.phase === "inscriptions" && c.cloture ? <Chrono>{c.cloture}</Chrono> : <p className="text-[15px] font-semibold text-accent-text">{c.phase === "negoces" ? `Commande close. Les négoces chiffrent : leurs prix dans ${c.reponseDans}.` : "Les prix sont là."}</p>}
      </div>
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
          <h3 className="text-[16px] font-extrabold">Ton prix livré chez chaque négoce</h3>
          {commande ? (
            <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">{`Commandé chez ${commande.nom} : ${euros(commande.totalHt)} HT livré. Le bon de commande est parti.`}</p>
          ) : null}
          <ul className="flex flex-col gap-2">
            {r.negoces.map((n) => (
              <li key={n.negoceId}>
                <label className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-[border-color] duration-150 ${choisissable(n) ? "bg-surface" : "bg-surface opacity-70"} ${selection?.negoceId === n.negoceId && !commande ? "border-accent" : "border-line"}`}>
                  {commande ? null : <input type="radio" name={`negoce-${c.cycleId}`} disabled={!choisissable(n)} checked={selection?.negoceId === n.negoceId} onChange={() => setChoisi(n.negoceId)} className="mt-1 size-5 shrink-0 accent-accent" />}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[16px] font-extrabold">{`Chez ${n.nom} : ${euros(n.totalHt)} HT livré`}</span>
                    <span className="text-[13px] font-semibold text-muted">{`${euros(n.marchandiseHt)} de matériaux, livraison ${n.livraisonHt > 0 ? euros(n.livraisonHt) : "gratuite"}`}</span>
                    {n.premierSurLeTotal ? <span className="text-[13px] font-bold text-accent-text">Le moins cher sur toute la commande</span> : null}
                    {r.moinsCherPourToi === n.negoceId && !n.premierSurLeTotal ? <span className="text-[13px] font-bold text-ok">Le moins cher pour toi</span> : null}
                    {!n.complet ? <span className="text-[13px] font-bold text-warn">{`Il n'a pas chiffré ${n.manquantes} article${n.manquantes > 1 ? "s" : ""} de ta liste`}</span> : null}
                    {!n.livrable ? <span className="text-[13px] font-bold text-warn">Ne livre pas ta zone</span> : null}
                    {n.indicatives.length > 0 ? <span className="text-[13px] text-muted">{`Prix indicatifs, hors total et hors garantie : ${n.indicatives.map((i) => `${i.designation} ${euros(i.prixUnitaire)}`).join(" · ")}`}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!commande && !selection ? (
            <p role="status" className="rounded-xl bg-warn-bg p-4 text-[14px] font-semibold text-warn">
              Aucun négoce n&apos;a chiffré toute ta liste : commande-la en direct chez ton négoce.
            </p>
          ) : null}
          {!commande && selection && !confirmer ? (
            <Button onClick={() => setConfirmer(true)}>{`Commander chez ${selection.nom}`}</Button>
          ) : null}
          {!commande && selection && confirmer ? (
            <ConfirmationCommande negoce={selection.nom} pending={pending === "commander"} onAnnuler={() => setConfirmer(false)} onConfirmer={() => run("commander", () => api(`/v1/commande-du-mois/${encodeURIComponent(c.cycleId)}/commander`, { method: "POST", body: { negoceId: selection.negoceId } }))} />
          ) : null}
          <p className="text-[14px] text-muted">Sans engagement : tu commandes seulement si le prix te plaît. Le bon part au négoce, avec ton nom ; tu paies sur ton compte, comme d&apos;habitude.</p>
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
        <p className="text-[14px] text-muted">{`Les prix de la commande ${g.de}, tenus pour tout couvreur du ${g.zone} jusqu'au ${jourMois(g.jusquau)}. Livraison : ${g.livraison}`}</p>
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
