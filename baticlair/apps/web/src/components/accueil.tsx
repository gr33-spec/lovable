"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, PlusCircle, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { actionPrioritaire, lienAutres, statutAchatGroupe, statutDemande, type ActionCandidate, type StatutSuivi } from "../../../../packages/domain/src/accueil/accueil";
import { InstallHint } from "@/components/install-hint";
import { BandeauReprises } from "@/components/reprises";
import { Skeleton } from "@/components/ui";
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

interface Suivi {
  cle: string;
  titre: string;
  statut: StatutSuivi;
  sousTitre: string;
  href: string;
  icone: "achat" | "demande";
  /** Pour l'ordre : ce qui demande de l'attention d'abord, puis le plus récent. */
  rang: number;
  date: number;
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

function suivisDesAchats(achats: CarteAchat[]): Suivi[] {
  return achats.flatMap((c) => {
    const statut = statutAchatGroupe(c.etat);
    if (!statut) return [];
    const inscriptions = ["seul", "regroupe", "regroupe_total"].includes(c.etat);
    const date = inscriptions ? c.clotureLe : c.etat === "consultation" ? c.reponseAvantLe : c.etat === "offre" ? c.commandeAvantLe : null;
    const quand = date ? `${inscriptions ? "Clôture" : c.etat === "consultation" ? "Réponses" : "Commande avant le"} ${jourCourt(date)}` : null;
    return [{ cle: `a-${c.id}`, titre: [c.metier, c.commune].filter(Boolean).join(" · ") || c.titreAchat, statut, sousTitre: [quand, pluriel(c.lignes.length, "ligne", "lignes")].filter(Boolean).join(" · "), href: `/achats-groupes/${c.id}`, icone: "achat" as const, rang: statut.ton === "jaune" ? 0 : 1, date: date ? Date.parse(date) : 0 }];
  });
}

function suivisDesDemandes(projets: ProjectPage["items"]): Suivi[] {
  return projets.flatMap((p) => {
    const d = p.resume?.demande;
    if (!d || d.choisi) return [];
    const statut = statutDemande(d);
    return [{ cle: `d-${p.id}`, titre: `Demande de prix · ${p.name}`, statut, sousTitre: pluriel(d.negoces, "négoce consulté", "négoces consultés"), href: `/chantiers/${p.id}#fournisseurs`, icone: "demande" as const, rang: d.reponses > 0 ? 0 : 1, date: Date.parse(p.lastActivityAt) }];
  });
}

export function AccueilMaquette() {
  const { me } = useSession();
  const prenom = me.user.name.split(" ")[0] ?? me.user.name;
  const { data: brouillons } = useResource(useCallback((s: AbortSignal) => api<{ items: Brouillon<unknown>[] }>("/v1/brouillons", { signal: s }).catch(() => ({ items: [] })), []));
  const { data: mes } = useResource(useCallback((s: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal: s }).catch(() => null), []));
  const { data: next } = useResource(useCallback((s: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal: s }).catch(() => ({ items: [] })), []));
  const { data: projets } = useResource(useCallback((s: AbortSignal) => api<ProjectPage>("/v1/projects?limit=30&resume=1", { signal: s }).catch(() => ({ items: [], nextCursor: null })), []));
  const [tout, setTout] = useState(false);

  const charge = brouillons !== null && next !== null && projets !== null;
  const achats = mes?.achats ?? [];
  const parProjet = new Map(projets?.items.map((p) => [p.id, p]) ?? []);
  const projetsBrouillon = new Set((brouillons?.items ?? []).map((b) => projetDeUrl(b.url)).filter((x): x is string => x !== null));
  const candidats = charge ? [...actionsDeBrouillons(brouillons.items), ...actionsDesAchats(achats), ...actionsDesReponses(projets.items), ...actionsDesListes(next.items, parProjet, projetsBrouillon)] : [];
  const { premiere, autres } = actionPrioritaire(candidats);
  const lien = lienAutres(autres);
  const suivis = [...suivisDesAchats(achats), ...suivisDesDemandes(projets?.items ?? [])]
    .filter((s) => !premiere || s.href !== premiere.href)
    .sort((a, b) => a.rang - b.rang || b.date - a.date || (a.cle < b.cle ? -1 : 1));
  const montres = suivis.slice(0, 2);
  const avecAchat = suivis.some((s) => s.icone === "achat");
  const voirTout = suivis.some((s) => s.icone === "demande") ? "/chantiers" : "/achats-groupes";

  return (
    <div className="flex flex-col gap-6 lg:mx-auto lg:w-full lg:max-w-[56rem] lg:gap-8">
      <h1 className="text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em] lg:text-[40px]">Bonjour {prenom}</h1>
      <BandeauReprises />
      {!charge ? <Skeleton card="h-40" lines={2} label="Chargement de l'accueil…" /> : null}

      {premiere ? (
        <section aria-labelledby="a-faire-titre" className="flex flex-col gap-3">
          <h2 id="a-faire-titre" className="text-[22px] font-extrabold tracking-[-0.02em]">
            À faire maintenant
          </h2>
          <CarteAction a={premiere} principale />
          {lien ? (
            tout ? (
              <ul aria-label="Autres choses à reprendre" className="flex flex-col gap-2">
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
      ) : null}

      <section aria-labelledby="commencer-titre" className="flex flex-col gap-3">
        <h2 id="commencer-titre" className="text-[22px] font-extrabold tracking-[-0.02em]">
          Commencer
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <CarteLien href="/chantiers/nouveau" titre="Créer une liste" sousTitre="Document, saisie ou description" icone={<PlusCircle size={26} aria-hidden="true" />} jaune />
          <CarteLien href="/achats-groupes" titre="Rejoindre un achat groupé" sousTitre="Regrouper tes besoins avec d'autres artisans" icone={<Users size={24} aria-hidden="true" />} />
        </div>
      </section>

      {charge ? (
        <section aria-labelledby="suivi-titre" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="suivi-titre" className="text-[22px] font-extrabold tracking-[-0.02em]">
              Suivi en cours
            </h2>
            {suivis.length > 0 ? (
              <Link href={voirTout} className="inline-flex min-h-11 items-center text-[15px] font-bold text-accent-text">
                Voir tout
              </Link>
            ) : null}
          </div>
          {montres.length === 0 ? <p className="text-[15px] text-muted">Aucun dossier en cours</p> : null}
          {montres.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {montres.map((s) => (
                <li key={s.cle}>
                  <CarteSuivi s={s} />
                </li>
              ))}
            </ul>
          ) : null}
          {montres.length > 0 && !avecAchat ? <p className="text-[14px] text-muted">Aucun achat groupé en cours</p> : null}
        </section>
      ) : null}
      <InstallHint />
    </div>
  );
}

/** La carte de « À faire maintenant » : la seule qui domine (bord jaune, bouton jaune) ; entièrement cliquable. */
function CarteAction({ a, principale = false }: { a: Action; principale?: boolean }) {
  return (
    <Link
      href={a.href}
      aria-label={`${a.titre} : ${a.sousTitre}`}
      className={`pressable relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface text-ink shadow-card ${principale ? "border-l-[6px] border-accent p-4 pl-4 lg:p-5" : "p-3.5"}`}
    >
      <span className="flex items-center gap-3">
        {principale ? (
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ground">
            <ClipboardList size={24} />
          </span>
        ) : null}
        <span className="flex min-w-0 grow flex-col gap-1">
          <span className="self-start rounded-md bg-accent/35 px-2 py-0.5 text-[12px] font-extrabold tracking-[0.04em] uppercase">{a.statut}</span>
          <span className={`${principale ? "text-[19px]" : "text-[16px]"} leading-tight font-extrabold`}>{a.titre}</span>
          <span className="text-[14px] text-muted">{a.sousTitre}</span>
        </span>
        <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-muted" />
      </span>
      {principale ? (
        <span aria-hidden="true" className="inline-flex min-h-12 items-center justify-center self-start rounded-full bg-accent px-8 text-[16px] font-extrabold text-on-accent">
          {a.bouton}
        </span>
      ) : null}
    </Link>
  );
}

function CarteLien({ href, titre, sousTitre, icone, jaune = false }: { href: string; titre: string; sousTitre: string; icone: React.ReactNode; jaune?: boolean }) {
  return (
    <Link href={href} className="pressable flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-surface p-3.5 text-ink shadow-card">
      <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${jaune ? "bg-accent text-on-accent" : "bg-ground"}`}>
        {icone}
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span className="text-[16px] font-extrabold">{titre}</span>
        <span className="text-[14px] text-muted">{sousTitre}</span>
      </span>
      <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-muted" />
    </Link>
  );
}

function CarteSuivi({ s }: { s: Suivi }) {
  const ton = s.statut.ton === "vert" ? "bg-ok-bg text-ok" : s.statut.ton === "jaune" ? "bg-accent/35 text-ink" : "bg-ground text-ink";
  return (
    <Link href={s.href} aria-label={`${s.titre} : ${s.statut.libelle}`} className="pressable flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-surface p-3.5 text-ink shadow-card">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ground">
        {s.icone === "achat" ? <Users size={24} /> : <ClipboardList size={24} />}
      </span>
      <span className="flex min-w-0 grow flex-col gap-1">
        <span className="text-[16px] leading-tight font-extrabold">{s.titre}</span>
        <span className={`self-start rounded-full px-2.5 py-0.5 text-[13px] font-bold ${ton}`}>{s.statut.libelle}</span>
        <span className="text-[14px] text-muted">{s.sousTitre}</span>
      </span>
      <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-muted" />
    </Link>
  );
}
