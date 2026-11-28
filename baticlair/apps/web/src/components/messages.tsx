"use client";

import { ArrowUp, Bell, Briefcase, CreditCard, FileText, Globe, Mail, MoreHorizontal, Paperclip, Phone } from "lucide-react";
import { AvatarEntreprise } from "./image-profil";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FILTRES_BOITE, filtrerBoite, groupesBoite, MOTIFS_SIGNALEMENT, periodeLisible, PHRASE_FORMATS, quandBoite, type ElementBoite, type FiltreBoite } from "../../../../packages/domain/src/missions/missions";
import { api, type EmailRecu } from "@/lib/api";
import { cleEnvoi, ouvrirFichierPro, phraseErreur, tailleLisible, type ConversationVue } from "@/lib/missions";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";
import { BoutonContour, BoutonJaune, CARTE, ChampChoix, ChampLong, Coche, EcranTitre, Encart, EtatEcran, Etiquette, GrandTitre, LienContour, LienJaune, Puces, Recherche, Refus, TitreSection } from "./ux-kit";
import { coupeAuMot, titreCourt } from "@/lib/titres";

/**
 * « MESSAGES ET RÉPONSES » (Greg, 10 novembre 2026, captures 22, 23, 47, 11, 12, 46) et la cloche (26). L'interface est
 * commune ; les circuits restent séparés : une conversation Missions s'ouvre sur `/messages/<id>`, une réponse de négoce
 * sur `/messages/negoce/<id>` (elle reste aussi dans son quantitatif).
 */

