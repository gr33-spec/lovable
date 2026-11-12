"use client";

import { FileText, Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  EQUIPES,
  EXPERIENCES,
  FRAIS,
  jourLisible,
  libelleDe,
  LIBELLE_STATUT_ANNONCE,
  NIVEAUX,
  periodeLisible,
  PHRASE_DECLARATIF,
  PHRASE_FORMATS,
  PHRASE_MISE_EN_RELATION,
  PHRASE_TARIF_INDICATIF,
  TYPES_MISSION,
} from "../../../../packages/domain/src/missions/missions";
import { api } from "@/lib/api";
import { ouvrirFichierPro, phraseErreur, tailleLisible, useMissionsActif, type AnnonceVue, type FichierVue, type ReponseVue } from "@/lib/missions";
import { useResource } from "@/lib/use-resource";
import { Avatar, BoutonContour, BoutonJaune, CARTE, CarteLien, EcranTitre, Encart, EtatEcran, Etiquette, GrandTitre, LienContour, LienJaune, Ligne, Puces, Recherche, Refus, RondFait } from "./ux-kit";

/** MISSIONS ENTRE ENTREPRISES (Greg, 10 novembre 2026) : les écrans de lecture. Mobiiz assure uniquement la mise en relation. */

const typesLisibles = (types: string[]) => types.map((t) => libelleDe(TYPES_MISSION, t)).filter(Boolean).join(" · ");
const quand = (a: AnnonceVue) => (a.type === "mission" ? `du ${periodeLisible(a.debut, a.fin)}` : `à partir du ${jourLisible(a.debut)}`);

/** Missions coupées (réglage serveur) : un écran clair, jamais une page cassée. */
export function MissionsIndisponibles() {
  return (
    <>
      <GrandTitre sous="Mise en relation entre entreprises du bâtiment.">Missions</GrandTitre>
      <div className={`flex flex-col gap-2 p-5 ${CARTE}`}>
        <p className="text-[18px] font-extrabold">Bientôt disponible</p>
        <p className="text-[14px] text-[#5c5648]">Les missions entre entreprises ne sont pas encore ouvertes sur cet espace. Tes quantitatifs et tes achats groupés restent là.</p>
      </div>
      <LienContour href="/">Revenir à l&apos;accueil</LienContour>
    </>
  );
}

/** Garde : rend `children` quand les missions sont allumées, l'écran « bientôt » sinon, un squelette pendant la lecture. */
export function SiMissions({ children }: { children: React.ReactNode }) {
  const actif = useMissionsActif();
  if (actif === undefined) return <EtatEcran erreur={null} />;
  return actif ? <>{children}</> : <MissionsIndisponibles />;
}

export function CarteAnnonce({ a, href }: { a: AnnonceVue; href?: string }) {
  return (
    <CarteLien
      href={href ?? `/missions/${a.id}`}
      titre={a.type === "mission" ? `${a.metier} · ${a.lieu}` : `${a.metier} disponible`}
      etiquette={<Etiquette ton={a.type === "mission" ? "jaune" : "vert"}>{a.type === "mission" ? "Mission" : "Disponible"}</Etiquette>}
      sous={a.type === "mission" ? `${a.lieu} · ${quand(a)}` : `${a.rayonKm} km autour de ${a.lieu} (${a.departement}) · ${quand(a)}`}
    />
  );
}

type Vue = "missions" | "dispos" | "miennes";
const VUES: { id: Vue; libelle: string }[] = [
  { id: "missions", libelle: "Missions" },
  { id: "dispos", libelle: "Entreprises dispo" },
  { id: "miennes", libelle: "Mes annonces" },
];

