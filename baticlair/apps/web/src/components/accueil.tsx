"use client";

import { ClipboardList, MessagesSquare } from "lucide-react";
import type { ElementBoite } from "../../../../packages/domain/src/missions/missions";
import Link from "next/link";
import { useCallback, useState } from "react";
import { actionPrioritaire, lienAutres, type ActionCandidate } from "../../../../packages/domain/src/accueil/accueil";
import { InstallHint } from "@/components/install-hint";
import { BandeauReprises } from "@/components/reprises";
import { Skeleton } from "@/components/ui";
import { CarteLien, Etiquette } from "@/components/ux-kit";
import { useGroupeActif } from "@/components/app-nav";
import { useMissionsActif, type AnnonceVue } from "@/lib/missions";
import { dateCourte, libelleLot, type AchatV1, type BesoinV1 } from "@/lib/ag-v1";
import { finDans, lienAchat } from "@/components/ag-v1-accueil";
import { api, type NextAction, type ProjectPage } from "@/lib/api";
import type { Brouillon } from "@/lib/brouillon";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";
import type { CarteAchat, MesAchats } from "@/lib/achat-groupe";
import { moisAbrege } from "@/lib/titres";

/**
 * L'ACCUEIL EN TABLEAU DE BORD (Greg, 15 novembre 2026, lot UX mobile ; RÈGLE CHANGÉE pour les trois grandes cartes du
 * 10 novembre, qui doublonnaient le menu du bas). « Bonjour [prénom] », puis seulement ce qui existe vraiment :
 * 1) « À faire maintenant » : ce qui attend l'artisan, le plus pressant d'abord (`actionPrioritaire` : action requise,
 *    échéance, récence) ; 2) « Achats groupés qui peuvent t'intéresser » : trois au plus, ouverts dans SON département,
 *    ceux de son métier d'abord, puis ceux qui se terminent le plus tôt ; jamais ceux où il est déjà ; 3) « Missions près
 *    de toi » : trois au plus, dans son département, seulement si Mission est active ; 4) « Activité récente » : ses
 *    dernières listes. Une section sans rien à montrer n'existe pas. Rien n'est inventé : chaque carte vient d'une donnée
 *    de l'API, et aucun nom d'une autre entreprise ne paraît ici (un achat groupé se dit par son produit, une mission par
 *    son métier et sa ville). Rien ici n'envoie quoi que ce soit : chaque carte ouvre son écran.
 */

/** Trois cartes au plus par section, puis « Voir tout ». */
const MAX_CARTES = 3;
/** Les lots d'achat groupé d'un métier de l'entreprise : sert seulement à classer, jamais à cacher. */
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

interface Action extends ActionCandidate {
  statut: string;
  titre: string;
  sousTitre: string;
  bouton: string;
  href: string;
}


const jourCourt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso)) : null);
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const projetDeUrl = (url: string) => /^\/chantiers\/([0-9a-f-]{36})/.exec(url)?.[1] ?? null;

function actionsDeBrouillons(brouillons: Brouillon<unknown>[]): Action[] {
  return brouillons.map((b) => {
    const base = { cle: `b-${b.cle}`, immediate: false, echeance: null, modifieLe: b.modifieLe, statut: "Brouillon", bouton: "Continuer", href: b.url };
    if (b.type === "envoi") {
      const n = Array.isArray((b.donnees as { selected?: unknown })?.selected) ? ((b.donnees as { selected: unknown[] }).selected.length) : 0;
      return { ...base, sorte: "brouillon-demande" as const, titre: "Terminer ta demande de prix", sousTitre: n > 0 ? `Liste vérifiée · ${pluriel(n, "négoce à confirmer", "négoces à confirmer")}` : "Liste vérifiée" };
    }
    if (b.type === "achat-groupe") return { ...base, sorte: "brouillon-achat" as const, titre: "Terminer ton achat groupé", sousTitre: b.titre };
    return { ...base, sorte: "brouillon-liste" as const, titre: "Terminer ta liste", sousTitre: b.titre };
  });
}

