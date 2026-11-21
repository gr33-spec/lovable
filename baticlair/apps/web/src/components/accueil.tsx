"use client";

import { Camera, Check, ChevronRight, FileText, Mic, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { monActivite, type CarteActivite } from "../../../../packages/domain/src/accueil/accueil";
import { accompagnement, artisansDuMetier, CHRONO_MS, compteARebours, deDepartement, phraseGroupe } from "../../../../packages/domain/src/accueil/mon-activite";
import { InstallHint } from "@/components/install-hint";
import { BandeauReprises } from "@/components/reprises";
import { useGroupeActif } from "@/components/app-nav";
import { lienAchat } from "@/components/ag-v1-accueil";
import type { AchatV1, BesoinV1 } from "@/lib/ag-v1";
import { api, type NextAction, type ProjectPage } from "@/lib/api";
import type { Brouillon } from "@/lib/brouillon";
import { dicteeDisponible } from "@/lib/dictee";
import { creditsDesPhotos, photoDuQuantitatif, PHOTO_GROUPES, type PhotoAccueil } from "@/lib/photos-accueil";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";
import type { CarteAchat, MesAchats } from "@/lib/achat-groupe";
import { moisAbrege } from "@/lib/titres";

/**
 * L'ACCUEIL PREMIUM (Greg, 20 novembre 2026 : « un écran magnifique, premium, évident », compris en 2 secondes sur
 * téléphone). RÈGLE CHANGÉE pour le tableau de bord du 15 novembre (« À faire maintenant », « Mes demandes en cours »,
 * « Messages et réponses », « Achats groupés qui peuvent t'intéresser », « Missions près de toi », « Activité récente ») :
 * TROIS ZONES, dans cet ordre.
 * A. « Nouveau quantitatif » : la photo du métier, le bouton (le même mot que dans le « + »), et devis / photo / dictée
 *    seulement s'ils marchent vraiment ici ; chacun ouvre le parcours existant.
 * B. « Mon activité » : la fusion de « À faire maintenant » et « Mes demandes en cours » ; un dossier n'apparaît JAMAIS
 *    deux fois (`monActivite`) ; deux cartes sur téléphone, les plus pressantes, puis « Voir tout » (onglet Demandes) ;
 *    rien à montrer : la zone n'existe pas.
 * C. « Achats groupés » : le métier et le département de l'entreprise ; un groupé ouvert de son métier avec « Rejoindre »
 *    (règle des 3, chrono à moins de 48 h), sinon « Sois le premier dans ton département » vers le parcours « Besoin
 *    groupé » du « + ». Plus de bloc Missions ni de grande carte « Messages et réponses » sur l'accueil.
 * Rien n'est inventé : chaque carte vient des dossiers de l'entreprise connectée, ou de ce que l'API rend déjà anonymisé.
 */

/** Les lots d'achat groupé d'un métier de l'entreprise. */
const LOTS_DU_METIER: Record<string, string[]> = {
  roofing: ["couverture", "zinguerie"],
  waterproofing: ["couverture"],
  carpentry: ["bois"],
  decking: ["bois"],
  cladding: ["bois"],
  drywall: ["platrerie", "isolation"],
  ceiling: ["platrerie"],
  electrical: ["electricite"],
  solar: ["electricite"],
  plumbing: ["plomberie"],
  hvac: ["plomberie"],
  masonry: ["maconnerie"],
  facade: ["maconnerie"],
  joinery: ["menuiserie"],
  interior_joinery: ["menuiserie"],
  painting: ["peinture"],
};

/** Deux cartes sur téléphone, quatre sur ordinateur (à côté de la grande carte, sans vide). */
const CARTES_TELEPHONE = 2;
const CARTES_ORDINATEUR = 4;

const CLE_ACCOMPAGNEMENT = "mobiiz:accueil:accompagnement";
const CLE_GROUPES_VUS = "mobiiz:accueil:groupes-vus";
const lire = (cle: string): string | null => {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
};
const ecrire = (cle: string, valeur: string) => {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    /* navigation privée : l'accompagnement suit les dossiers, rien ne casse */
  }
};

