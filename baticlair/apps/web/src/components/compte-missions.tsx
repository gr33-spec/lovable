"use client";

import { BellRing, CreditCard, FlaskConical, FolderOpen, Mail, Paperclip, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CATEGORIES_ALERTE, CATEGORIES_DOCUMENT, PHRASE_FORMATS, type CategorieDocument, type ReglagesAlertes } from "../../../../packages/domain/src/missions/missions";
import { api } from "@/lib/api";
import { phraseErreur, useMissionsActif, type AnnonceVue, type EntrepriseVue, type FichierVue } from "@/lib/missions";
import { useResource } from "@/lib/use-resource";
import { revoirLeGuide } from "./guide-premier-lancement";
import { ListeFichiers } from "./missions";
import { Avatar, BoutonContour, BoutonJaune, CARTE, CarteLien, ChampLong, ChampTexte, Coche, Encart, EtatEcran, Etiquette, Interrupteur, LienContour, Refus, TitreSection } from "./ux-kit";

/** LES RUBRIQUES DU COMPTE NÉES AVEC LES MISSIONS (Greg, 10 novembre 2026, captures 21, 24, 25, 44). */

const GROUPES = ["Dossier", "Justificatifs", "Références"] as const;

/** Capture 24 : le dossier professionnel. Utilisé uniquement quand l'entreprise choisit de répondre. */
export function DossierProfessionnel() {
  const actif = useMissionsActif();
  const fetcher = useCallback((signal: AbortSignal) => api<{ items: FichierVue[] }>("/v1/dossier-pro", { signal }), []);
  const { data, error, reload, setData } = useResource(fetcher);
  const [pending, setPending] = useState<string | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  if (actif === false) return <Encart titre="Bientôt disponible">Le dossier professionnel arrive avec les missions entre entreprises.</Encart>;
  if (!data) return <EtatEcran erreur={error} onReessayer={reload} />;
  async function ajouter(categorie: CategorieDocument, fichier: File) {
    setPending(categorie);
    setRefus(null);
    try {
      const corps = new FormData();
      corps.append("file", fichier);
      corps.append("categorie", categorie);
      const d = await api<FichierVue>("/v1/dossier-pro", { method: "POST", body: corps });
      setData({ items: [d, ...data!.items] });
    } catch (e) {
      setRefus(phraseErreur(e));
    } finally {
      setPending(null);
    }
  }
  async function supprimer(f: FichierVue) {
    setRefus(null);
    try {
      await api(`/v1/fichiers-pro/${f.id}`, { method: "DELETE" });
      setData({ items: data!.items.filter((x) => x.id !== f.id) });
    } catch (e) {
      setRefus(phraseErreur(e));
    }
  }
  async function surProfil(f: FichierVue, v: boolean) {
    setRefus(null);
    try {
      await api(`/v1/dossier-pro/${f.id}`, { method: "PATCH", body: { surProfil: v } });
      setData({ items: data!.items.map((x) => (x.id === f.id ? { ...x, surProfil: v } : x)) });
    } catch (e) {
      setRefus(phraseErreur(e));
    }
  }
  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] leading-tight font-extrabold tracking-[-0.02em]">Ton dossier professionnel</h2>
        <p className="text-[14px] text-muted">Utilisé uniquement quand tu choisis de répondre. Rien n&apos;est montré sans ton accord.</p>
      </header>
      <Refus>{refus}</Refus>
      {GROUPES.map((g) => (
        <section key={g} aria-label={g} className="flex flex-col gap-3">
          <TitreSection>{g}</TitreSection>
          {CATEGORIES_DOCUMENT.filter((c) => c.groupe === g).map((c) => {
            const docs = data.items.filter((d) => d.categorie === c.id);
            return (
              <div key={c.id} className={`flex flex-col gap-1 p-4 ${CARTE}`}>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#efece6]">
                    <FolderOpen size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="text-[16px] leading-tight font-extrabold">{c.libelle}</h3>
                    <p className="text-[13px] text-[#5c5648]">{docs.length ? `${docs.length} ${docs.length > 1 ? "documents" : "document"}` : c.aide}</p>
                  </div>
                </div>
                <ListeFichiers fichiers={docs} onSupprimer={(f) => void supprimer(f)} />
                {c.id === "realisation"
                  ? docs.map((d) => (
                      <label key={d.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px] font-semibold">
                        <input type="checkbox" checked={!!d.surProfil} onChange={(e) => void surProfil(d, e.target.checked)} className="size-5 accent-[#fed206]" />
                        Montrer « {d.titre || d.nom} » sur mon profil public
                      </label>
                    ))
                  : null}
                <label className="pressable flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-extrabold">
                  <Paperclip size={18} aria-hidden="true" />
                  {pending === c.id ? "Envoi…" : `Ajouter : ${c.libelle.toLowerCase()}`}
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={!!pending} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void ajouter(c.id, f); }} />
                </label>
              </div>
            );
          })}
        </section>
      ))}
      <p className="text-[12px] text-muted">{PHRASE_FORMATS}</p>
      <LienContour href="/compte/profil-public">Voir mon profil public</LienContour>
    </>
  );
}

