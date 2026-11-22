"use client";

import { Bell, ChevronDown, FileText, Globe, Handshake, Mail, Truck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { quandBoite, type ElementBoite } from "../../../../packages/domain/src/missions/missions";
import { api } from "@/lib/api";
import { titreCourt, coupeAuMot } from "@/lib/titres";
import { useResource } from "@/lib/use-resource";
import { Conversation, MessageDuSite, ReponseNegoce } from "./messages";
import { CARTE, EtatEcran, GrandTitre, Puces, TitreSection } from "./ux-kit";

/**
 * LA MESSAGERIE, COMME GMAIL ET OUTLOOK (Greg, 22 novembre 2026, maquettes validées : « Messages pour lire, Demandes pour
 * décider »). Trois dossiers : Reçus (les réponses des négoces regroupées par chantier, « 3 réponses sur 5 », qui se
 * déplient sur place ; puis Missions, Mon site, Mobiiz), Envoyés (tout ce qui est parti au nom de l'artisan), Indésirables.
 * Sur ordinateur : la liste au milieu, le message ouvert à droite. Sur téléphone : le message en plein écran, et Retour
 * ramène exactement où l'on était (dossier, chantier déplié, défilement).
 */
export type Dossier = "recus" | "envoyes" | "indesirables";
const DOSSIERS: readonly { id: Dossier; libelle: string }[] = [
  { id: "recus", libelle: "Reçus" },
  { id: "envoyes", libelle: "Envoyés" },
  { id: "indesirables", libelle: "Indésirables" },
];

interface NegoceDuChantier {
  recipientId: string;
  negoce: string;
  etat: "repondu" | "attente" | "commande";
  le: string;
  extrait: string;
  pdf: boolean;
  nonLu: boolean;
  href: string | null;
}
interface ChantierRecu {
  projectId: string;
  nom: string;
  sujet: string;
  consultes: number;
  repondus: number;
  le: string;
  nonLu: boolean;
  negoces: NegoceDuChantier[];
}
interface VueMessagerie {
  chantiers: ChantierRecu[];
  autres: ElementBoite[];
  missions: boolean;
}
export interface EnvoiVue {
  id: string;
  sorte: string;
  libelle: string;
  destinataire: string;
  objet: string;
  extrait: string;
  le: string;
  projectId: string | null;
  chantier: string | null;
  pieces: string[];
}
interface IndesirableVue {
  id: string;
  expediteur: string;
  objet: string;
  extrait: string;
  le: string;
  raison: string;
  piecesBloquees: string[];
}

/** Ce qui est ouvert à droite sur ordinateur. */
type Ouvert = { sorte: "negoce" | "envoye" | "mission" | "site"; id: string } | null;

const CLE_ETAT = "mobiiz:messagerie";
interface EtatGarde {
  dossier: Dossier;
  ouverts: string[];
  defilement: number;
}
function lireEtat(): EtatGarde | null {
  try {
    const v = sessionStorage.getItem(CLE_ETAT);
    return v ? (JSON.parse(v) as EtatGarde) : null;
  } catch {
    return null;
  }
}
function garderEtat(e: EtatGarde) {
  try {
    sessionStorage.setItem(CLE_ETAT, JSON.stringify(e));
  } catch {
    /* navigation privée : on revient en haut, rien de grave */
  }
}

/** La pastille ronde : camion jaune pour un négoce, poignée de main grise pour une mission (Greg, 22 novembre 2026). */
export function Pastille({ sorte }: { sorte: "negoce" | "mission" | "site" | "mobiiz" | "envoye" }) {
  const jaune = sorte === "negoce";
  return (
    <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-full ${jaune ? "bg-accent text-on-accent" : "bg-(--voile-2) text-ink"}`}>
      {sorte === "negoce" ? <Truck size={20} /> : sorte === "mission" ? <Handshake size={20} /> : sorte === "site" ? <Globe size={20} /> : sorte === "envoye" ? <Mail size={20} /> : <Bell size={20} />}
    </span>
  );
}

const Point = () => <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-accent" />;

/** Sur ordinateur (≥ 1024 px), un message s'ouvre à droite de la liste ; sur téléphone, sur son propre écran. */
function useOrdinateur() {
  const [ordi, setOrdi] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const maj = () => setOrdi(m.matches);
    maj();
    m.addEventListener("change", maj);
    return () => m.removeEventListener("change", maj);
  }, []);
  return ordi;
}

export function Messagerie() {
  const [dossier, setDossier] = useState<Dossier>("recus");
  const [ouverts, setOuverts] = useState<string[]>([]);
  const [ouvert, setOuvert] = useState<Ouvert>(null);
  const [pret, setPret] = useState(false);
  const ordi = useOrdinateur();
  // Retour ramène exactement où l'on était (Greg, 22 novembre 2026).
  useLayoutEffect(() => {
    const e = lireEtat();
    if (e) {
      setDossier(e.dossier);
      setOuverts(e.ouverts);
    }
    setPret(true);
  }, []);
  useEffect(() => {
    if (pret) garderEtat({ dossier, ouverts, defilement: lireEtat()?.defilement ?? 0 });
  }, [dossier, ouverts, pret]);
  const avantDePartir = () => garderEtat({ dossier, ouverts, defilement: window.scrollY });
  /** Sur ordinateur, le message s'ouvre à droite ; sur téléphone, le lien mène à son écran. */
  const ouvrir = (o: NonNullable<Ouvert>) => (ev: React.MouseEvent) => {
    if (ordi) {
      ev.preventDefault();
      setOuvert(o);
    } else avantDePartir();
  };
  const choisirDossier = (d: Dossier) => {
    setDossier(d);
    setOuvert(null);
  };
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-4">
        <GrandTitre>Messages</GrandTitre>
        <Puces label="Dossiers" choix={DOSSIERS} valeur={dossier} onChange={choisirDossier} entieres />
        {!pret ? null : dossier === "recus" ? (
          <Recus ouverts={ouverts} setOuverts={setOuverts} ouvrir={ouvrir} actif={ouvert} />
        ) : dossier === "envoyes" ? (
          <Envoyes ouvrir={ouvrir} actif={ouvert} />
        ) : (
          <Indesirables ouvrir={ouvrir} actif={ouvert} />
        )}
      </div>
      {ordi ? (
        <section aria-label="Message ouvert" className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] min-w-0 flex-col gap-4 overflow-y-auto rounded-[20px] border border-line bg-surface p-6 lg:flex">
          {ouvert === null ? (
            <p className="py-16 text-center text-[16px] text-muted">Choisis un message pour le lire ici.</p>
          ) : ouvert.sorte === "negoce" ? (
            <ReponseNegoce key={ouvert.id} id={ouvert.id} panneau />
          ) : ouvert.sorte === "envoye" ? (
            <MessageEnvoye key={ouvert.id} id={ouvert.id} panneau />
          ) : ouvert.sorte === "mission" ? (
            <Conversation key={ouvert.id} id={ouvert.id} />
          ) : (
            <MessageDuSite key={ouvert.id} id={ouvert.id} />
          )}
        </section>
      ) : null}
    </div>
  );
}

/** Après le chargement, on revient au défilement d'avant (une seule fois). */
function useDefilementRetrouve(charge: boolean) {
  useEffect(() => {
    if (!charge) return;
    const y = lireEtat()?.defilement ?? 0;
    if (y > 0) window.requestAnimationFrame(() => window.scrollTo(0, y));
  }, [charge]);
}

const ouvertDe = (href: string): NonNullable<Ouvert> | null => {
  const m = /^\/messages\/(negoce|envoye|site)\/([^/?#]+)$/.exec(href) ?? /^\/messages\/([^/?#]+)$/.exec(href);
  if (!m) return null;
  return m.length === 3 ? { sorte: m[1] as "negoce" | "envoye" | "site", id: m[2]! } : { sorte: "mission", id: m[1]! };
};

function Recus({ ouverts, setOuverts, ouvrir, actif }: { ouverts: string[]; setOuverts: (v: string[]) => void; ouvrir: (o: NonNullable<Ouvert>) => (ev: React.MouseEvent) => void; actif: Ouvert }) {
  const fetcher = useCallback((signal: AbortSignal) => api<VueMessagerie>("/v1/messagerie", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  useDefilementRetrouve(!!data);
  if (!data) return <EtatEcran erreur={error} onReessayer={reload} />;
  const maintenant = new Date();
  if (data.chantiers.length === 0 && data.autres.length === 0)
    return (
      <div className={`flex flex-col gap-1 p-5 ${CARTE}`}>
        <p className="text-[17px] font-extrabold">Aucun message pour le moment</p>
        <p className="text-[15px] text-muted">Les réponses de tes négoces arrivent ici, rangées par chantier.</p>
      </div>
    );
  const basculer = (id: string) => setOuverts(ouverts.includes(id) ? ouverts.filter((x) => x !== id) : [...ouverts, id]);
  const aClasser = data.autres.filter((i) => i.aClasser).length;
  return (
    <>
      {/* Greg, 12 novembre 2026 : ce qui demande une action se lit d'abord. */}
      {aClasser > 0 ? (
        <Link href="/recus" onClick={() => garderEtat({ dossier: "recus", ouverts, defilement: window.scrollY })} className={`pressable flex items-center gap-3 border-2 border-accent p-4 ${CARTE}`}>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-extrabold">
              {aClasser} réponse{aClasser > 1 ? "s" : ""} à classer
            </span>
            <span className="text-[14px] text-muted">Mobiiz n&apos;a pas reconnu la demande : choisis-la.</span>
          </span>
          <span className="shrink-0 text-[15px] font-extrabold text-[#0b6b43]">Classer</span>
        </Link>
      ) : null}
      {data.chantiers.length ? (
        <section aria-label="Réponses des négoces" className="flex flex-col gap-3">
          <TitreSection>Négoces</TitreSection>
          <ul className="flex flex-col gap-3">
            {data.chantiers.map((c) => {
              const deplie = ouverts.includes(c.projectId);
              return (
                <li key={c.projectId} className={`overflow-hidden ${CARTE}`}>
                  <button type="button" aria-expanded={deplie} onClick={() => basculer(c.projectId)} className="pressable flex w-full items-center gap-3 p-4 text-left">
                    <Pastille sorte="negoce" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="line-clamp-2 text-[17px] font-extrabold break-words">{titreCourt(c.sujet, 64)}</span>
                      <span className="text-[15px] text-muted">
                        {c.repondus} réponse{c.repondus > 1 ? "s" : ""} sur {c.consultes}
                      </span>
                      <span aria-hidden="true" className="mt-1 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-(--voile-2)">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${c.consultes ? Math.round((100 * c.repondus) / c.consultes) : 0}%` }} />
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-[13px] text-muted">{quandBoite(c.le, maintenant)}</span>
                      {c.nonLu ? <Point /> : null}
                      <ChevronDown size={20} aria-hidden="true" className={`transition-transform ${deplie ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {deplie ? (
                    <ul aria-label={`Négoces consultés pour ${c.nom}`} className="flex flex-col border-t border-line">
                      {c.negoces.map((n) => {
                        const contenu = (
                          <>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="flex items-center gap-2">
                                <span className="min-w-0 text-[16px] font-extrabold break-words">{n.negoce}</span>
                                {n.pdf ? <span className="shrink-0 rounded-md bg-(--voile-2) px-1.5 text-[12px] font-bold">PDF</span> : null}
                                {n.etat === "commande" ? <span className="shrink-0 rounded-md bg-accent px-1.5 text-[12px] font-bold text-on-accent">Commandé</span> : null}
                              </span>
                              <span className={`text-[14px] break-words ${n.etat === "attente" ? "text-muted italic" : "text-muted"}`}>{n.etat === "attente" ? "En attente" : coupeAuMot(n.extrait, 90)}</span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-2">
                              {n.etat !== "attente" ? <span className="text-[13px] text-muted">{quandBoite(n.le, maintenant)}</span> : null}
                              {n.nonLu ? <Point /> : null}
                            </span>
                          </>
                        );
                        const o = n.href ? ouvertDe(n.href) : null;
                        return (
                          <li key={n.recipientId} className="border-b border-line last:border-b-0">
                            {n.href ? (
                              <Link
                                href={n.href}
                                onClick={o ? ouvrir(o) : undefined}
                                aria-current={o && actif?.sorte === o.sorte && actif.id === o.id ? "true" : undefined}
                                aria-label={`${n.negoce}${n.etat === "commande" ? ", commandé" : ""}${n.nonLu ? ", non lu" : ""}`}
                                className="pressable flex items-start gap-3 px-4 py-3 aria-[current]:bg-(--voile-2)"
                              >
                                {contenu}
                              </Link>
                            ) : (
                              <div className="flex items-start gap-3 px-4 py-3 opacity-80">{contenu}</div>
                            )}
                          </li>
                        );
                      })}
                      <li className="flex flex-wrap gap-2 px-4 py-3">
                        <Link href={`/chantiers/${c.projectId}`} className="pressable inline-flex min-h-11 items-center rounded-full border border-ink/35 px-4 text-[15px] font-extrabold">
                          Voir la demande
                        </Link>
                      </li>
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {data.autres.length ? (
        <section aria-label="Autres messages" className="flex flex-col gap-3">
          <TitreSection>{data.chantiers.length ? "Autres messages" : "Messages"}</TitreSection>
          <ul className="flex flex-col gap-3">
            {data.autres.map((i) => {
              const o = ouvertDe(i.href);
              const sorte = i.sorte === "negoce" ? "negoce" : i.sorte;
              return (
                <li key={i.cle}>
                  <Link
                    href={i.href}
                    onClick={o ? ouvrir(o) : undefined}
                    aria-current={o && actif?.sorte === o.sorte && actif.id === o.id ? "true" : undefined}
                    aria-label={`${i.sorte === "mission" ? "Mission" : i.sorte === "mobiiz" ? "Mobiiz" : i.sorte === "site" ? "Mon site" : "E-mail à classer"}, ${i.titre}${i.nonLu ? ", non lu" : ""}`}
                    className={`pressable flex items-start gap-3 p-4 aria-[current]:outline-2 aria-[current]:outline-accent ${CARTE}`}
                  >
                    <Pastille sorte={sorte} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="line-clamp-2 text-[16px] font-extrabold break-words">{i.sorte === "negoce" ? `À classer · ${i.titre}` : i.sujet ? titreCourt(i.sujet, 64) : i.titre}</span>
                      <span className="text-[14px] break-words text-muted">{i.sorte === "mission" ? `${i.titre} · ` : ""}{coupeAuMot(i.extrait, 90)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-[13px] text-muted">{quandBoite(i.le, maintenant)}</span>
                      {i.nonLu ? <Point /> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Envoyes({ ouvrir, actif }: { ouvrir: (o: NonNullable<Ouvert>) => (ev: React.MouseEvent) => void; actif: Ouvert }) {
  const fetcher = useCallback((signal: AbortSignal) => api<{ items: EnvoiVue[] }>("/v1/messagerie/envoyes", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  useDefilementRetrouve(!!data);
  if (!data) return <EtatEcran erreur={error} onReessayer={reload} />;
  const maintenant = new Date();
  if (data.items.length === 0)
    return (
      <div className={`flex flex-col gap-1 p-5 ${CARTE}`}>
        <p className="text-[17px] font-extrabold">Rien d&apos;envoyé pour le moment</p>
        <p className="text-[15px] text-muted">Tes demandes de prix, tes bons de commande et tes réponses aux négoces apparaîtront ici.</p>
      </div>
    );
  return (
    <ul aria-label="Messages envoyés" className="flex flex-col gap-3">
      {data.items.map((m) => (
        <li key={m.id}>
          <Link href={`/messages/envoye/${m.id}`} onClick={ouvrir({ sorte: "envoye", id: m.id })} aria-current={actif?.sorte === "envoye" && actif.id === m.id ? "true" : undefined} className={`pressable flex items-start gap-3 p-4 aria-[current]:outline-2 aria-[current]:outline-accent ${CARTE}`}>
            <Pastille sorte="envoye" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-bold text-muted">{m.libelle}</span>
              <span className="line-clamp-2 text-[16px] font-extrabold break-words">À {nomSeul(m.destinataire)}</span>
              <span className="text-[14px] break-words text-muted">{m.chantier ? titreCourt(m.chantier, 60) : coupeAuMot(m.objet, 70)}</span>
            </span>
            <span className="shrink-0 text-[13px] text-muted">{quandBoite(m.le, maintenant)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const nomSeul = (d: string) => /^\s*"?([^"<]+?)"?\s*</.exec(d)?.[1]?.trim() || d;

function Indesirables({ ouvrir, actif }: { ouvrir: (o: NonNullable<Ouvert>) => (ev: React.MouseEvent) => void; actif: Ouvert }) {
  const fetcher = useCallback((signal: AbortSignal) => api<{ items: IndesirableVue[] }>("/v1/recus/indesirables", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  useDefilementRetrouve(!!data);
  if (!data) return <EtatEcran erreur={error} onReessayer={reload} />;
  const maintenant = new Date();
  return (
    <>
      <p className="text-[15px] text-muted">Les messages douteux sont mis de côté ici par Mobiiz ou par toi. Rien n&apos;est supprimé.</p>
      {data.items.length === 0 ? (
        <div className={`flex flex-col gap-1 p-5 ${CARTE}`}>
          <p className="text-[17px] font-extrabold">Aucun indésirable</p>
        </div>
      ) : (
        <ul aria-label="Messages indésirables" className="flex flex-col gap-3">
          {data.items.map((m) => (
            <li key={m.id}>
              <Link href={`/messages/negoce/${m.id}`} onClick={ouvrir({ sorte: "negoce", id: m.id })} aria-current={actif?.sorte === "negoce" && actif.id === m.id ? "true" : undefined} className={`pressable flex items-start gap-3 p-4 aria-[current]:outline-2 aria-[current]:outline-accent ${CARTE}`}>
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--voile-2)">
                  <Mail size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 text-[16px] font-extrabold break-words">{m.expediteur}</span>
                  <span className="text-[14px] break-words text-muted">{coupeAuMot(m.objet || m.extrait, 70)}</span>
                  <span className="text-[13px] font-bold text-warn">{m.raison}</span>
                </span>
                <span className="shrink-0 text-[13px] text-muted">{quandBoite(m.le, maintenant)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Un message envoyé au nom de l'artisan, en lecture seule. */
export function MessageEnvoye({ id, panneau = false }: { id: string; panneau?: boolean }) {
  const fetcher = useCallback((signal: AbortSignal) => api<EnvoiVue & { texte: string; repondA: string | null }>(`/v1/messagerie/envoyes/${id}`, { signal }), [id]);
  const { data: m, error, reload } = useResource(fetcher);
  if (!m) return <EtatEcran erreur={error} onReessayer={reload} retour={panneau ? undefined : { href: "/messages", libelle: "Revenir aux messages" }} />;
  const quand = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(m.le));
  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="text-[14px] font-bold text-muted">{m.libelle} · envoyé le {quand}</p>
        <h1 className="font-display text-[24px] leading-[1.15] font-extrabold break-words">À {nomSeul(m.destinataire)}</h1>
        <p className="text-[15px] break-words text-muted">{m.objet}</p>
      </header>
      <section aria-label="Texte envoyé" className={`p-4 ${CARTE}`}>
        <p className="text-[16px] leading-snug break-words whitespace-pre-line">{m.texte}</p>
      </section>
      {m.pieces.length ? (
        <ul aria-label="Pièces jointes envoyées" className="flex flex-col gap-2">
          {m.pieces.map((p) => (
            <li key={p} className={`flex items-center gap-3 p-3 ${CARTE}`}>
              <FileText size={20} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 text-[15px] font-bold break-words">{p}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {m.projectId ? (
        <Link href={`/chantiers/${m.projectId}`} className="pressable inline-flex min-h-12 items-center justify-center rounded-full border border-ink/35 px-5 text-[15px] font-extrabold">
          Voir la demande{m.chantier ? ` · ${titreCourt(m.chantier, 40)}` : ""}
        </Link>
      ) : null}
    </>
  );
}