/** Captures 22 et 47 : la boîte. */
export function Boite() {
  const [filtre, setFiltre] = useState<FiltreBoite>("tous");
  const [q, setQ] = useState("");
  const fetcher = useCallback((signal: AbortSignal) => api<{ items: ElementBoite[]; missions: boolean }>("/v1/boite", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  const tous = data?.items ?? [];
  const items = filtrerBoite(tous, filtre, q);
  const aClasser = tous.filter((i) => i.aClasser).length;
  const maintenant = new Date();
  // Une réponse saisie par le lien s'ouvre dans son quantitatif : elle est marquée lue au passage.
  const marquer = (i: ElementBoite) => {
    if (i.nonLu && (i.cle.startsWith("reponse:") || i.cle.startsWith("alerte:"))) void api("/v1/boite/lu", { method: "POST", body: { cle: i.cle } }).catch(() => undefined);
  };
  return (
    <>
      {/* Onglet « Messages » du téléphone (Greg, 18 novembre 2026) : un onglet n'a pas de flèche retour ; l'ordinateur la garde. */}
      <div className="hidden lg:block">
        <EcranTitre titre="Messages et réponses" retour="/" />
      </div>
      <GrandTitre sous={tous.length ? "Négoces, Missions, demandes reçues sur ton site et messages de Mobiiz." : "Tes échanges apparaîtront ici."}>{data && tous.length === 0 ? "Aucun message pour le moment" : "Messages"}</GrandTitre>
      {tous.length > 0 ? <Recherche valeur={q} onChange={setQ} placeholder="Rechercher" /> : null}
      <Puces label="Filtrer la boîte" choix={FILTRES_BOITE} valeur={filtre} onChange={setFiltre} />
      {/* Greg, 12 novembre 2026 : ce qui demande une action se lit d'abord ; le reste est déjà dans son quantitatif. */}
      {aClasser > 0 ? (
        <Link href="/recus" className={`pressable flex items-center gap-3 border-2 border-accent p-4 ${CARTE}`}>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-extrabold">
              {aClasser} réponse{aClasser > 1 ? "s" : ""} à classer
            </span>
            <span className="text-[13px] text-[#5c5648]">Mobiiz n&apos;a pas reconnu la demande. Les autres réponses sont déjà dans leur quantitatif.</span>
          </span>
          <span className="shrink-0 text-[14px] font-extrabold text-[#0b6b43]">Classer</span>
        </Link>
      ) : null}
      {data === null ? (
        <EtatEcran erreur={error} onReessayer={reload} />
      ) : tous.length === 0 ? (
        <>
          <div className={`flex flex-col items-center gap-2 p-6 text-center ${CARTE}`}>
            <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-accent text-on-accent">
              <CreditCard size={30} />
            </span>
            <p className="text-[20px] font-extrabold">Tu retrouveras ici</p>
            <p className="text-[14px] text-[#5c5648]">
              les réponses de tes négoces, tes conversations Missions,
              <br />
              les demandes reçues sur ton site et les messages de Mobiiz.
            </p>
            <p className="pt-2 text-[12px] text-[#6b6557]">La cloche reste réservée aux alertes courtes.</p>
          </div>
          {data.missions ? <LienJaune href="/missions">Découvrir les missions</LienJaune> : null}
          <LienContour href="/demandes">Voir mes demandes</LienContour>
        </>
      ) : items.length === 0 ? (
        <div className={`flex flex-col gap-1 p-5 ${CARTE}`}>
          <p className="text-[16px] font-extrabold">{q.trim() ? "Aucun résultat pour cette recherche" : filtre === "non-lus" ? "Tout est lu" : filtre === "missions" ? "Aucune conversation Missions" : filtre === "site" ? "Aucune demande reçue sur ton site" : "Aucune réponse de négoce"}</p>
          <p className="text-[14px] text-[#5c5648]">{filtre === "negoces" ? "Les réponses arrivent ici dès qu'un négoce répond à une demande de prix." : filtre === "missions" ? "Une conversation s'ouvre après une réponse à une mission." : filtre === "site" ? "Quand un visiteur clique sur « Demander un devis » sur ton site, son message arrive ici et par e-mail." : "Change de filtre pour voir le reste."}</p>
        </div>
      ) : (
        groupesBoite(items, maintenant).map((g) => (
          <section key={g.titre} aria-label={g.titre} className="flex flex-col gap-3">
            <TitreSection>{g.titre}</TitreSection>
            <ul className="flex flex-col gap-3">
              {g.items.map((i) => (
                <li key={i.cle}>
                  <Link href={i.href} onClick={() => marquer(i)} aria-label={`${i.sorte === "mission" ? "Mission" : i.sorte === "mobiiz" ? "Mobiiz" : i.sorte === "site" ? "Mon site" : "Négoce"}, ${i.titre}${i.sorte === "negoce" ? (i.aClasser ? ", à classer" : ", classée dans son quantitatif") : ""}${i.nonLu ? ", non lu" : ""}`} className={`pressable flex items-start gap-3 p-4 ${CARTE}`}>
                    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#efece6]">
                      {i.sorte === "mission" ? <Briefcase size={20} /> : i.sorte === "mobiiz" ? <Bell size={20} /> : i.sorte === "site" ? <Globe size={20} /> : <CreditCard size={20} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Etiquette ton={i.sorte === "mobiiz" ? "gris" : i.sorte === "mission" || i.sorte === "site" || i.aClasser ? "jaune" : "vert"}>{i.sorte === "mission" ? "Mission" : i.sorte === "mobiiz" ? "Mobiiz" : i.sorte === "site" ? "Mon site" : i.aClasser ? "À classer" : "Classée"}</Etiquette>
                      <span className="text-[17px] font-extrabold break-words">{titreCourt(i.titre, 56)}</span>
                      {i.sujet ? <span className="text-[13px] font-extrabold break-words text-[#6b5300]">{titreCourt(i.sujet, 64)}</span> : null}
                      <span className="text-[13px] break-words text-[#5c5648]">{coupeAuMot(i.extrait, 70)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-3">
                      <span className="text-[12px] text-[#6b6557]">{quandBoite(i.le, maintenant)}</span>
                      {i.nonLu ? <span aria-hidden="true" className="size-3.5 rounded-full bg-accent" /> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

const heure = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));

/** Captures 12 et 46 : une conversation Missions. Coordonnées privées jusqu'à l'accord des deux entreprises. */
export function Conversation({ id }: { id: string }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<ConversationVue>(`/v1/missions/conversations/${id}`, { signal }), [id]);
  const { data: c, error, reload, setData } = useResource(fetcher);
  const [texte, setTexte] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const [panneau, setPanneau] = useState<null | "coordonnees" | "menu" | "signaler" | "bloquer">(null);
  const [accord, setAccord] = useState(false);
  const [motif, setMotif] = useState("");
  const [precision, setPrecision] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  // La clé d'envoi est gardée tant que le message n'est pas parti : un second appui ne l'écrit pas deux fois.
  const cle = useRef(cleEnvoi());
  const nb = c?.messages.length ?? 0;
  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [nb]);
  // Les nouveaux messages arrivent sans recharger l'écran (toutes les 15 secondes, onglet visible).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && !pending) void api<ConversationVue>(`/v1/missions/conversations/${id}`).then(setData, () => undefined);
    }, 15_000);
    return () => clearInterval(t);
  }, [id, pending, setData]);

  if (!c) {
    return (
      <>
        <EcranTitre titre="Conversation" retour="/messages" />
        <EtatEcran erreur={error} onReessayer={reload} retour={{ href: "/messages", libelle: "Revenir aux messages" }} />
      </>
    );
  }
  async function agir(nom: string, f: () => Promise<void>) {
    setPending(nom);
    setRefus(null);
    setInfo(null);
    try {
      await f();
    } catch (e) {
      setRefus(phraseErreur(e));
    } finally {
      setPending(null);
    }
  }
  const recharger = async () => setData(await api<ConversationVue>(`/v1/missions/conversations/${id}`));
  const envoyer = () =>
    agir("envoi", async () => {
      await api(`/v1/missions/conversations/${id}/messages`, { method: "POST", body: { texte, cle: cle.current } });
      cle.current = cleEnvoi();
      setTexte("");
      await recharger();
    });
  const joindre = (f: File) =>
    agir("fichier", async () => {
      const corps = new FormData();
      corps.append("file", f);
      corps.append("cle", cleEnvoi());
      corps.append("texte", texte);
      await api(`/v1/missions/conversations/${id}/fichiers`, { method: "POST", body: corps });
      setTexte("");
      await recharger();
    });
  const coordonnees = (accepte: boolean) =>
    agir("coordonnees", async () => {
      await api(`/v1/missions/conversations/${id}/coordonnees`, { method: "POST", body: { accepte } });
      setPanneau(null);
      setAccord(false);
      await recharger();
    });
  const etat = c.coordonnees.etat;

  if (panneau === "coordonnees") {
    return (
      <>
        <RetourPanneau titre="Échange des coordonnées" onRetour={() => setPanneau(null)} />
        <GrandTitre sous="Les deux entreprises doivent accepter.">Partager vos coordonnées ?</GrandTitre>
        <div className={`flex items-center gap-3 p-4 ${CARTE}`}>
          <AvatarEntreprise entreprise={c.entreprise} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-[17px] font-extrabold">{c.entreprise.nom}</p>
            <p className="truncate text-[13px] text-[#5c5648]">{c.annonce.titre}</p>
            {c.entreprise.verifiee ? <Etiquette ton="vert">Compte vérifié</Etiquette> : null}
          </div>
        </div>
        <div className="rounded-[18px] border border-line bg-(--voile-2) p-4">
          <p className="pb-1 text-[14px] font-extrabold">Après accord mutuel</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-muted">
            <li>Nom et coordonnées professionnelles</li>
            <li>Téléphone et e-mail de contact</li>
            <li>Vous gérez directement votre relation</li>
          </ul>
        </div>
        <Coche coche={accord} onChange={setAccord} titre="J'accepte de partager mes coordonnées avec cette entreprise uniquement." />
        <BoutonJaune disabled={!accord} pending={pending === "coordonnees"} onClick={() => void coordonnees(true)}>
          {etat === "proposees_par_l_autre" ? "Accepter le partage" : "Proposer le partage"}
        </BoutonJaune>
        {!accord ? <p className="text-center text-[13px] text-muted">Coche la case pour continuer.</p> : null}
        <BoutonContour onClick={() => setPanneau(null)}>Continuer sans partager</BoutonContour>
        <Refus>{refus}</Refus>
        <p className="text-center text-[13px] text-muted">Mobiiz assure uniquement la mise en relation.</p>
      </>
    );
  }
  if (panneau === "signaler" || panneau === "bloquer") {
    const bloquer = panneau === "bloquer";
    return (
      <>
        <RetourPanneau titre={bloquer ? "Bloquer cette entreprise" : "Signaler"} onRetour={() => setPanneau(null)} />
        <GrandTitre sous={bloquer ? "Vous ne pourrez plus vous écrire, et vos annonces ne se verront plus." : "L'équipe Mobiiz lira ton signalement. L'entreprise n'en est pas informée."}>{bloquer ? `Bloquer ${c.entreprise.nom} ?` : "Que se passe-t-il ?"}</GrandTitre>
        {bloquer ? (
          <BoutonJaune pending={pending === "bloquer"} onClick={() => void agir("bloquer", async () => { await api(`/v1/missions/conversations/${id}/blocage`, { method: "POST", body: { confirmer: true } }); router.replace("/messages"); })}>
            Bloquer cette entreprise
          </BoutonJaune>
        ) : (
          <>
            <ChampChoix label="Motif" value={motif} onChange={(e) => setMotif(e.target.value)} choix={MOTIFS_SIGNALEMENT} vide="Choisir un motif" />
            <ChampLong label="Précision (facultatif)" value={precision} onChange={(e) => setPrecision(e.target.value)} maxLength={600} />
            <BoutonJaune disabled={!motif} pending={pending === "signaler"} onClick={() => void agir("signaler", async () => { await api(`/v1/missions/conversations/${id}/signalement`, { method: "POST", body: { motif, precision: precision.trim() || null } }); setPanneau(null); setInfo("Signalement envoyé. Merci, l'équipe Mobiiz va le lire."); })}>
              Envoyer le signalement
            </BoutonJaune>
            {!motif ? <p className="text-center text-[13px] text-muted">Choisis un motif pour envoyer.</p> : null}
          </>
        )}
        <BoutonContour onClick={() => setPanneau(null)}>Annuler</BoutonContour>
        <Refus>{refus}</Refus>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <EcranTitre titre={c.entreprise.nom} retour="/messages" />
        <button type="button" aria-label="Plus d'actions sur la conversation" aria-expanded={panneau === "menu"} onClick={() => setPanneau(panneau === "menu" ? null : "menu")} className="pressable flex size-11 shrink-0 items-center justify-center rounded-full">
          <MoreHorizontal size={22} aria-hidden="true" />
        </button>
      </div>
      {panneau === "menu" ? (
        <div role="menu" aria-label="Actions sur la conversation" className={`flex flex-col divide-y divide-[#e5e0d6] overflow-hidden ${CARTE}`}>
          <button type="button" role="menuitem" className="min-h-13 px-4 text-left text-[15px] font-extrabold" onClick={() => void agir("archive", async () => { await api(`/v1/missions/conversations/${id}/archive`, { method: "POST", body: { archive: !c.archivee } }); router.replace("/messages"); })}>
            {c.archivee ? "Sortir des archives" : "Archiver la conversation"}
          </button>
          <Link role="menuitem" href={`/missions/${c.annonce.id}`} className="flex min-h-13 items-center px-4 text-[15px] font-extrabold">
            Voir l&apos;annonce
          </Link>
          <button type="button" role="menuitem" className="min-h-13 px-4 text-left text-[15px] font-extrabold" onClick={() => setPanneau("signaler")}>
            Signaler
          </button>
          {!c.bloquee ? (
            <button type="button" role="menuitem" className="min-h-13 px-4 text-left text-[15px] font-extrabold text-[#a3261a]" onClick={() => setPanneau("bloquer")}>
              Bloquer cette entreprise
            </button>
          ) : null}
        </div>
      ) : null}
      <header className="flex flex-col">
        <h1 className="text-[17px] font-extrabold">{c.annonce.titre}</h1>
        <p className="text-[13px] text-muted">{c.annonce.type === "mission" ? `Du ${periodeLisible(c.annonce.debut, c.annonce.fin)}` : `Disponible à partir du ${periodeLisible(c.annonce.debut, null)}`}</p>
      </header>
      {etat === "partagees" ? (
        <section aria-label="Coordonnées partagées" className={`flex flex-col gap-0.5 p-4 ${CARTE}`}>
          <Etiquette ton="vert">Coordonnées partagées</Etiquette>
          <p className="pt-1 text-[16px] font-extrabold">{c.coordonnees.nom}{c.coordonnees.contact ? ` · ${c.coordonnees.contact}` : ""}</p>
          {c.coordonnees.telephone ? <a href={`tel:${c.coordonnees.telephone.replace(/\s/g, "")}`} className="min-h-11 content-center text-[15px] font-extrabold underline underline-offset-4">{c.coordonnees.telephone}</a> : null}
          {c.coordonnees.email ? <a href={`mailto:${c.coordonnees.email}`} className="min-h-11 content-center text-[15px] font-extrabold break-all underline underline-offset-4">{c.coordonnees.email}</a> : null}
          {!c.coordonnees.telephone && !c.coordonnees.email ? <p className="text-[13px] text-[#5c5648]">Cette entreprise n&apos;a pas renseigné de téléphone ni d&apos;e-mail de contact.</p> : null}
        </section>
      ) : (
        <Encart titre={etat === "proposees_par_moi" ? "Partage proposé" : etat === "proposees_par_l_autre" ? `${c.entreprise.nom} propose d'échanger vos coordonnées` : "Coordonnées privées"}>{etat === "proposees_par_moi" ? "En attente de l'accord de l'autre entreprise." : etat === "proposees_par_l_autre" ? "Rien n'est partagé tant que tu n'as pas accepté." : "Partagées uniquement après accord mutuel."}</Encart>
      )}
      <ul aria-label="Messages" className="flex flex-col gap-3">
        {c.messages.length === 0 ? <li className="text-[14px] text-muted">Aucun message pour l&apos;instant. Écris le premier.</li> : null}
        {c.messages.map((m) => (
          <li key={m.id} className={`flex max-w-[86%] flex-col gap-1 rounded-[18px] px-4 py-3 text-[#130901] ${m.deMoi ? "self-end bg-[#ffe98a]" : "self-start bg-surface"}`}>
            <span className="text-[12px] font-extrabold">{m.deMoi ? "Toi" : c.entreprise.nom}</span>
            <span className="text-[15px] leading-snug break-words whitespace-pre-line">{m.texte}</span>
            {m.fichiers.map((f) => (
              <button key={f.id} type="button" onClick={() => void ouvrirFichierPro(f).catch((e: unknown) => setRefus(phraseErreur(e)))} className="pressable flex min-h-11 items-center gap-2 rounded-xl bg-black/5 px-3 text-left text-[13px] font-extrabold">
                <FileText size={16} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{f.nom}</span>
                <span className="shrink-0 font-semibold">{tailleLisible(f.taille)}</span>
              </button>
            ))}
            <span className="text-[11px] text-[#6b6557]">{heure(m.le)}</span>
          </li>
        ))}
      </ul>
      <div ref={fin} />
      {info ? <p role="status" className="rounded-xl bg-[#d9f1e3] px-4 py-3 text-[14px] font-semibold text-[#0b6b43]">{info}</p> : null}
      {c.bloquee ? (
        <Encart titre="Conversation fermée">{c.bloqueeParMoi ? "Tu as bloqué cette entreprise." : "Cette conversation n'accepte plus de message."}</Encart>
      ) : (
        <>
          {etat === "privees" || etat === "proposees_par_l_autre" ? <BoutonContour onClick={() => setPanneau("coordonnees")}>{etat === "privees" ? "Proposer l'échange des coordonnées" : "Répondre à la proposition d'échange"}</BoutonContour> : null}
          {etat === "proposees_par_moi" ? <BoutonContour pending={pending === "coordonnees"} onClick={() => void coordonnees(false)}>Retirer ma proposition de partage</BoutonContour> : null}
          <Refus>{refus}</Refus>
          <form onSubmit={(e) => { e.preventDefault(); if (texte.trim() && !pending) void envoyer(); }} className={`sticky bottom-(--nav-space) z-10 flex items-end gap-2 p-2 pl-3 lg:bottom-4 ${CARTE}`}>
            <label className="pressable flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full" title={PHRASE_FORMATS}>
              <Paperclip size={20} aria-hidden="true" />
              <span className="sr-only">Joindre un fichier ({PHRASE_FORMATS})</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={!!pending} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void joindre(f); }} />
            </label>
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={1} maxLength={2000} aria-label="Écrire un message" placeholder={pending === "fichier" ? "Envoi du fichier…" : "Écrire un message…"} className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[16px] outline-none placeholder:text-[#7a7466]" />
            <button type="submit" aria-label="Envoyer le message" disabled={!texte.trim() || !!pending} className="pressable flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-40">
              <ArrowUp size={22} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
    </>
  );
}

function RetourPanneau({ titre, onRetour }: { titre: string; onRetour: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onRetour} aria-label="Retour à la conversation" className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-[26px] leading-none">
        ‹
      </button>
      <p className="truncate text-[17px] font-extrabold">{titre}</p>
    </div>
  );
}

/**
 * UN MESSAGE DE NÉGOCE, COMME GMAIL (Greg, 22 novembre 2026) : le fil avec ce négoce (ses messages et ce qui lui est parti,
 * dans l'ordre), ses pièces jointes, « Répondre » (la réponse part de l'adresse Mobiiz de l'artisan, au négoce de la
 * demande, et sa réponse revient rangée dans le bon chantier), « Signaler comme indésirable ». Jamais de bouton « Appeler ».
 * Le devis n'est jamais lu par l'IA : l'artisan l'ouvre.
 */
export function ReponseNegoce({ id, panneau = false }: { id: string; panneau?: boolean }) {
  const fetcher = useCallback((signal: AbortSignal) => api<EmailRecu>(`/v1/recus/${id}`, { signal }), [id]);
  const { data: e, error, reload, setData } = useResource(fetcher);
  const recipientId = e?.demande?.recipientId ?? null;
  const filFetcher = useCallback((signal: AbortSignal) => (recipientId ? api<FilNegoce>(`/v1/messagerie/fil/${recipientId}`, { signal }) : Promise.resolve(null)), [recipientId]);
  const { data: fil, reload: rechargerFil } = useResource(filFetcher);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "parti">("repos");
  const [refus, setRefus] = useState<string | null>(null);
  const titre = panneau ? null : <EcranTitre titre={e?.indesirable ? "Indésirable" : "Message du négoce"} retour="/messages" />;
  if (!e) {
    return (
      <>
        {titre}
        <EtatEcran erreur={error} onReessayer={reload} retour={panneau ? undefined : { href: "/messages", libelle: "Revenir aux messages" }} />
      </>
    );
  }
  const quand = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
  const repondre = async () => {
    if (!texte.trim()) return;
    setEnvoi("envoi");
    setRefus(null);
    try {
      await api(`/v1/recus/${encodeURIComponent(e.id)}/repondre`, { method: "POST", body: { texte } });
      setTexte("");
      setEnvoi("parti");
      rechargerFil();
    } catch (err) {
      setRefus(phraseErreur(err));
      setEnvoi("repos");
    }
  };
  const ranger = async (indesirable: boolean) => {
    try {
      setData(await api<EmailRecu>(`/v1/recus/${encodeURIComponent(e.id)}/indesirable`, { method: "POST", body: { indesirable } }));
    } catch (err) {
      setRefus(phraseErreur(err));
    }
  };
  // Le fil : les messages reçus et envoyés à ce négoce ; sans demande, le message seul.
  const messages: FilNegoce["items"] = fil?.items.length ? fil.items : [{ sens: "recu", id: e.id, libelle: e.demande?.negoce ?? e.expediteur, objet: e.objet, texte: e.texte ?? "", le: e.recuLe, fichiers: e.fichiers.map((f) => ({ id: f.id, nom: f.nom, type: f.type })) }];
  return (
    <>
      {titre}
      <header className="flex flex-col gap-1">
        {e.demande ? <p className="text-[14px] font-bold text-muted">Négoce · {titreCourt(e.demande.chantier ?? "", 56)}</p> : null}
        <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em] break-words">{e.demande?.negoce ?? e.expediteur}</h1>
        <p className="text-[15px] break-words text-muted">{e.objet || "Sans objet"}</p>
      </header>
      {e.indesirable ? (
        <Encart titre="Ce message est dans les indésirables">Mobiiz l&apos;a mis de côté, ou tu l&apos;as signalé. Ses liens ne sont pas cliquables et ses pièces dangereuses n&apos;ont pas été gardées.</Encart>
      ) : null}
      <ol aria-label="Fil des messages" className="flex flex-col gap-3">
        {messages.map((m) => (
          <li key={`${m.sens}-${m.id}`} className={`flex flex-col gap-2 p-4 ${CARTE} ${m.sens === "envoye" ? "ml-6 border-accent/60" : "mr-6"}`}>
            <p className="text-[13px] text-muted">
              <span className="font-extrabold text-ink">{m.sens === "envoye" ? `Toi · ${m.libelle}` : m.libelle}</span> · {quand(m.le)}
            </p>
            <p className="text-[16px] leading-snug break-words whitespace-pre-line">{m.texte.trim() || "Ce message n'a pas de texte."}</p>
            {m.fichiers.length ? (
              <ul aria-label="Pièces jointes" className="flex flex-col gap-2">
                {m.fichiers.map((f) =>
                  f.id && m.sens === "recu" ? (
                    <li key={f.id}>
                      <button type="button" onClick={() => openFile({ url: `/v1/recus/${encodeURIComponent(m.id)}/fichiers/${encodeURIComponent(f.id!)}`, title: f.nom, fileName: f.nom })} className="pressable flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left">
                        <FileText size={20} aria-hidden="true" className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{f.nom}</span>
                        <span className="shrink-0 text-[14px] font-extrabold text-[#0b6b43]">Ouvrir</span>
                      </button>
                    </li>
                  ) : (
                    <li key={f.nom} className="flex items-center gap-3 rounded-xl border border-line p-3">
                      <FileText size={20} aria-hidden="true" className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-[15px]">{f.nom}</span>
                    </li>
                  ),
                )}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
      {e.tropLourdes.length ? <Encart titre="Pièces trop lourdes, non gardées">{e.tropLourdes.join(", ")}. Demande au négoce de te les renvoyer plus légères.</Encart> : null}
      {e.demande && !e.indesirable ? (
        <section aria-label="Répondre" className={`flex flex-col gap-2 p-4 ${CARTE}`}>
          <label htmlFor="repondre-negoce" className="text-[16px] font-extrabold">
            Répondre à {e.demande.negoce}
          </label>
          <textarea id="repondre-negoce" value={texte} onChange={(ev) => { setTexte(ev.target.value); if (envoi === "parti") setEnvoi("repos"); }} rows={4} maxLength={10_000} placeholder="Ta réponse" className="min-h-28 w-full rounded-xl border border-line bg-surface p-3 text-[16px] outline-none focus:border-ink" />
          {refus ? <Refus>{refus}</Refus> : null}
          {envoi === "parti" ? (
            <p role="status" className="text-[15px] font-bold text-[#0b6b43]">
              Réponse envoyée. Elle est dans « Envoyés ».
            </p>
          ) : null}
          <BoutonJaune onClick={() => void repondre()} disabled={!texte.trim() || envoi === "envoi"}>
            {envoi === "envoi" ? "Envoi…" : "Envoyer ma réponse"}
          </BoutonJaune>
          <p className="text-[13px] text-muted">Elle part de ton adresse Mobiiz ; sa réponse reviendra ici, dans ce chantier.</p>
        </section>
      ) : null}
      {e.demande ? <LienContour href={`/chantiers/${e.demande.projectId}#fournisseurs`}>Voir la demande et comparer</LienContour> : !e.indesirable ? <LienContour href="/recus">Classer ce message dans une demande</LienContour> : null}
      {e.indesirable ? (
        <BoutonContour onClick={() => void ranger(false)}>Ce n&apos;est pas un indésirable</BoutonContour>
      ) : (
        <button type="button" onClick={() => void ranger(true)} className="pressable min-h-11 self-center px-3 text-[15px] font-bold text-muted underline underline-offset-4">
          Signaler comme indésirable
        </button>
      )}
    </>
  );
}

interface FilNegoce {
  recipientId: string;
  negoce: string;
  projectId: string;
  chantier: string;
  items: { sens: "recu" | "envoye"; id: string; libelle: string; objet: string; texte: string; le: string; fichiers: { id: string | null; nom: string; type: string | null }[] }[];
}

/** Une demande de devis reçue sur « Mon site » (Greg, 17 novembre 2026) : le message entier, appeler ou répondre d'un tap. */
export function MessageDuSite({ id }: { id: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<{ id: string; nom: string; telephone: string | null; email: string | null; commune: string | null; message: string; le: string }>(`/v1/boite/site/${id}`, { signal }), [id]);
  const { data: m, error, reload } = useResource(fetcher);
  if (!m) {
    return (
      <>
        <EcranTitre titre="Demande de devis" retour="/messages" />
        <EtatEcran erreur={error} onReessayer={reload} retour={{ href: "/messages", libelle: "Revenir aux messages" }} />
      </>
    );
  }
  const quand = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(m.le));
  return (
    <>
      <EcranTitre titre="Demande de devis" retour="/messages" />
      <header className="flex flex-col gap-1">
        <Etiquette ton="jaune">Mon site</Etiquette>
        <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em] break-words">{m.nom}</h1>
        <p className="text-[14px] text-muted">
          Reçue le {quand}
          {m.commune ? ` · chantier à ${m.commune}` : ""}
        </p>
      </header>
      <section aria-label="Message du client" className={`flex flex-col gap-2 p-4 ${CARTE}`}>
        <h2 className="text-[16px] font-extrabold">Son message</h2>
        <p className="text-[15px] leading-snug break-words whitespace-pre-line">{m.message}</p>
      </section>
      <section aria-label="Coordonnées du client" className={`flex flex-col gap-2 p-4 ${CARTE}`}>
        <h2 className="text-[16px] font-extrabold">Pour lui répondre</h2>
        {m.telephone ? (
          <p className="flex items-center gap-2 text-[15px] break-all">
            <Phone size={16} aria-hidden="true" className="shrink-0" /> {m.telephone}
          </p>
        ) : null}
        {m.email ? (
          <p className="flex items-center gap-2 text-[15px] break-all">
            <Mail size={16} aria-hidden="true" className="shrink-0" /> {m.email}
          </p>
        ) : null}
      </section>
      {m.telephone ? <LienJaune href={`tel:${m.telephone.replace(/[^+\d]/g, "")}`}>Appeler {m.nom}</LienJaune> : null}
      {m.email ? (
        <a href={`mailto:${m.email}?subject=${encodeURIComponent("Votre demande de devis")}`} className="pressable inline-flex min-h-13 w-full items-center justify-center rounded-[18px] border-2 border-accent px-5 text-center text-[15px] font-extrabold text-accent-text">
          Répondre par e-mail
        </a>
      ) : null}
      <p className="text-center text-[13px] text-muted">Ce message est gardé 12 mois dans Mobiiz, puis supprimé.</p>
    </>
  );
}