/** Capture 06 : l'accueil des missions. */
export function MissionsAccueil() {
  const [vue, setVue] = useState<Vue>("missions");
  const [q, setQ] = useState("");
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      vue === "miennes"
        ? api<{ annonces: AnnonceVue[] }>("/v1/missions/miennes", { signal }).then((r) => ({ items: r.annonces }))
        : api<{ items: AnnonceVue[] }>(`/v1/missions/annonces?type=${vue === "missions" ? "mission" : "disponibilite"}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`, { signal }),
    [vue, q],
  );
  const { data, error, reload } = useResource(fetcher);
  const items = data?.items ?? [];
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <GrandTitre sous="Mise en relation entre entreprises du bâtiment.">Missions</GrandTitre>
        <Link href="/messages" className="pressable inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-accent px-4 text-[14px] font-extrabold text-accent-text">
          Messages
        </Link>
      </div>
      <CarteLien jaune href="/missions/nouvelle" titre="Je propose une mission" sous="Je cherche une entreprise pour intervenir." />
      <CarteLien href="/missions/services" titre="Je propose mes services" sous="J'indique mon métier et mes disponibilités." />
      <Recherche valeur={q} onChange={setQ} placeholder="Rechercher un métier ou une ville" />
      <Puces label="Type d'annonces" choix={VUES} valeur={vue} onChange={setVue} entieres />
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">{vue === "miennes" ? "Mes annonces" : "Près de toi"}</h2>
        {vue === "miennes" ? (
          <Link href="/missions/mes-missions" className="min-h-11 content-center text-[14px] font-extrabold text-accent-text">
            Voir tout
          </Link>
        ) : null}
      </div>
      {data === null ? (
        <EtatEcran erreur={error} onReessayer={reload} />
      ) : items.length === 0 ? (
        <div className={`flex flex-col gap-1 p-5 ${CARTE}`}>
          <p className="text-[16px] font-extrabold">{vue === "miennes" ? "Tu n'as pas encore d'annonce" : q.trim() ? "Aucun résultat pour cette recherche" : vue === "missions" ? "Aucune mission ouverte pour le moment" : "Aucune entreprise disponible pour le moment"}</p>
          <p className="text-[14px] text-[#5c5648]">{vue === "miennes" ? "Publie une mission ou propose tes services : c'est gratuit." : "Reviens plus tard, ou publie ta propre annonce."}</p>
        </div>
      ) : (
        <ul aria-label={vue === "miennes" ? "Mes annonces" : "Annonces près de toi"} className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id}>
              <CarteAnnonce a={a} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-center text-[13px] text-muted">{PHRASE_MISE_EN_RELATION}</p>
    </>
  );
}

function CarteEntreprise({ e, sous }: { e: { nom: string; initiales: string; verifiee: boolean; departement: string | null }; sous?: string }) {
  return (
    <div className={`flex items-center gap-3 p-4 ${CARTE}`}>
      <Avatar initiales={e.initiales} />
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-[17px] font-extrabold">{e.nom}</p>
        <p className="text-[13px] text-[#5c5648]">{sous ?? `${e.verifiee ? "Entreprise vérifiée" : "Entreprise non vérifiée"}${e.departement ? ` · secteur ${e.departement}` : ""}`}</p>
      </div>
    </div>
  );
}