interface MonProfil { entreprise: EntrepriseVue; visible: boolean; presentation: string | null; metiers: string[]; services: string | null; equipe: string | null; ville: string | null; disponibilite: AnnonceVue | null; documents: Record<string, number> }

/** Capture 44 : le profil public et les missions. Invisible tant que l'entreprise ne le rend pas visible. */
export function ProfilPublicEditeur() {
  const actif = useMissionsActif();
  const fetcher = useCallback((signal: AbortSignal) => api<MonProfil>("/v1/profil-public", { signal }), []);
  const { data, error, reload, setData } = useResource(fetcher);
  const [saisie, setSaisie] = useState<{ visible: boolean; presentation: string; metiers: string; services: string; equipe: string; ville: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  if (actif === false) return <Encart titre="Bientôt disponible">Le profil public arrive avec les missions entre entreprises.</Encart>;
  if (!data) return <EtatEcran erreur={error} onReessayer={reload} />;
  const s = saisie ?? { visible: data.visible, presentation: data.presentation ?? "", metiers: data.metiers.join(", "), services: data.services ?? "", equipe: data.equipe ?? "", ville: data.ville ?? "" };
  const maj = (m: Partial<typeof s>) => {
    setSaisie({ ...s, ...m });
    setOk(false);
  };
  async function enregistrer() {
    setPending(true);
    setRefus(null);
    try {
      const p = await api<MonProfil>("/v1/profil-public", { method: "PUT", body: { visible: s.visible, presentation: s.presentation.trim() || null, metiers: s.metiers.split(",").map((m) => m.trim()).filter(Boolean), services: s.services.trim() || null, equipe: s.equipe.trim() || null, ville: s.ville.trim() || null } });
      setData(p);
      setSaisie(null);
      setOk(true);
    } catch (e) {
      setRefus(phraseErreur(e));
    } finally {
      setPending(false);
    }
  }
  const nbDocs = Object.values(data.documents).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className={`flex items-center gap-3 p-4 ${CARTE}`}>
        <Avatar initiales={data.entreprise.initiales} jaune />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-[18px] font-extrabold">{data.entreprise.nom}</p>
          <p className="text-[13px] text-[#5c5648]">
            {data.entreprise.verifiee ? "Entreprise vérifiée" : "Entreprise non vérifiée"}
            {data.entreprise.departement ? ` · département ${data.entreprise.departement}` : ""}
          </p>
          <Etiquette ton={data.visible ? "vert" : "gris"}>{data.visible ? "Public" : "Non visible"}</Etiquette>
        </div>
      </div>
      <TitreSection>Présentation</TitreSection>
      <Coche coche={s.visible} onChange={(v) => maj({ visible: v })} titre="Rendre mon profil visible des entreprises vérifiées" sous="Décoché, seules les entreprises avec qui tu échanges voient ton nom." />
      <ChampLong label="Présentation publique" value={s.presentation} onChange={(e) => maj({ presentation: e.target.value })} maxLength={1500} placeholder="Couvreur-zingueur, équipe de 3." />
      <ChampTexte label="Métiers et services (séparés par une virgule)" value={s.metiers} onChange={(e) => maj({ metiers: e.target.value })} placeholder="Couverture, zinguerie, fenêtres de toit" />
      <div className="grid grid-cols-2 gap-3">
        <ChampTexte label="Équipe" value={s.equipe} onChange={(e) => maj({ equipe: e.target.value })} placeholder="3 personnes" maxLength={60} />
        <ChampTexte label="Commune" value={s.ville} onChange={(e) => maj({ ville: e.target.value })} placeholder="Lannion" maxLength={80} />
      </div>
      <BoutonJaune pending={pending} disabled={saisie === null} onClick={() => void enregistrer()}>
        Enregistrer mon profil
      </BoutonJaune>
      {saisie === null && !ok ? <p className="text-center text-[13px] text-muted">Modifie une information pour enregistrer.</p> : null}
      {ok ? <p role="status" className="rounded-xl bg-[#d9f1e3] px-4 py-3 text-[14px] font-semibold text-[#0b6b43]">Profil enregistré.</p> : null}
      <Refus>{refus}</Refus>
      <TitreSection>Profil professionnel</TitreSection>
      <CarteLien href={data.disponibilite ? `/missions/${data.disponibilite.id}` : "/missions/services"} icone={RefreshCw} titre="Disponibilités" sous={data.disponibilite ? `Visible ${data.disponibilite.fin ? `jusqu'au ${data.disponibilite.fin.split("-").reverse().join("/")}` : `à partir du ${data.disponibilite.debut.split("-").reverse().join("/")}`}` : "Aucune disponibilité publiée"} />
      <CarteLien href="/compte/documents" icone={FolderOpen} titre="Documents et réalisations" sous={nbDocs ? `${nbDocs} ${nbDocs > 1 ? "documents" : "document"} dans ton dossier` : "CV, assurances, qualifications et photos"} />
      <LienContour href={`/missions/profil/${data.entreprise.id}`}>Prévisualiser mon profil public</LienContour>
    </>
  );
}

interface ProfilVu { entreprise: EntrepriseVue; visible: boolean; presentation: string | null; metiers: string[]; services: string | null; equipe: string | null; ville: string | null; disponibilite: AnnonceVue | null; realisations: FichierVue[] }

/** Le profil d'une entreprise, tel que les autres le voient (jamais ses coordonnées). */
export function ProfilPublicVu({ id }: { id: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<ProfilVu>(`/v1/profil-public/${id}`, { signal }), [id]);
  const { data: p, error, reload } = useResource(fetcher);
  if (!p) return <EtatEcran erreur={error} onReessayer={reload} retour={{ href: "/missions", libelle: "Revenir aux missions" }} />;
  return (
    <>
      <div className={`flex items-center gap-3 p-4 ${CARTE}`}>
        <Avatar initiales={p.entreprise.initiales} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-[20px] font-extrabold">{p.entreprise.nom}</h1>
          <p className="text-[13px] text-[#5c5648]">
            {p.entreprise.verifiee ? "Entreprise vérifiée" : "Entreprise non vérifiée"}
            {p.ville ? ` · ${p.ville}` : p.entreprise.departement ? ` · département ${p.entreprise.departement}` : ""}
          </p>
          {p.disponibilite ? <Etiquette ton="vert">Disponible</Etiquette> : null}
        </div>
      </div>
      {p.presentation || p.metiers.length || p.equipe ? (
        <section aria-label="Présentation" className={`flex flex-col gap-2 p-4 ${CARTE}`}>
          <h2 className="text-[16px] font-extrabold">Présentation</h2>
          {p.presentation ? <p className="text-[14px] leading-snug whitespace-pre-line">{p.presentation}</p> : null}
          {p.metiers.length ? (
            <div className="flex flex-wrap gap-2">
              {p.metiers.map((m) => (
                <Etiquette key={m}>{m}</Etiquette>
              ))}
            </div>
          ) : null}
          {p.equipe ? <p className="text-[13px] font-extrabold text-[#6b5300]">Équipe : {p.equipe}</p> : null}
          <p className="text-[12px] text-[#6b6557]">Informations déclarées par l&apos;entreprise.</p>
        </section>
      ) : (
        <Encart titre="Profil non renseigné">Cette entreprise n&apos;a pas encore rendu sa présentation visible.</Encart>
      )}
      {p.realisations.length ? (
        <section aria-label="Réalisations" className={`flex flex-col gap-1 p-4 ${CARTE}`}>
          <h2 className="text-[16px] font-extrabold">Réalisations</h2>
          <ListeFichiers fichiers={p.realisations} />
        </section>
      ) : null}
      {p.disponibilite ? <LienContour href={`/missions/${p.disponibilite.id}`}>Voir sa disponibilité</LienContour> : null}
      <p className="text-center text-[13px] text-muted">Coordonnées privées avant accord mutuel.</p>
    </>
  );
}

/** Capture 21 : les réglages de notification, par catégorie et par canal. */
export function ReglagesNotifications() {
  const fetcher = useCallback((signal: AbortSignal) => api<ReglagesAlertes>("/v1/alertes/reglages", { signal }), []);
  const { data, error, reload, setData } = useResource(fetcher);
  const [refus, setRefus] = useState<string | null>(null);
  const missions = useMissionsActif();
  if (!data) return <EtatEcran erreur={error} onReessayer={reload} />;
  // Chaque interrupteur s'enregistre aussitôt ; un refus du serveur le remet à sa place et dit pourquoi.
  async function regler(m: Partial<ReglagesAlertes>) {
    const avant = data!;
    setData({ ...avant, ...m });
    setRefus(null);
    try {
      setData(await api<ReglagesAlertes>("/v1/alertes/reglages", { method: "PUT", body: { ...avant, ...m } }));
    } catch (e) {
      setData(avant);
      setRefus(phraseErreur(e));
    }
  }
  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] leading-tight font-extrabold tracking-[-0.02em]">Reste informé sans être dérangé</h2>
        <p className="text-[14px] text-muted">Chaque catégorie peut être réglée séparément.</p>
      </header>
      {CATEGORIES_ALERTE.filter((c) => c.id !== "missions" || missions !== false).map((c) => (
        <Interrupteur key={c.id} titre={c.titre} sous={c.detail} actif={data[c.id]} onChange={(v) => void regler({ [c.id]: v })} />
      ))}
      <Refus>{refus}</Refus>
      <TitreSection>Canaux</TitreSection>
      <div className={`flex items-center gap-3 p-4 ${CARTE}`}>
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#efece6]">
          <BellRing size={20} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[16px] font-extrabold">Notifications dans l&apos;application</span>
          <span className="text-[13px] text-[#5c5648]">Toujours actives pour les actions importantes</span>
        </span>
      </div>
      <Interrupteur titre="E-mails" sous="Résumé et rappels complémentaires" actif={data.email} onChange={(v) => void regler({ email: v })} />
      <Interrupteur titre="Notifications push" sous="Sur les appareils autorisés" actif={data.push} onChange={(v) => void regler({ push: v })} />
      <p className="text-[13px] text-muted">Un bon de commande part toujours par e-mail, même e-mails coupés.</p>
    </>
  );
}