/** Une valeur lue sur l'appareil (stockage, navigateur) : rien à écouter, lue à l'affichage, jamais au serveur. */
const sansAbonnement = () => () => {};

const jourCourt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso)) : null);
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const projetDeUrl = (url: string) => /^\/chantiers\/([0-9a-f-]{36})/.exec(url)?.[1] ?? null;
/** Une date seule (« 2026-11-21 ») se lit jusqu'à la fin du jour, comme `finDans`. */
const finDuJour = (iso: string) => (iso.length === 10 ? new Date(`${iso}T23:59:59`).toISOString() : iso);

type Carte = CarteActivite;
const minuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

function cartesDesBrouillons(brouillons: Brouillon<unknown>[]): Carte[] {
  return brouillons.map((b) => {
    const base = { cle: `b-${b.cle}`, dossier: projetDeUrl(b.url) ?? `b-${b.cle}`, immediate: false, echeance: null, modifieLe: b.modifieLe, action: "Continuer", href: b.url, titre: b.titre };
    if (b.type === "envoi") return { ...base, sorte: "brouillon-demande" as const, type: "Demande de prix" as const, info: "À terminer" };
    if (b.type === "achat-groupe") return { ...base, sorte: "brouillon-achat" as const, type: "Achat groupé" as const, info: "À terminer" };
    return { ...base, sorte: "brouillon-liste" as const, type: "Quantitatif" as const, info: "À terminer" };
  });
}

function cartesDesAchats(achats: CarteAchat[]): Carte[] {
  const out: Carte[] = [];
  for (const c of achats) {
    if (c.etat === "offre")
      out.push({ cle: `o-${c.id}`, dossier: `achat-${c.id}`, sorte: "achat-offre", immediate: true, echeance: c.commandeAvantLe, modifieLe: null, type: "Achat groupé", titre: c.titreAchat, info: c.commandeAvantLe ? `Offre reçue · à choisir avant le ${jourCourt(c.commandeAvantLe)}` : "Offre reçue", action: "Voir l'offre", href: `/achats-groupes/${c.id}` });
    else if (c.etat === "pas_assez" && c.actions.planB)
      out.push({ cle: `p-${c.id}`, dossier: `achat-${c.id}`, sorte: "achat-pas-assez", immediate: true, echeance: null, modifieLe: null, type: "Achat groupé", titre: c.titreAchat, info: "Pas assez de volume cette fois", action: "Voir", href: `/achats-groupes/${c.id}` });
  }
  return out;
}

function cartesDesRapprochements(items: { cle: string; texte: string; href: string }[]): Carte[] {
  return items.map((r) => {
    const groupe = r.cle.startsWith("ag-");
    const [info, action] = r.cle.startsWith("ag-reconfirmer:")
      ? ["Reconfirme ta quantité", "Reconfirmer"]
      : r.cle.startsWith("ag-offre:")
        ? ["Offre à examiner", "Voir l'offre"]
        : r.cle.startsWith("ag-confirmer:")
          ? ["Besoin à confirmer", "Confirmer"]
          : r.cle.startsWith("precision:")
            ? ["Une question sur ta demande", "Répondre"]
            : ["Un besoin proche du tien", "Voir"];
    return { cle: r.cle, dossier: projetDeUrl(r.href) ?? r.href, sorte: "rapprochement" as const, immediate: true, echeance: null, modifieLe: null, type: groupe ? ("Achat groupé" as const) : ("Demande de prix" as const), titre: r.texte, info, action, href: r.href };
  });
}

function cartesDesListes(next: NextAction[], projets: Map<string, { lastActivityAt: string }>, dejaBrouillon: Set<string>): Carte[] {
  const out: Carte[] = [];
  // Une liste dont un parcours est en cours (brouillon) se reprend par lui : sa carte passe devant.
  for (const n of next.filter((x) => !dejaBrouillon.has(x.projectId))) {
    const modifieLe = projets.get(n.projectId)?.lastActivityAt ?? null;
    if (n.kind === "validate_list") out.push({ cle: `n-${n.projectId}`, dossier: n.projectId, sorte: "liste-a-verifier", immediate: false, echeance: null, modifieLe, type: "Quantitatif", titre: n.projectName, info: "À vérifier", action: "Vérifier", href: `/chantiers/${n.projectId}` });
    else if (n.kind === "send_requests") out.push({ cle: `n-${n.projectId}`, dossier: n.projectId, sorte: "demande-a-envoyer", immediate: false, echeance: null, modifieLe, type: "Quantitatif", titre: n.projectName, info: "Prête, à envoyer à tes négoces", action: "Demander les prix", href: `/chantiers/${n.projectId}#fournisseurs` });
  }
  return out;
}

