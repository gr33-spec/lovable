"use client";

import { Briefcase, ClipboardList, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { actionPrioritaire, lienAutres, type ActionCandidate } from "../../../../packages/domain/src/accueil/accueil";
import { InstallHint } from "@/components/install-hint";
import { BandeauReprises } from "@/components/reprises";
import { Skeleton } from "@/components/ui";
import { CarteLien, Etiquette } from "@/components/ux-kit";
import { useGroupeActif } from "@/components/app-nav";
import { useMissionsActif } from "@/lib/missions";
import { api, type NextAction, type ProjectPage } from "@/lib/api";
import type { Brouillon } from "@/lib/brouillon";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";
import type { CarteAchat, MesAchats } from "@/lib/achat-groupe";

/**
 * L'ACCUEIL (Greg, 1er novembre 2026, maquette « Bonjour Greg », qui remplace les précédentes) : « Bonjour [prénom] », puis
 * trois sections dans cet ordre. 1) « À faire maintenant » : UNE action, la plus pressante (`actionPrioritaire`), avec
 * « Voir N autres brouillons » ; masquée quand rien n'est à reprendre. 2) « Commencer » : « Créer une liste » (jaune, le même
 * départ que le « + ») et « Rejoindre un achat groupé ». 3) « Suivi en cours » : deux dossiers au plus, « Voir tout ».
 * Les listes récentes vivent dans « Mes listes ». Rien ici n'envoie quoi que ce soit à un négoce : chaque carte ouvre son
 * dossier.
 */

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
    if (!d || d.choisi || d.reponses === 0) return [];
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

  const charge = brouillons !== null && next !== null && projets !== null;
  const achats = mes?.achats ?? [];
  const parProjet = new Map(projets?.items.map((p) => [p.id, p]) ?? []);
  const projetsBrouillon = new Set((brouillons?.items ?? []).map((b) => projetDeUrl(b.url)).filter((x): x is string => x !== null));
  const candidats = charge ? [...actionsDeBrouillons(brouillons.items), ...actionsDesAchats(achats), ...actionsDesReponses(projets.items), ...actionsDesListes(next.items, parProjet, projetsBrouillon), ...actionsDesRapprochements(rapprochements?.items ?? [])] : [];
  const { premiere, autres } = actionPrioritaire(candidats);
  const lien = lienAutres(autres);

  return (
    <div className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-[56rem] lg:gap-5">
      {/* PROMPT MAÎTRE (Greg, 10 novembre 2026, capture 01 ; RÈGLE CHANGÉE pour « un seul bouton » du 8 novembre) : « Bonjour
          [prénom], que veux-tu faire ? », puis les trois activités, chacune indépendante : créer un quantitatif (jaune, la
          seule action dominante), voir les achats groupés, les missions entre entreprises ; puis « À faire ». Rien ici
          n'envoie quoi que ce soit : chaque carte ouvre son espace. */}
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em] lg:text-[40px]">Bonjour {prenom}</h1>
        <p className="text-[16px] text-muted">Que veux-tu faire ?</p>
      </header>
      <BandeauReprises />
      <CarteLien jaune href="/chantiers/nouveau" icone={ClipboardList} titre="Créer un quantitatif" sous="Prépare ta liste de matériaux." />
      {groupe ? <CarteLien href="/achats-groupes" icone={Users} titre="Voir les achats groupés" sous="Découvre les achats ouverts près de toi." /> : null}
      {missions ? <CarteLien href="/missions" icone={Briefcase} titre="Missions entre entreprises" sous="Propose une mission ou tes services." /> : null}

      {!charge ? <Skeleton card="h-24" lines={1} label="Chargement de l'accueil…" /> : null}
      {premiere ? (
        <section aria-labelledby="a-faire-titre" className="flex flex-col gap-3 pt-2">
          <h2 id="a-faire-titre" className="text-[22px] font-extrabold tracking-[-0.02em]">
            À faire
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
        <p className="pt-2 text-[15px] text-muted">Rien à faire pour le moment.</p>
      ) : null}
      <InstallHint />
    </div>
  );
}

/** Une carte de « À faire » : son état en étiquette, ce qu'il y a à faire, de quoi il s'agit ; entièrement cliquable. */
function CarteAction({ a }: { a: Action }) {
  return <CarteLien href={a.href} titre={a.titre} sous={a.sousTitre} etiquette={<Etiquette>{a.statut}</Etiquette>} label={`${a.titre} : ${a.sousTitre} (${a.statut})`} />;
}