/** Capture 25 : la réception des réponses des négoces (réglages techniques, sans mélanger les messages). */
export function OuLireLesReponses() {
  return (
    <>
      <Encart titre="Où lire les réponses ?">Dans « Messages et réponses », filtre Négoces. Les propositions restent aussi dans leur quantitatif.</Encart>
      <div className={`flex flex-col divide-y divide-[#e5e0d6] ${CARTE}`}>
        {[
          { icone: CreditCard, titre: "Rattachement automatique", sous: "La réponse rejoint la bonne demande grâce à l'adresse de réponse et au repère de l'objet." },
          { icone: FolderOpen, titre: "Pièces jointes", sous: "Devis, PDF et documents reçus sont conservés avec le message original." },
          { icone: BellRing, titre: "Alerte de nouvelle réponse", sous: "Dans l'application et par e-mail, selon tes réglages de notification." },
        ].map(({ icone: Icone, titre, sous }) => (
          <div key={titre} className="flex items-start gap-3 p-4">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#efece6]">
              <Icone size={20} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[16px] font-extrabold">{titre}</span>
              <span className="text-[13px] text-[#5c5648]">{sous}</span>
            </span>
          </div>
        ))}
      </div>
      <CarteLien href="/messages" icone={Mail} titre="Ouvrir « Messages et réponses »" sous="Conversations Missions et réponses des négoces" />
      <CarteLien href="/recus" icone={FolderOpen} titre="E-mails reçus à rattacher" sous="Ranger à la main un e-mail arrivé sans repère" />
      <CarteLien href="/compte/notifications" icone={BellRing} titre="Régler les alertes" sous="Demandes de prix, achats groupés, missions" />
    </>
  );
}