export function ListeFichiers({ fichiers, onSupprimer }: { fichiers: FichierVue[]; onSupprimer?: (f: FichierVue) => void }) {
  const [refus, setRefus] = useState<string | null>(null);
  if (fichiers.length === 0) return null;
  return (
    <>
      <ul aria-label="Documents" className="flex flex-col divide-y divide-[#e5e0d6]">
        {fichiers.map((f) => (
          <li key={f.id} className="flex items-center gap-2 py-1">
            <button type="button" onClick={() => void ouvrirFichierPro(f).catch((e: unknown) => setRefus(phraseErreur(e)))} className="pressable flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left">
              <FileText size={18} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">{f.titre || f.nom}</span>
              <span className="shrink-0 text-[12px] text-[#6b6557]">{tailleLisible(f.taille)}</span>
              <span className="shrink-0 text-[13px] font-extrabold text-[#0b6b43]">Voir</span>
            </button>
            {onSupprimer ? (
              <button type="button" aria-label={`Supprimer ${f.titre || f.nom}`} onClick={() => onSupprimer(f)} className="pressable flex size-11 shrink-0 items-center justify-center rounded-full">
                <Trash2 size={18} aria-hidden="true" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <Refus>{refus}</Refus>
    </>
  );
}

/** Captures 09 et 10 : le détail d'une mission ou d'une entreprise disponible ; pour son auteur, le suivi de l'annonce. */
export function AnnonceDetail({ id }: { id: string }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<AnnonceVue>(`/v1/missions/annonces/${id}`, { signal }), [id]);
  const { data: a, error, reload, setData } = useResource(fetcher);
  const [pending, setPending] = useState<string | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const [fermer, setFermer] = useState(false);

  async function agir(nom: string, f: () => Promise<void>) {
    setPending(nom);
    setRefus(null);
    try {
      await f();
    } catch (e) {
      setRefus(phraseErreur(e));
    } finally {
      setPending(null);
    }
  }
  if (!a) {
    return (
      <>
        <EcranTitre titre="Mission" retour="/missions" />
        <EtatEcran erreur={error} onReessayer={reload} retour={{ href: "/missions", libelle: "Revenir aux missions" }} />
      </>
    );
  }
  const mission = a.type === "mission";
  const statut = (action: "suspendre" | "reprendre" | "fermer") => agir(action, async () => setData({ ...a, ...(await api<AnnonceVue>(`/v1/missions/annonces/${id}/statut`, { method: "POST", body: { action } })) }));
  const joindre = (fichier: File) =>
    agir("fichier", async () => {
      const corps = new FormData();
      corps.append("file", fichier);
      const f = await api<FichierVue>(`/v1/missions/annonces/${id}/fichiers`, { method: "POST", body: corps });
      setData({ ...a, fichiers: [...(a.fichiers ?? []), f] });
    });
  return (
    <>
      <EcranTitre titre={mission ? "Mission" : "Entreprise disponible"} retour="/missions" />
      <header className="flex flex-col gap-2">
        <Etiquette ton={a.statut !== "publiee" ? "gris" : mission ? "jaune" : "vert"}>{a.statut !== "publiee" ? LIBELLE_STATUT_ANNONCE[a.statut] : mission ? "Mission" : "Disponible"}</Etiquette>
        <h1 className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em] text-balance">{mission ? `${a.metier} à ${a.lieu}` : [a.metier, a.autreMetier].filter(Boolean).join(" et ")}</h1>
      </header>
      {a.entreprise ? <CarteEntreprise e={a.entreprise} /> : null}
      <section aria-label={mission ? "La mission" : "Disponibilités"} className={`p-4 ${CARTE}`}>
        <h2 className="pb-1 text-[16px] font-extrabold">{mission ? "La mission" : "Disponibilités"}</h2>
        <dl className="flex flex-col divide-y divide-[#e5e0d6]">
          {mission ? (
            <>
              <Ligne label="Métier">{a.metier}</Ligne>
              <Ligne label="Dates">{periodeLisible(a.debut, a.fin)}</Ligne>
              <Ligne label="Lieu">
                {a.lieu} ({a.departement})
              </Ligne>
              <Ligne label="Cadre">{typesLisibles(a.types)}</Ligne>
            </>
          ) : (
            <>
              <Ligne label="À partir du">{jourLisible(a.debut)}</Ligne>
              {a.fin ? <Ligne label="Jusqu'au">{jourLisible(a.fin)}</Ligne> : null}
              <Ligne label="Zone">
                {a.rayonKm} km autour de {a.lieu}
              </Ligne>
              {a.equipe ? <Ligne label="Équipe">{libelleDe(EQUIPES, a.equipe)}</Ligne> : null}
              <Ligne label="Missions">{typesLisibles(a.types)}</Ligne>
            </>
          )}
        </dl>
      </section>
      <section aria-label={mission ? "Description" : "Présentation"} className={`flex flex-col gap-2 p-4 ${CARTE}`}>
        <h2 className="text-[16px] font-extrabold">{mission ? "Description" : "Présentation"}</h2>
        <p className="text-[14px] leading-snug whitespace-pre-line">{a.description}</p>
        {mission && (a.niveau || a.experience || a.qualifications.length || a.equipe) ? (
          <p className="text-[13px] font-extrabold text-[#6b5300]">
            Profil : {[libelleDe(NIVEAUX, a.niveau), a.experience && a.experience !== "indifferent" ? libelleDe(EXPERIENCES, a.experience) : null, ...a.qualifications, a.equipe ? libelleDe(EQUIPES, a.equipe) : null].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {a.contexte ? <p className="text-[13px] whitespace-pre-line text-[#5c5648]">{a.contexte}</p> : null}
      </section>
      {mission && (a.budget || a.frais || a.conditions) ? (
        <section aria-label="Informations proposées" className={`p-4 ${CARTE}`}>
          <h2 className="text-[16px] font-extrabold">Informations proposées</h2>
          <p className="pb-1 text-[12px] text-[#6b6557]">Elles restent indicatives jusqu&apos;à votre accord.</p>
          <dl className="flex flex-col divide-y divide-[#e5e0d6]">
            {a.budget ? <Ligne label="Budget indicatif">{a.budget}</Ligne> : null}
            {a.frais ? <Ligne label="Frais de déplacement">{libelleDe(FRAIS, a.frais)}</Ligne> : null}
          </dl>
          {a.conditions ? <p className="pt-2 text-[13px] whitespace-pre-line text-[#5c5648]">{a.conditions}</p> : null}
        </section>
      ) : null}
      {!mission && a.tarif ? (
        <section aria-label="Tarif indicatif" className={`p-4 ${CARTE}`}>
          <h2 className="pb-1 text-[16px] font-extrabold">Tarif journalier indicatif</h2>
          <dl className="flex flex-col divide-y divide-[#e5e0d6]">
            <Ligne label="Tarif">{a.tarif}</Ligne>
            {a.dureeMinJours ? (
              <Ligne label="Durée minimale">
                {a.dureeMinJours} {a.dureeMinJours > 1 ? "jours" : "jour"}
              </Ligne>
            ) : null}
            <Ligne label="Négociable">{a.negociable ? "Oui, selon la mission" : "Non"}</Ligne>
          </dl>
          <p className="pt-2 text-[12px] text-[#6b6557]">{PHRASE_TARIF_INDICATIF}</p>
          {a.mienne && !a.tarifVisible ? <p className="pt-1 text-[12px] font-extrabold text-[#6b5300]">Masqué : toi seul vois ce tarif.</p> : null}
        </section>
      ) : null}
      {(a.fichiers ?? []).length > 0 || a.mienne ? (
        <section aria-label="Plans et photos" className={`flex flex-col gap-1 p-4 ${CARTE}`}>
          <h2 className="text-[16px] font-extrabold">Plans, photos et documents</h2>
          <ListeFichiers fichiers={a.fichiers ?? []} {...(a.mienne ? { onSupprimer: (f: FichierVue) => void agir("supprimer", async () => { await api(`/v1/fichiers-pro/${f.id}`, { method: "DELETE" }); setData({ ...a, fichiers: (a.fichiers ?? []).filter((x) => x.id !== f.id) }); }) } : {})} />
          {a.mienne && a.statut !== "fermee" ? (
            <label className="pressable mt-1 flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-extrabold">
              <Paperclip size={18} aria-hidden="true" />
              {pending === "fichier" ? "Envoi…" : "Ajouter plans ou photos du chantier"}
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void joindre(f); }} />
            </label>
          ) : null}
          {a.mienne ? <p className="text-[12px] text-[#6b6557]">{PHRASE_FORMATS}</p> : null}
        </section>
      ) : null}

      {a.mienne ? (
        <>
          {mission ? <LienJaune href={`/missions/${a.id}/reponses`}>{a.reponses ? `Voir les ${a.reponses > 1 ? `${a.reponses} entreprises intéressées` : "réponses (1 entreprise)"}` : "Voir les réponses"}</LienJaune> : <LienJaune href="/messages">Voir mes messages</LienJaune>}
          <p className="text-center text-[13px] text-muted">
            {a.consultations ?? 0} {(a.consultations ?? 0) > 1 ? "consultations" : "consultation"}
            {mission ? "" : ` · ${a.conversations ?? 0} ${(a.conversations ?? 0) > 1 ? "conversations" : "conversation"}`}
          </p>
          {a.statut !== "fermee" ? (
            <>
              <LienContour href={mission ? `/missions/nouvelle?id=${a.id}` : `/missions/services?id=${a.id}`}>Modifier l&apos;annonce</LienContour>
              <BoutonContour pending={pending === "suspendre" || pending === "reprendre"} onClick={() => void statut(a.statut === "publiee" ? "suspendre" : "reprendre")}>
                {a.statut === "publiee" ? "Suspendre l'annonce" : "Republier l'annonce"}
              </BoutonContour>
              {fermer ? (
                <div className={`flex flex-col gap-3 p-4 ${CARTE}`}>
                  <p className="text-[15px] font-extrabold">Fermer définitivement cette annonce ?</p>
                  <p className="text-[13px] text-[#5c5648]">Elle ne recevra plus de réponse et ne pourra pas être rouverte. Tes conversations restent.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void statut("fermer").then(() => setFermer(false))} disabled={pending === "fermer"} className="pressable min-h-11 flex-1 rounded-full bg-[#130901] px-4 text-[15px] font-extrabold text-white">
                      Fermer l&apos;annonce
                    </button>
                    <button type="button" onClick={() => setFermer(false)} className="pressable min-h-11 flex-1 rounded-full border border-[#8a8474] px-4 text-[15px] font-extrabold">
                      Garder ouverte
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setFermer(true)} className="min-h-11 self-center text-[14px] font-extrabold text-muted underline underline-offset-4">
                  Fermer l&apos;annonce
                </button>
              )}
            </>
          ) : (
            <Encart titre="Annonce fermée">Elle ne reçoit plus de réponse. Publie une nouvelle annonce si le besoin revient.</Encart>
          )}
        </>
      ) : (
        <>
          {a.conversationId ? (
            <LienJaune href={`/messages/${a.conversationId}`}>Ouvrir la conversation</LienJaune>
          ) : mission ? (
            a.maReponse ? (
              <>
                <Encart titre="Tu as répondu à cette mission">L&apos;entreprise peut ouvrir une conversation. Tu recevras une notification.</Encart>
                <LienContour href={`/missions/${a.id}/repondre`}>Modifier ma réponse</LienContour>
              </>
            ) : a.statut === "publiee" ? (
              <LienJaune href={`/missions/${a.id}/repondre`}>Contacter cette entreprise</LienJaune>
            ) : (
              <Encart titre="Cette mission n'est plus ouverte">Elle ne reçoit plus de réponse.</Encart>
            )
          ) : (
            <BoutonJaune pending={pending === "contacter"} onClick={() => void agir("contacter", async () => { const c = await api<{ id: string }>(`/v1/missions/annonces/${a.id}/conversation`, { method: "POST", body: { autreId: null } }); router.push(`/messages/${c.id}`); })}>
              Contacter cette entreprise
            </BoutonJaune>
          )}
          <BoutonContour pending={pending === "enregistrer"} onClick={() => void agir("enregistrer", async () => { const r = await api<{ enregistree: boolean }>(`/v1/missions/annonces/${a.id}/enregistrement`, { method: "POST", body: { garder: !a.enregistree } }); setData({ ...a, enregistree: r.enregistree }); })}>
            {a.enregistree ? (mission ? "Mission enregistrée · retirer" : "Profil enregistré · retirer") : mission ? "Enregistrer la mission" : "Enregistrer le profil"}
          </BoutonContour>
          <p className="text-center text-[13px] text-muted">{mission ? "Mobiiz facilite uniquement la mise en relation." : "Coordonnées privées avant accord mutuel."}</p>
        </>
      )}
      <Refus>{refus}</Refus>
    </>
  );
}

type Onglet = "publiees" | "reponses" | "terminees";
const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "publiees", libelle: "Publiées" },
  { id: "reponses", libelle: "Réponses" },
  { id: "terminees", libelle: "Terminées" },
];