function actionsDesAchats(achats: CarteAchat[]): Action[] {
  const out: Action[] = [];
  for (const c of achats) {
    if (c.etat === "offre")
      out.push({ cle: `o-${c.id}`, sorte: "achat-offre", immediate: true, echeance: c.commandeAvantLe, modifieLe: null, statut: "Choix à confirmer", titre: "Choisir ton offre", sousTitre: [c.titreAchat, c.commandeAvantLe ? `Commande avant le ${jourCourt(c.commandeAvantLe)}` : null].filter(Boolean).join(" · "), bouton: "Voir les offres", href: `/achats-groupes/${c.id}` });
    else if (c.etat === "pas_assez" && c.actions.planB)
      out.push({ cle: `p-${c.id}`, sorte: "achat-pas-assez", immediate: true, echeance: null, modifieLe: null, statut: "À décider", titre: "Pas assez de volume cette fois", sousTitre: c.titreAchat, bouton: "Voir", href: `/achats-groupes/${c.id}` });
  }
  return out;
}

function actionsDesRapprochements(items: { cle: string; texte: string; href: string }[]): Action[] {
  return items.map((r) =>
    // Achats groupés V1 (V5.2) : « À faire » est la source de référence ; l'e-mail ne fait que rappeler.
    r.cle.startsWith("ag-reconfirmer:")
      ? { cle: r.cle, sorte: "rapprochement", immediate: true, echeance: null, modifieLe: null, statut: "Préparation de la consultation", titre: r.texte, sousTitre: "Achat groupé", bouton: "Reconfirmer ma quantité", href: r.href }
      : r.cle.startsWith("ag-offre:")
        ? { cle: r.cle, sorte: "rapprochement", immediate: true, echeance: null, modifieLe: null, statut: "Offre à examiner", titre: r.texte, sousTitre: "Achat groupé", bouton: "Voir l'offre", href: r.href }
        : r.cle.startsWith("ag-confirmer:")
          ? { cle: r.cle, sorte: "rapprochement", immediate: true, echeance: null, modifieLe: null, statut: "Besoin indicatif", titre: r.texte, sousTitre: "Achat groupé", bouton: "Confirmer", href: r.href }
          : r.cle.startsWith("precision:")
      ? { cle: r.cle, sorte: "rapprochement", immediate: true, echeance: null, modifieLe: null, statut: "Question", titre: r.texte, sousTitre: "Ta demande de prix", bouton: "Répondre", href: r.href }
      : { cle: r.cle, sorte: "rapprochement", immediate: true, echeance: null, modifieLe: null, statut: "À examiner", titre: r.texte, sousTitre: "Rien n'est ajouté sans ton accord", bouton: "Examiner", href: r.href },
  );
}

function actionsDesListes(next: NextAction[], projets: Map<string, { lastActivityAt: string }>, dejaBrouillon: Set<string>): Action[] {
  const out: Action[] = [];
  for (const n of next) {
    const modifieLe = projets.get(n.projectId)?.lastActivityAt ?? null;
    if (n.kind === "validate_list" && !dejaBrouillon.has(n.projectId))
      out.push({ cle: `n-${n.projectId}`, sorte: "liste-a-verifier", immediate: false, echeance: null, modifieLe, statut: "À vérifier", titre: "Vérifier ta liste", sousTitre: n.projectName, bouton: "Continuer", href: `/chantiers/${n.projectId}` });
    else if (n.kind === "send_requests" && !dejaBrouillon.has(n.projectId))
      out.push({ cle: `n-${n.projectId}`, sorte: "demande-a-envoyer", immediate: false, echeance: null, modifieLe, statut: "Liste prête", titre: "Demander les prix à tes négoces", sousTitre: n.projectName, bouton: "Continuer", href: `/chantiers/${n.projectId}#fournisseurs` });
  }
  return out;
}