/** Capture 19, « Guide et chantier fictif » : revoir le parcours sans risque. */
export function GuideEtChantierFictif() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  async function demo() {
    setPending(true);
    setRefus(null);
    try {
      const { projectId } = await api<{ projectId: string }>("/v1/demo/project", { method: "POST" });
      router.push(`/chantiers/${projectId}`);
    } catch (e) {
      setRefus(phraseErreur(e));
      setPending(false);
    }
  }
  return (
    <>
      <div className={`flex flex-col gap-3 p-4 ${CARTE}`}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#efece6]">
            <FlaskConical size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[16px] font-extrabold">Chantier fictif</span>
            <span className="text-[13px] text-[#5c5648]">Un faux chantier pour essayer sans risque : rien ne part chez un négoce.</span>
          </span>
        </div>
        <BoutonJaune pending={pending} onClick={() => void demo()}>
          {pending ? "Préparation…" : "Essayer avec un chantier fictif"}
        </BoutonJaune>
        <Refus>{refus}</Refus>
      </div>
      <BoutonContour onClick={() => { router.push("/"); revoirLeGuide(); }}>Revoir le guide</BoutonContour>
      <p className="text-center text-[13px] text-muted">
        Une question ? <Link href="/compte/aide" className="font-extrabold underline underline-offset-4">Aide et contact</Link>
      </p>
    </>
  );
}