/** Une demande partie et pas encore tranchée : avec ou sans réponse. Une seule information par carte. */
function cartesDesDemandes(projets: ProjectPage["items"]): Carte[] {
  return projets.flatMap((p): Carte[] => {
    const d = p.resume?.demande;
    if (!d || d.choisi || d.regle) return [];
    const base = { cle: `d-${p.id}`, dossier: p.id, sorte: "demande-reponses" as const, echeance: null, modifieLe: p.lastActivityAt, type: "Demande de prix" as const, titre: p.name };
    const recues = d.reponses > 1 ? `${d.reponses} réponses reçues` : "1 réponse reçue";
    if (d.aSuivre) return [{ ...base, immediate: true, info: "Où en es-tu avec cette demande ?", action: "Ouvrir", href: `/chantiers/${p.id}#fournisseurs` }];
    if (d.reponses > 0) return [{ ...base, immediate: true, info: recues, action: d.reponses > 1 ? "Comparer" : "Voir", href: `/chantiers/${p.id}?onglet=offres` }];
    return [{ ...base, immediate: false, info: `Envoyée à ${pluriel(d.negoces, "négoce", "négoces")}, en attente`, action: "Suivre", href: `/chantiers/${p.id}` }];
  });
}

function cartesDesBesoins(besoins: { aFaire: BesoinV1[]; enCours: BesoinV1[] }): Carte[] {
  return [...besoins.aFaire.map((b) => ({ b, action: true })), ...besoins.enCours.map((b) => ({ b, action: false }))]
    .filter(({ b }) => b.etat !== "retire")
    .map(({ b, action }) => ({
      cle: `g-${b.id}`,
      dossier: `besoin-${b.id}`,
      sorte: "rapprochement" as const,
      immediate: action,
      echeance: null,
      modifieLe: b.achat.resume?.derniereEvolution ?? null,
      type: "Achat groupé" as const,
      titre: b.nom,
      info: action ? b.statut.libelle : `${b.statut.libelle} · ${minuscule(phraseGroupe(b.achat.resume))}`,
      action: action ? "Ouvrir" : "Suivre",
      href: `/achats-groupes/besoins/${b.id}`,
    }));
}