/** Une demande dont un négoce a répondu, pas encore tranchée : la réponse attend l'artisan (le même résumé que le suivi). */
function actionsDesReponses(projets: ProjectPage["items"]): Action[] {
  return projets.flatMap((p) => {
    const d = p.resume?.demande;
    // « C'est réglé » (16 novembre 2026) sort la demande de « À faire » ; le rappel à 7 jours y pose sa question.
    if (!d || d.choisi || d.regle || d.reponses === 0) return [];
    if (d.aSuivre) return [{ cle: `r-${p.id}`, sorte: "demande-reponses" as const, immediate: true, echeance: null, modifieLe: p.lastActivityAt, statut: "Rappel", titre: "Où en es-tu avec cette demande ?", sousTitre: `${p.name} · ${d.reponses > 1 ? `${d.reponses} réponses reçues` : "1 réponse reçue"}`, bouton: "Ouvrir", href: `/chantiers/${p.id}#fournisseurs` }];
    return [{ cle: `r-${p.id}`, sorte: "demande-reponses" as const, immediate: true, echeance: null, modifieLe: p.lastActivityAt, statut: d.reponses > 1 ? `${d.reponses} réponses reçues` : "1 réponse reçue", titre: "Voir les réponses de tes négoces", sousTitre: `${p.name} · ${pluriel(d.negoces, "négoce consulté", "négoces consultés")}`, bouton: "Voir les réponses", href: `/chantiers/${p.id}#fournisseurs` }];
  });
}