/** Capture 43 : « Mes missions » : mes annonces publiées, mes réponses envoyées, ce qui est terminé. */
export function MesMissions() {
  const [onglet, setOnglet] = useState<Onglet>("publiees");
  const fetcher = useCallback((signal: AbortSignal) => api<{ annonces: AnnonceVue[]; reponses: { id: string; statut: string; envoyeeLe: string; annonce: AnnonceVue }[] }>("/v1/missions/miennes", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  const annonces = (data?.annonces ?? []).filter((a) => (onglet === "terminees" ? a.statut === "fermee" : a.statut !== "fermee"));
  const reponses = (data?.reponses ?? []).filter((r) => (onglet === "terminees" ? r.statut === "retiree" || r.annonce.statut === "fermee" : r.statut === "envoyee" && r.annonce.statut !== "fermee"));
  const vide = onglet === "publiees" ? annonces.length === 0 : onglet === "reponses" ? reponses.length === 0 : annonces.length + reponses.length === 0;
  return (
    <>
      <EcranTitre titre="Mes missions" retour="/missions" />
      <GrandTitre sous="Suis chaque mise en relation.">Tes annonces et réponses</GrandTitre>
      <Puces label="Mes missions" choix={ONGLETS} valeur={onglet} onChange={setOnglet} />
      {data === null ? (
        <EtatEcran erreur={error} onReessayer={reload} />
      ) : vide ? (
        <div className={`flex flex-col gap-1 p-5 ${CARTE}`}>
          <p className="text-[16px] font-extrabold">{onglet === "publiees" ? "Aucune annonce en cours" : onglet === "reponses" ? "Aucune réponse en cours" : "Rien de terminé pour le moment"}</p>
          <p className="text-[14px] text-[#5c5648]">{onglet === "reponses" ? "Réponds à une mission pour la retrouver ici." : "Publie une mission ou propose tes services."}</p>
        </div>
      ) : (
        <ul aria-label="Mes missions" className="flex flex-col gap-3">
          {onglet !== "reponses"
            ? annonces.map((a) => (
                <li key={a.id}>
                  <CarteLien
                    href={`/missions/${a.id}`}
                    titre={a.type === "mission" ? `${a.metier} · ${a.lieu}` : `Mes services · ${a.metier}`}
                    etiquette={<Etiquette ton={a.statut !== "publiee" ? "gris" : a.type === "mission" ? "jaune" : "vert"}>{a.statut !== "publiee" ? LIBELLE_STATUT_ANNONCE[a.statut] : a.type === "disponibilite" ? "Disponible" : a.reponses ? `${a.reponses} ${a.reponses > 1 ? "réponses" : "réponse"}` : "Publiée"}</Etiquette>}
                    sous={
                      <>
                        {a.type === "mission" ? `${periodeLisible(a.debut, a.fin)} · ${typesLisibles(a.types)}` : a.fin ? `Visible jusqu'au ${jourLisible(a.fin)}` : `À partir du ${jourLisible(a.debut)}`}
                        <br />
                        <span className="font-extrabold text-[#0b6b43]">{a.type === "mission" ? (a.reponses ? "Voir les entreprises intéressées" : "Modifier ou suspendre l'annonce") : `${a.consultations ?? 0} consultations · ${a.conversations ?? 0} ${(a.conversations ?? 0) > 1 ? "messages" : "message"}`}</span>
                      </>
                    }
                  />
                </li>
              ))
            : null}
          {onglet !== "publiees"
            ? reponses.map((r) => (
                <li key={r.id}>
                  <CarteLien href={`/missions/${r.annonce.id}`} titre={`${r.annonce.metier} · ${r.annonce.lieu}`} etiquette={<Etiquette ton={r.statut === "envoyee" ? "vert" : "gris"}>{r.statut === "envoyee" ? "Réponse envoyée" : "Réponse retirée"}</Etiquette>} sous={`${r.annonce.entreprise?.nom ?? "Entreprise"} · ${periodeLisible(r.annonce.debut, r.annonce.fin)}`} />
                </li>
              ))
            : null}
        </ul>
      )}
      <LienContour href="/missions">Revenir aux missions</LienContour>
    </>
  );
}

type FiltreReponses = "toutes" | "dossier" | "conversation";
/** Capture 15 : les réponses reçues à ma mission. */
export function ReponsesRecues({ id }: { id: string }) {
  const [filtre, setFiltre] = useState<FiltreReponses>("toutes");
  const fetcher = useCallback((signal: AbortSignal) => api<{ annonce: AnnonceVue; items: ReponseVue[] }>(`/v1/missions/annonces/${id}/reponses`, { signal }), [id]);
  const { data, error, reload } = useResource(fetcher);
  if (!data) {
    return (
      <>
        <EcranTitre titre="Réponses reçues" retour={`/missions/${id}`} />
        <EtatEcran erreur={error} onReessayer={reload} retour={{ href: "/missions", libelle: "Revenir aux missions" }} />
      </>
    );
  }
  const items = data.items.filter((r) => (filtre === "toutes" ? true : filtre === "dossier" ? r.documents.length > 0 : !!r.conversationId));
  const n = data.items.length;
  return (
    <>
      <EcranTitre titre="Réponses reçues" retour={`/missions/${id}`} />
      <GrandTitre sous={`Mission : ${data.annonce.metier} à ${data.annonce.lieu}`}>{n === 0 ? "Aucune réponse pour le moment" : n === 1 ? "1 entreprise a répondu" : `${n} entreprises ont répondu`}</GrandTitre>
      {n > 0 ? <Puces label="Filtrer les réponses" choix={[{ id: "toutes", libelle: "Toutes" }, { id: "dossier", libelle: "Avec dossier" }, { id: "conversation", libelle: "En conversation" }] as const} valeur={filtre} onChange={setFiltre} /> : null}
      {n === 0 ? (
        <Encart titre="Ton annonce est visible">Tu recevras une notification à chaque réponse. Les entreprises voient ta mission, jamais tes coordonnées.</Encart>
      ) : items.length === 0 ? (
        <p className="text-[14px] text-muted">Aucune réponse pour ce filtre.</p>
      ) : (
        <ul aria-label="Réponses reçues" className="flex flex-col gap-3">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/missions/reponses/${r.id}`} className={`pressable flex items-start gap-3 p-4 ${CARTE}`}>
                <Avatar initiales={r.entreprise.initiales} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[17px] leading-tight font-extrabold">{r.entreprise.nom}</span>
                  <span className="text-[13px] font-extrabold text-[#6b5300]">
                    {r.niveauLibelle} · {r.experienceAns} {r.experienceAns > 1 ? "ans" : "an"} · {r.equipe > 1 ? `équipe de ${r.equipe}` : "1 personne"}
                  </span>
                  {r.documents.length ? <span className="text-[12px] font-extrabold">{r.documents.length} {r.documents.length > 1 ? "documents partagés" : "document partagé"}</span> : null}
                  <span className="line-clamp-2 text-[13px] text-[#5c5648]">{r.message}</span>
                </span>
                {r.conversationId ? <Etiquette ton="vert">En conversation</Etiquette> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <LienContour href={`/missions/${id}`}>Gérer ou fermer l&apos;annonce</LienContour>
    </>
  );
}

/** Capture 16 : le profil qu'une entreprise a choisi de montrer pour ma mission. */
export function ReponseDetail({ id }: { id: string }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<ReponseVue>(`/v1/missions/reponses/${id}`, { signal }), [id]);
  const { data: r, error, reload } = useResource(fetcher);
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  if (!r) {
    return (
      <>
        <EcranTitre titre="Profil de l'entreprise" retour="/missions/mes-missions" />
        <EtatEcran erreur={error} onReessayer={reload} retour={{ href: "/missions", libelle: "Revenir aux missions" }} />
      </>
    );
  }
  const mienne = r.annonce?.mienne === true;
  async function demarrer() {
    setPending(true);
    setRefus(null);
    try {
      const c = await api<{ id: string }>(`/v1/missions/annonces/${r!.annonceId}/conversation`, { method: "POST", body: { autreId: r!.entreprise.id } });
      router.push(`/messages/${c.id}`);
    } catch (e) {
      setRefus(phraseErreur(e));
      setPending(false);
    }
  }
  return (
    <>
      <EcranTitre titre="Profil de l'entreprise" retour={mienne ? `/missions/${r.annonceId}/reponses` : "/missions/mes-missions"} />
      <CarteEntreprise e={r.entreprise} />
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Profil pour la mission</h1>
      <section aria-label="Profil déclaré" className={`flex flex-col gap-3 p-4 ${CARTE}`}>
        <dl className="grid grid-cols-3 gap-2">
          {[["Niveau déclaré", r.niveauLibelle ?? r.niveau], ["Expérience", `${r.experienceAns} ${r.experienceAns > 1 ? "ans" : "an"}`], ["Équipe", `${r.equipe} pers.`]].map(([l, v]) => (
            <div key={l} className="flex flex-col">
              <dt className="text-[12px] text-[#6b6557]">{l}</dt>
              <dd className="text-[16px] leading-tight font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
        {r.jours ? <p className="border-t border-[#e5e0d6] pt-2 text-[14px] font-extrabold">{r.jours}</p> : null}
        <p className="text-[12px] text-[#6b6557]">{PHRASE_DECLARATIF}</p>
      </section>
      {r.tarif || r.deplacement ? (
        <section aria-label="Proposition indicative" className={`p-4 ${CARTE}`}>
          <h2 className="pb-1 text-[16px] font-extrabold">Proposition indicative</h2>
          <dl className="flex flex-col divide-y divide-[#e5e0d6]">
            {r.tarif ? <Ligne label="Tarif proposé">{r.tarif}</Ligne> : null}
            {r.deplacement ? <Ligne label="Déplacement">{libelleDe(FRAIS, r.deplacement)}</Ligne> : null}
          </dl>
          <p className="pt-2 text-[12px] text-[#6b6557]">Conditions finales à confirmer ensemble. {PHRASE_TARIF_INDICATIF}</p>
        </section>
      ) : null}
      {r.documents.length ? (
        <section aria-label="Documents partagés" className={`flex flex-col gap-1 p-4 ${CARTE}`}>
          <h2 className="text-[16px] font-extrabold">Documents</h2>
          <ListeFichiers fichiers={r.documents} />
        </section>
      ) : null}
      <section aria-label="Message" className={`flex flex-col gap-1 p-4 ${CARTE}`}>
        <p className="text-[12px] text-[#6b6557]">Message</p>
        <p className="text-[15px] font-extrabold whitespace-pre-line">{r.message}</p>
      </section>
      {mienne ? (
        r.conversationId ? (
          <LienJaune href={`/messages/${r.conversationId}`}>Ouvrir la conversation</LienJaune>
        ) : (
          <BoutonJaune pending={pending} onClick={() => void demarrer()}>
            Démarrer une conversation
          </BoutonJaune>
        )
      ) : (
        <>
          <Encart titre="C'est ta réponse">L&apos;entreprise peut ouvrir une conversation. Tes coordonnées restent privées.</Encart>
          <LienContour href={`/missions/${r.annonceId}/repondre`}>Modifier ma réponse</LienContour>
        </>
      )}
      <Refus>{refus}</Refus>
    </>
  );
}

/** Capture 45 : « Réponse envoyée ». */
export function ReponseEnvoyee({ r }: { r: ReponseVue; }) {
  return (
    <>
      <EcranTitre titre="Réponse envoyée" retour="/missions" />
      <RondFait />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-[26px] font-extrabold">Réponse envoyée</h1>
        <p className="text-[14px] text-muted">{r.annonce ? `${r.annonce.entreprise?.nom ?? ""} · ${r.annonce.metier}` : ""}</p>
      </div>
      <section aria-label="Ce que l'entreprise voit" className={`flex flex-col gap-1.5 p-4 ${CARTE}`}>
        <h2 className="text-[16px] font-extrabold">Ce que l&apos;entreprise voit</h2>
        <p className="text-[14px] font-extrabold">
          {r.entreprise.nom} · {r.entreprise.verifiee ? "entreprise vérifiée" : "entreprise"}
        </p>
        <p className="text-[13px] font-extrabold text-[#6b5300]">
          Niveau {r.niveauLibelle?.toLowerCase()} · {r.experienceAns} {r.experienceAns > 1 ? "ans" : "an"} · {r.equipe > 1 ? `équipe de ${r.equipe}` : "1 personne"}
        </p>
        <p className="text-[14px] font-extrabold">{r.documents.length ? `${r.documents.length} ${r.documents.length > 1 ? "documents partagés" : "document partagé"}` : "Aucun document partagé"}</p>
        <p className="text-[13px] font-extrabold text-[#0b6b43]">Tes coordonnées restent privées.</p>
      </section>
      <Encart titre="Prochaine étape">L&apos;entreprise peut ouvrir une conversation. Tu recevras une notification.</Encart>
      <LienJaune href="/missions/mes-missions">Voir mes réponses</LienJaune>
      <LienContour href="/missions">Revenir aux missions</LienContour>
    </>
  );
}