export function AccueilMaquette() {
  const { me, company, features } = useSession();
  const prenom = me.user.name.split(" ")[0] ?? me.user.name;
  const metiers = company?.trades ?? me.companies[0]?.trades ?? [];
  const groupe = useGroupeActif();
  const { data: brouillons } = useResource(useCallback((s: AbortSignal) => api<{ items: Brouillon<unknown>[] }>("/v1/brouillons", { signal: s }).catch(() => ({ items: [] })), []));
  const { data: mes } = useResource(useCallback((s: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal: s }).catch(() => null), []));
  const { data: next } = useResource(useCallback((s: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal: s }).catch(() => ({ items: [] })), []));
  const { data: projets } = useResource(useCallback((s: AbortSignal) => api<ProjectPage>("/v1/projects?limit=30&resume=1", { signal: s }).catch(() => ({ items: [], nextCursor: null })), []));
  const { data: rapprochements } = useResource(useCallback((s: AbortSignal) => api<{ items: { cle: string; texte: string; href: string }[] }>("/v1/rapprochements/actions", { signal: s }).catch(() => ({ items: [] })), []));
  const { data: ouverts } = useResource(useCallback((s: AbortSignal) => (groupe ? api<{ zone: { code: string; nom: string } | null; achats: AchatV1[] }>("/v1/ag/achats", { signal: s }).catch(() => ({ zone: null, achats: [] })) : Promise.resolve(null)), [groupe]));
  const { data: besoins } = useResource(useCallback((s: AbortSignal) => (groupe ? api<{ aFaire: BesoinV1[]; enCours: BesoinV1[] }>("/v1/ag/besoins", { signal: s }).catch(() => ({ aFaire: [], enCours: [] })) : Promise.resolve({ aFaire: [] as BesoinV1[], enCours: [] as BesoinV1[] })), [groupe]));

  const charge = brouillons !== null && next !== null && projets !== null && besoins !== null;
  const parProjet = new Map(projets?.items.map((p) => [p.id, p]) ?? []);
  const activite = charge
    ? monActivite([...cartesDesBrouillons(brouillons.items), ...cartesDesAchats(mes?.achats ?? []), ...cartesDesDemandes(projets.items), ...cartesDesListes(next.items, parProjet, new Set(brouillons.items.map((b) => projetDeUrl(b.url)).filter((x): x is string => x !== null))), ...cartesDesRapprochements(rapprochements?.items ?? []), ...cartesDesBesoins(besoins)])
    : [];

  return (
    <div className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-[72rem] lg:gap-6">
      {/* Greg : seule retouche de l'en-tête de page, un « Bonjour » moins haut. */}
      <h1 className="font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em] lg:text-[28px]">Bonjour {prenom}</h1>
      <BandeauReprises />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-6">
        <div className="flex flex-col gap-5 lg:row-span-2">
          <ZoneQuantitatif photo={photoDuQuantitatif(metiers)} analyses={features.ai} />
          {/* L'accompagnement vient SOUS la grande carte : « Nouveau quantitatif » se voit sans défiler, même sur un petit iPhone. */}
          {charge ? <Accompagnement listes={projets.items.length} demandes={projets.items.filter((p) => p.resume?.demande).length} besoinsGroupes={besoins.aFaire.length + besoins.enCours.length} groupe={groupe} /> : null}
        </div>
        {!charge ? (
          <ActiviteChargement />
        ) : activite.length > 0 ? (
          <ZoneActivite cartes={activite} />
        ) : null}
        {groupe ? <ZoneGroupes ouverts={ouverts} metiers={metiers} /> : null}
      </div>

      <Credits photos={[photoDuQuantitatif(metiers), ...(groupe ? [PHOTO_GROUPES] : [])]} />
      <InstallHint />
    </div>
  );
}

/** Une photo légère : AVIF puis WebP, la taille qui suit l'écran, chargée tout de suite (en haut) ou plus tard. */
function Photo({ photo, prioritaire, className, tailles }: { photo: PhotoAccueil; prioritaire: boolean; className: string; tailles: string }) {
  const srcset = (f: "avif" | "webp") => photo.tailles.map((t) => `${t[f]} ${t.largeur}w`).join(", ");
  return (
    <picture>
      <source type="image/avif" srcSet={srcset("avif")} sizes={tailles} />
      <source type="image/webp" srcSet={srcset("webp")} sizes={tailles} />
      <img src={photo.tailles[0]!.webp} alt={photo.alt} width={photo.largeur} height={photo.hauteur} loading={prioritaire ? "eager" : "lazy"} fetchPriority={prioritaire ? "high" : "auto"} decoding="async" className={className} style={{ objectPosition: photo.cadrage }} />
    </picture>
  );
}