export function AccueilMaquette() {
  const { me } = useSession();
  const prenom = me.user.name.split(" ")[0] ?? me.user.name;
  const { data: brouillons } = useResource(useCallback((s: AbortSignal) => api<{ items: Brouillon<unknown>[] }>("/v1/brouillons", { signal: s }).catch(() => ({ items: [] })), []));
  const { data: mes } = useResource(useCallback((s: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal: s }).catch(() => null), []));
  const { data: next } = useResource(useCallback((s: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal: s }).catch(() => ({ items: [] })), []));
  const { data: projets } = useResource(useCallback((s: AbortSignal) => api<ProjectPage>("/v1/projects?limit=30&resume=1", { signal: s }).catch(() => ({ items: [], nextCursor: null })), []));
  // Greg, 6 novembre 2026 : les rapprochements à examiner, et une ligne commandée seule mais encore dans un achat groupé.
  const { data: rapprochements } = useResource(useCallback((s: AbortSignal) => api<{ items: { cle: string; texte: string; href: string }[] }>("/v1/rapprochements/actions", { signal: s }).catch(() => ({ items: [] })), []));
  const [tout, setTout] = useState(false);
  const groupe = useGroupeActif();
  const missions = useMissionsActif() === true;
  // Les suggestions : coupé (404) ou en panne, la section n'existe pas ; l'accueil ne casse jamais pour elles.
  const { data: ouverts } = useResource(useCallback((s: AbortSignal) => (groupe ? api<{ achats: AchatV1[] }>("/v1/ag/achats", { signal: s }).catch(() => ({ achats: [] })) : Promise.resolve({ achats: [] as AchatV1[] })), [groupe]));
  const { data: besoins } = useResource(useCallback((s: AbortSignal) => (groupe ? api<{ aFaire: BesoinV1[]; enCours: BesoinV1[] }>("/v1/ag/besoins", { signal: s }).catch(() => ({ aFaire: [], enCours: [] })) : Promise.resolve({ aFaire: [] as BesoinV1[], enCours: [] as BesoinV1[] })), [groupe]));
  const { data: annonces } = useResource(useCallback((s: AbortSignal) => (missions ? api<{ departement: string | null; items: AnnonceVue[] }>("/v1/missions/annonces?type=mission", { signal: s }).catch(() => ({ departement: null, items: [] })) : Promise.resolve({ departement: null, items: [] as AnnonceVue[] })), [missions]));

  // Lot G (Greg, 15 novembre 2026) : la boîte unique « Messages et réponses » (réponses des négoces, messages Mobiiz,
  // conversations Missions), avec le même état lu que la cloche. En panne : le bloc n'existe pas, l'accueil tient.
  const { data: boite } = useResource(useCallback((s: AbortSignal) => api<{ items: ElementBoite[] }>("/v1/boite", { signal: s }).catch(() => null), []));

  const charge = brouillons !== null && next !== null && projets !== null;
  const achats = mes?.achats ?? [];
  const parProjet = new Map(projets?.items.map((p) => [p.id, p]) ?? []);
  const projetsBrouillon = new Set((brouillons?.items ?? []).map((b) => projetDeUrl(b.url)).filter((x): x is string => x !== null));
  const candidats = charge ? [...actionsDeBrouillons(brouillons.items), ...actionsDesAchats(achats), ...actionsDesReponses(projets.items), ...actionsDesListes(next.items, parProjet, projetsBrouillon), ...actionsDesRapprochements(rapprochements?.items ?? [])] : [];
  const { premiere, autres } = actionPrioritaire(candidats);
  const lien = lienAutres(autres);

  // Achats groupés : pas ceux où il est déjà ; son métier d'abord, puis la fin la plus proche.
  const mesLots = new Set((me.companies[0]?.trades ?? []).flatMap((t) => LOTS_DU_METIER[t] ?? []));
  const dejaDedans = new Set([...(besoins?.aFaire ?? []), ...(besoins?.enCours ?? [])].map((b) => b.achat.id));
  const suggestions = besoins === null ? [] : (ouverts?.achats ?? []).filter((a) => !dejaDedans.has(a.id)).sort((x, y) => Number(mesLots.has(y.lot)) - Number(mesLots.has(x.lot)) || x.ouvertJusquau.localeCompare(y.ouvertJusquau));
  // Missions : celles de son département, pas les siennes ; l'API les rend déjà par date de début.
  const pres = (annonces?.items ?? []).filter((a) => !a.mienne && annonces?.departement && a.departement === annonces.departement);
  // Activité récente : ses dernières listes, sauf celles déjà dites dans « À faire maintenant ».
  const dites = new Set(candidats.map((a) => projetDeUrl(a.href)).filter((x): x is string => x !== null));
  // « Mes demandes en cours » (lot G) : les deux activités, jamais mêlées, chacune avec son type écrit. Une demande de
  // prix partie et pas encore commandée ni réglée ; un besoin groupé encore vivant. D'abord ce qui a bougé (réponses,
  // action attendue), puis le plus récent. Un besoin groupé qui vient d'être publié y figure aussitôt.
  const demandesDePrix: Demande[] = (projets?.items ?? [])
    .filter((p) => p.resume?.demande && !p.resume.demande.choisi && !p.resume.demande.regle)
    .map((p) => {
      const d = p.resume!.demande!;
      return { cle: `d-${p.id}`, type: "Demande de prix" as const, nom: p.name, statut: p.resume!.statut, detail: [pluriel(p.resume!.lignes, "ligne", "lignes"), d.reponses > 0 ? `${d.reponses} réponse${d.reponses > 1 ? "s" : ""} sur ${d.negoces}` : `${pluriel(d.negoces, "négoce consulté", "négoces consultés")}, pas encore de réponse`].join(" · "), href: `/chantiers/${p.id}`, action: d.reponses > 0, le: p.lastActivityAt };
    });
  const besoinsGroupes: Demande[] = [...(besoins?.aFaire ?? []).map((b) => ({ b, action: true })), ...(besoins?.enCours ?? []).map((b) => ({ b, action: false }))]
    .filter(({ b }) => b.etat !== "retire")
    .map(({ b, action }) => ({
      cle: `g-${b.id}`,
      type: "Achat groupé" as const,
      nom: b.nom,
      statut: b.statut.libelle,
      detail: [b.quantite.lisible, b.achat.resume ? `${b.achat.resume.entreprises} entreprise${b.achat.resume.entreprises > 1 ? "s" : ""}${b.achat.resume.volume ? ` · ${b.achat.resume.volume} au total` : b.achat.resume.regroupement ? " · en cours de regroupement" : ""}` : null, b.achat.statut === "ouvert" ? `clôture le ${dateCourte(b.achat.ouvertJusquau)}` : null].filter(Boolean).join(" · "),
      href: `/achats-groupes/besoins/${b.id}`,
      action,
      le: b.achat.resume?.derniereEvolution ?? b.achat.ouvertJusquau,
    }));
  const trier = (l: Demande[]) => [...l].sort((x, y) => Number(y.action) - Number(x.action) || y.le.localeCompare(x.le));
  const enCours = new Set(demandesDePrix.map((d) => d.href));
  const recentes = (projets?.items ?? []).filter((p) => !dites.has(p.id) && !enCours.has(`/chantiers/${p.id}`)).sort((x, y) => y.lastActivityAt.localeCompare(x.lastActivityAt));
  const nonLus = (boite?.items ?? []).filter((i) => i.nonLu);
  const dernier = [...nonLus].sort((x, y) => y.le.localeCompare(x.le))[0] ?? null;
  const aucuneListe = charge && projets.items.length === 0 && candidats.length === 0;

  return (
    <div className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-[56rem] lg:gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em] lg:text-[40px]">Bonjour {prenom}</h1>
      </header>
      <BandeauReprises />

      {!charge ? <Skeleton card="h-24" lines={1} label="Chargement de l'accueil…" /> : null}
      {premiere ? (
        <section aria-labelledby="a-faire-titre" className="flex flex-col gap-3">
          <h2 id="a-faire-titre" className="text-[22px] font-extrabold tracking-[-0.02em]">
            À faire maintenant
          </h2>
          <CarteAction a={premiere} />
          {lien ? (
            tout ? (
              <ul aria-label="Autres choses à reprendre" className="flex flex-col gap-3">
                {autres.map((a) => (
                  <li key={a.cle}>
                    <CarteAction a={a} />
                  </li>
                ))}
              </ul>
            ) : (
              <button type="button" onClick={() => setTout(true)} className="min-h-11 self-center text-[15px] font-semibold underline underline-offset-4">
                {lien}
              </button>
            )
          ) : null}
        </section>
      ) : charge ? (
        <p className="text-[15px] text-muted">Rien à faire pour le moment.</p>
      ) : null}
      {/* Le compte sans aucune liste : le seul départ utile. Dès la première liste, le « + » du menu suffit. */}
      {aucuneListe ? <CarteLien jaune href="/chantiers/nouveau" icone={ClipboardList} titre="Créer un quantitatif" sous="Prépare ta liste de matériaux." /> : null}

      {demandesDePrix.length + besoinsGroupes.length > 0 ? (
        <section aria-labelledby="accueil-demandes" className="flex flex-col gap-3 pt-2">
          <h2 id="accueil-demandes" className="text-[20px] leading-tight font-extrabold tracking-[-0.02em]">
            Mes demandes en cours
          </h2>
          {/* Deux activités, deux groupes : une demande de prix et un achat groupé ne se confondent jamais. */}
          {(
            [
              ["Demandes de prix", trier(demandesDePrix), "/chantiers?vue=suivi", "Voir toutes mes demandes de prix"],
              ["Achats groupés", trier(besoinsGroupes), "/achats-groupes/mes-besoins", "Voir tous mes besoins groupés"],
            ] as const
          ).map(([titre, liste, href, lienNom]) =>
            liste.length > 0 ? (
              <div key={titre} role="group" aria-label={titre} className="flex flex-col gap-2">
                <ul className="flex flex-col gap-3">
                  {liste.slice(0, MAX_CARTES).map((d) => (
                    <li key={d.cle}>
                      <CarteLien href={d.href} titre={d.nom} sous={`${d.statut} · ${d.detail}`} etiquette={<Etiquette ton={d.type === "Achat groupé" ? "jaune" : "vert"}>{d.type}</Etiquette>} label={`${d.type} : ${d.nom}, ${d.statut}, ${d.detail}`} />
                    </li>
                  ))}
                </ul>
                {liste.length > MAX_CARTES ? (
                  <Link href={href} aria-label={lienNom} className="flex min-h-11 items-center self-start text-[14px] font-extrabold text-accent-text">
                    Voir toutes ({liste.length})
                  </Link>
                ) : null}
              </div>
            ) : null,
          )}
        </section>
      ) : null}

      {boite && boite.items.length > 0 ? (
        <CarteLien
          href="/messages"
          icone={MessagesSquare}
          titre="Messages et réponses"
          sous={dernier ? `${dernier.sorte === "negoce" ? "Négoce" : dernier.sorte === "mission" ? "Mission" : "Mobiiz"} · ${dernier.sorte === "mobiiz" ? (dernier.sujet ?? dernier.titre) : dernier.titre}` : "Tout est lu"}
          pastille={nonLus.length > 0 ? <span className="flex min-w-7 shrink-0 items-center justify-center rounded-full bg-accent px-2 py-0.5 text-[13px] font-extrabold text-on-accent">{nonLus.length}</span> : undefined}
          label={`Messages et réponses : ${nonLus.length > 0 ? pluriel(nonLus.length, "non lu", "non lus") : "tout est lu"}`}
        />
      ) : null}

      {suggestions.length > 0 ? (
        <Section id="accueil-achats" titre="Achats groupés qui peuvent t'intéresser" href="/achats-groupes" lienNom="Voir tous les achats groupés">
          {suggestions.slice(0, MAX_CARTES).map((a) => (
            <li key={a.id}>
              <CarteLien href={lienAchat(a)} titre={a.nom} sous={`${libelleLot(a.lot)} · ${finDans(a.ouvertJusquau)}`} label={`${a.nom} : ${libelleLot(a.lot)}, ${finDans(a.ouvertJusquau)}`} />
            </li>
          ))}
        </Section>
      ) : null}

      {pres.length > 0 ? (
        <Section id="accueil-missions" titre="Missions près de toi" href="/missions" lienNom="Voir toutes les missions">
          {pres.slice(0, MAX_CARTES).map((a) => (
            <li key={a.id}>
              <CarteLien href={`/missions/${a.id}`} titre={`${a.metier} · ${a.lieu}`} sous={`À partir du ${jourCourt(a.debut)}`} label={`Mission : ${a.metier} à ${a.lieu}, à partir du ${jourCourt(a.debut)}`} />
            </li>
          ))}
        </Section>
      ) : null}

      {recentes.length > 0 ? (
        <Section id="accueil-recent" titre="Activité récente" href="/chantiers?vue=suivi" lienNom="Voir toutes mes demandes">
          {recentes.slice(0, MAX_CARTES).map((p) => (
            <li key={p.id}>
              <CarteLien href={`/chantiers/${p.id}`} titre={p.name} sous={[p.resume?.statut, jourCourt(p.lastActivityAt)].filter(Boolean).join(" · ")} />
            </li>
          ))}
        </Section>
      ) : null}
      <InstallHint />
    </div>
  );
}