/** A. « Nouveau quantitatif » : la photo du métier, une phrase, LE bouton jaune, puis trois accès discrets qui marchent ici. */
function ZoneQuantitatif({ photo, analyses }: { photo: PhotoAccueil; analyses: boolean }) {
  // La dictée dépend du navigateur : connue seulement après l'affichage (jamais un accès montré puis retiré au serveur).
  const dictee = useSyncExternalStore(sansAbonnement, dicteeDisponible, () => false);
  const acces = [
    analyses ? { id: "devis", icone: FileText, texte: "Mon devis", label: "Partir de mon devis" } : null,
    analyses ? { id: "photo", icone: Camera, texte: "Photo", label: "Partir d'une photo" } : null,
    dictee ? { id: "dictee", icone: Mic, texte: "Dicter", label: "Dicter ma liste" } : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null);
  return (
    <section aria-label="Nouveau quantitatif" className="accueil-apparait overflow-hidden rounded-[20px] bg-surface shadow-card lg:flex lg:h-full lg:flex-col">
      <div className="relative">
        <Photo photo={photo} prioritaire tailles="(min-width: 1024px) 640px, 100vw" className="aspect-[2/1] w-full object-cover lg:aspect-[16/10]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 lg:p-6">
          <h2 className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] text-white text-balance lg:text-[34px]">Prépare ta liste de matériaux</h2>
          <p className="text-[15px] leading-snug text-white/90 lg:text-[17px]">Prête pour tes négoces.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4 lg:flex-1 lg:justify-end lg:p-6">
        <Link href="/chantiers/nouveau" className="pressable flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-[17px] font-extrabold text-on-accent">
          Nouveau quantitatif
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
        {acces.length > 0 ? (
          <div role="group" aria-label="Autres façons de commencer" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${acces.length}, minmax(0, 1fr))` }}>
            {acces.map(({ id, icone: Icone, texte, label }) => (
              <Link key={id} href={`/chantiers/nouveau?mode=assistant&entree=${id}`} aria-label={label} className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-ink/30 px-2 text-[14px] font-bold whitespace-nowrap text-ink">
                <Icone size={18} aria-hidden="true" />
                {texte}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EnTeteZone({ id, titre, href, lien, label }: { id: string; titre: string; href?: string; lien?: string; label?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-[20px] leading-tight font-extrabold tracking-[-0.02em]">
        {titre}
      </h2>
      {href ? (
        <Link href={href} aria-label={label} className="flex min-h-12 shrink-0 items-center gap-1 text-[14px] font-extrabold text-accent-text">
          {lien}
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

/** Le chargement de « Mon activité » : deux silhouettes de la taille des vraies cartes. */
function ActiviteChargement() {
  const [lent, setLent] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLent(true), 10_000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <section role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Chargement de ton activité…</span>
      {lent ? (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-surface p-4 shadow-card">
          <p className="text-[15px] font-bold">Connexion lente</p>
          <button type="button" onClick={() => window.location.reload()} className="pressable flex min-h-12 items-center rounded-full border border-ink/30 px-4 text-[14px] font-extrabold">
            Réessayer
          </button>
        </div>
      ) : null}
      <div aria-hidden="true" className="h-11 w-40 rounded-full" />
      {[0, 1].map((i) => (
        <div key={i} aria-hidden="true" className="animate-pulse-soft h-[88px] rounded-[20px] bg-surface shadow-card" />
      ))}
    </section>
  );
}

/** B. « Mon activité » : un dossier une fois, les plus pressants d'abord, « Voir tout » vers l'onglet Demandes. */
function ZoneActivite({ cartes }: { cartes: Carte[] }) {
  const visibles = cartes.slice(0, CARTES_ORDINATEUR);
  return (
    <section aria-labelledby="zone-activite" className="accueil-apparait flex flex-col gap-3">
      <EnTeteZone id="zone-activite" titre="Mon activité" href="/demandes" lien="Voir tout" label="Voir toutes mes demandes" />
      <ul className="flex flex-col gap-3">
        {visibles.map((c, i) => (
          <li key={c.dossier} className={i >= CARTES_TELEPHONE ? "hidden lg:block" : undefined}>
            <Link href={c.href} aria-label={`${c.action} : ${c.type}, ${c.titre}, ${c.info}`} className="pressable flex min-h-[88px] items-center gap-3 rounded-[20px] bg-surface p-4 shadow-card">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[12px] font-bold tracking-[0.04em] text-muted uppercase">{c.type}</span>
                <span className="truncate text-[17px] leading-tight font-extrabold">{moisAbrege(c.titre)}</span>
                <span className="text-[14px] leading-snug text-muted">{c.info}</span>
              </span>
              {/* Une seule action forte par zone : la première carte, la plus pressante. */}
              <span className={`flex min-h-12 shrink-0 items-center rounded-full px-4 text-[14px] font-extrabold ${i === 0 ? "bg-accent text-on-accent" : "border border-ink/25 text-ink"}`}>{c.action}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Le chrono d'un groupé qui ferme dans moins de 48 h : la vraie clôture, chaque seconde, puis « Clôturé ». */
function useChrono(clotureIso: string | null) {
  const [maintenant, setMaintenant] = useState<number | null>(() => (typeof window === "undefined" ? null : Date.now()));
  // Plus de 48 h avant la clôture : aucun décompte (rien ne tourne pour rien sur un vieux téléphone).
  const proche = clotureIso !== null && maintenant !== null && Date.parse(clotureIso) - maintenant <= CHRONO_MS;
  useEffect(() => {
    if (!clotureIso || !proche) return;
    const t = window.setInterval(() => setMaintenant(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [clotureIso, proche]);
  return clotureIso && maintenant !== null ? compteARebours(clotureIso, maintenant) : null;
}

/** C. « Achats groupés » : son métier et son département ; un groupé ouvert avec « Rejoindre », ou « Sois le premier ». */
function ZoneGroupes({ ouverts, metiers }: { ouverts: { zone: { code: string; nom: string } | null; achats: AchatV1[] } | null; metiers: string[] }) {
  const zone = ouverts?.zone ?? null;
  const artisans = artisansDuMetier(metiers);
  const lieu = zone ? deDepartement(zone.code, zone.nom) : null;
  const mesLots = new Set(metiers.flatMap((t) => LOTS_DU_METIER[t] ?? []));
  // Son métier seulement ; ceux où il n'est pas encore d'abord ; la clôture la plus proche d'abord (ordre de l'API).
  const duMetier = (ouverts?.achats ?? []).filter((a) => mesLots.size === 0 || mesLots.has(a.lot));
  const achat = duMetier.find((a) => !a.monBesoinId) ?? duMetier[0] ?? null;
  // Déjà dedans : on ne l'invite pas à « rejoindre » ce qu'il a rejoint.
  const titre = achat?.monBesoinId ? `Les ${artisans} ${lieu ?? "de ton secteur"} achètent ensemble` : `Rejoins les ${artisans} ${lieu ?? "de ton secteur"}`;
  const chrono = useChrono(achat ? finDuJour(achat.ouvertJusquau) : null);
  const vu = () => ecrire(CLE_GROUPES_VUS, "1");

  if (ouverts === null) return <div aria-hidden="true" className="animate-pulse-soft h-[260px] rounded-[20px] bg-surface shadow-card" />;

  if (!achat)
    return (
      <section aria-labelledby="zone-groupes" className="accueil-apparait flex flex-col gap-3">
        <EnTeteZone id="zone-groupes" titre="Achats groupés" />
        <div className="flex items-center gap-4 rounded-[20px] bg-surface p-4 shadow-card">
          <Photo photo={PHOTO_GROUPES} prioritaire={false} tailles="80px" className="size-20 shrink-0 rounded-2xl object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-[17px] leading-tight font-extrabold text-balance">Sois le premier dans ton département</p>
            <p className="text-[14px] leading-snug text-muted">Aucun achat groupé en cours. Publie ton besoin : les autres {artisans} pourront le rejoindre.</p>
            <Link href="/achats-groupes/publier" onClick={vu} className="pressable flex min-h-12 items-center self-start rounded-full bg-accent px-4 text-[14px] font-extrabold text-on-accent">
              Publier un besoin groupé
            </Link>
          </div>
        </div>
      </section>
    );

  const clos = chrono?.clos === true;
  return (
    <section aria-labelledby="zone-groupes" className="accueil-apparait flex flex-col gap-3">
      <EnTeteZone id="zone-groupes" titre="Achats groupés" href="/achats-groupes" lien="Voir tout" label="Voir tous les achats groupés" />
      {/* Toute la carte mène à l'onglet Groupés ; « Rejoindre » mène au regroupement lui-même. */}
      <div className="relative overflow-hidden rounded-[20px] bg-surface shadow-card">
        <div className="relative">
          <Photo photo={PHOTO_GROUPES} prioritaire={false} tailles="(min-width: 1024px) 480px, 100vw" className="aspect-[21/9] w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <Link href="/achats-groupes" onClick={vu} className="absolute inset-x-0 bottom-0 p-4 text-[18px] leading-tight font-extrabold text-white text-balance after:absolute after:inset-0 after:content-['']">
            {titre}
          </Link>
        </div>
        <div className="flex items-end justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-[17px] leading-tight font-extrabold">{achat.nom}</p>
            <p className="text-[14px] leading-snug text-muted">{phraseGroupe(achat.resume)}</p>
            {chrono ? (
              <p className="flex items-center gap-1.5 text-[14px] font-bold whitespace-nowrap" aria-live="off">
                {clos ? (
                  "Clôturé"
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                    Clôture dans <span className="tabular-nums">{chrono.texte}</span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-[14px] text-muted">Clôture le {jourCourt(finDuJour(achat.ouvertJusquau))}</p>
            )}
          </div>
          {clos ? null : (
            <Link href={achat.monBesoinId ? `/achats-groupes/besoins/${achat.monBesoinId}` : lienAchat(achat)} onClick={vu} className="pressable relative z-10 flex min-h-12 shrink-0 items-center rounded-full bg-accent px-5 text-[15px] font-extrabold text-on-accent">
              {achat.monBesoinId ? "Voir" : "Rejoindre"}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * L'ACCOMPAGNEMENT D'UN NOUVEAU COMPTE : compact, facultatif, trois étapes qui se cochent d'après les vrais dossiers, une
 * croix qui le ferme pour de bon (sur cet appareil). Il apparaît à un compte sans aucune liste ; une fois commencé, il reste
 * jusqu'à la fermeture ou la dernière coche.
 */
function Accompagnement({ listes, demandes, besoinsGroupes, groupe }: { listes: number; demandes: number; besoinsGroupes: number; groupe: boolean }) {
  const lu = useSyncExternalStore(sansAbonnement, () => lire(CLE_ACCOMPAGNEMENT), () => undefined);
  const [fermeIci, setFermeIci] = useState(false);
  const etat = fermeIci ? "ferme" : lu;
  const etapes = accompagnement({ listes, demandes, groupesVus: lire(CLE_GROUPES_VUS) === "1", besoinsGroupes }).filter((e) => groupe || e.id !== "groupes");
  const fini = etapes.every((e) => e.faite);
  const montre = etat !== undefined && etat !== "ferme" && !fini && (etat === "ouvert" || listes === 0);
  useEffect(() => {
    if (montre && etat !== "ouvert") ecrire(CLE_ACCOMPAGNEMENT, "ouvert");
    if (fini && etat === "ouvert") ecrire(CLE_ACCOMPAGNEMENT, "ferme");
  }, [montre, fini, etat]);
  if (!montre) return null;
  const faites = etapes.filter((e) => e.faite).length;
  return (
    <section aria-labelledby="accompagnement" className="accueil-apparait rounded-[20px] bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="accompagnement" className="text-[15px] font-extrabold">
          Pour bien démarrer <span className="font-bold text-muted">· {faites}/{etapes.length}</span>
        </h2>
        <button
          type="button"
          aria-label="Fermer l'accompagnement"
          onClick={() => {
            ecrire(CLE_ACCOMPAGNEMENT, "ferme");
            setFermeIci(true);
          }}
          className="-mr-2 grid size-11 place-items-center rounded-full"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <ol className="mt-1 flex flex-col gap-1 sm:flex-row sm:gap-2">
        {etapes.map((e) => (
          <li key={e.id} className="sm:flex-1">
            <Link href={e.href} onClick={e.id === "groupes" ? () => ecrire(CLE_GROUPES_VUS, "1") : undefined} aria-label={`${e.titre}${e.faite ? " (fait)" : ""}`} className="pressable flex min-h-12 items-center gap-3 rounded-2xl px-1 text-[15px] font-bold">
              <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full ${e.faite ? "bg-ok text-white" : "border-2 border-ink/30"}`}>
                {e.faite ? <Check size={14} strokeWidth={3} /> : null}
              </span>
              <span className={e.faite ? "text-muted line-through decoration-1" : undefined}>{e.titre}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Le crédit des photos dont la licence l'exige (CC BY, CC BY-SA), en petit, en bas de l'accueil. */
function Credits({ photos }: { photos: PhotoAccueil[] }) {
  const credits = creditsDesPhotos(photos);
  if (credits.length === 0) return null;
  return <p className="pt-2 text-[12px] leading-snug text-muted">Photos : {credits.join(" ; ")}.</p>;
}