/** Une ligne de « Mes demandes en cours » : son type écrit (jamais la couleur seule), son état, ce qui compte, son lien. */
interface Demande {
  cle: string;
  type: "Demande de prix" | "Achat groupé";
  nom: string;
  statut: string;
  detail: string;
  href: string;
  action: boolean;
  le: string;
}

/** Une carte de « À faire » : son état en étiquette, ce qu'il y a à faire, de quoi il s'agit ; entièrement cliquable. */
function CarteAction({ a }: { a: Action }) {
  return <CarteLien href={a.href} titre={a.titre} sous={moisAbrege(a.sousTitre)} etiquette={<Etiquette>{a.statut}</Etiquette>} label={`${a.titre} : ${a.sousTitre} (${a.statut})`} />;
}

/** Une section du tableau de bord : son titre, « Voir tout » à droite (44 px), ses cartes. Elle n'existe que remplie. */
function Section({ id, titre, href, lienNom, children }: { id: string; titre: string; href: string; lienNom: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 pt-2">
      <div className="flex items-end justify-between gap-3">
        <h2 id={id} className="min-w-0 text-[20px] leading-tight font-extrabold tracking-[-0.02em] text-balance">
          {titre}
        </h2>
        <Link href={href} aria-label={lienNom} className="flex min-h-11 shrink-0 items-center text-[14px] font-extrabold text-accent-text">
          Voir tout
        </Link>
      </div>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}
