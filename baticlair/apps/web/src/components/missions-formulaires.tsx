"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  CATEGORIES_DOCUMENT,
  EQUIPES,
  EXPERIENCES,
  fautesDisponibilite,
  fautesMission,
  fautesReponse,
  FICHIERS_PAR_ANNONCE,
  FRAIS,
  METIERS_BATIMENT,
  MODES_CHIFFRAGE,
  NIVEAUX,
  periodeLisible,
  PHRASE_FORMATS,
  QUALIFICATIONS,
  TYPES_MISSION,
  UNITES_TARIF,
  budgetLisible,
  libelleDe,
  tarifLisible,
  type Faute,
  type SaisieDisponibilite,
  type SaisieMission,
} from "../../../../packages/domain/src/missions/missions";
import { api, ApiError } from "@/lib/api";
import { phraseErreur, type AnnonceVue, type FichierVue, type ReponseVue } from "@/lib/missions";
import { useResource } from "@/lib/use-resource";
import { ReponseEnvoyee } from "./missions";
import { BoutonContour, BoutonJaune, CARTE, ChampChoix, ChampLong, ChampTexte, Coche, EcranTitre, Encart, EtatEcran, Etiquette, GrandTitre, LienContour, Ligne, Refus } from "./ux-kit";

/** MISSIONS : les formulaires (publier une mission, proposer ses services, répondre). Rien n'est publié avant le dernier bouton. */

const aujourdHui = () => new Date().toISOString().slice(0, 10);
const nombre = (v: string): number | null => (v.trim() === "" || Number.isNaN(Number(v.replace(",", "."))) ? null : Number(v.replace(",", ".")));
const fautesDeLApi = (e: unknown): Faute[] => (e instanceof ApiError ? (e.fautes ?? []) : []);

/** Le métier : une saisie libre aidée par la liste complète (tous les métiers restent accessibles par la recherche). */
function ChampMetier({ label, valeur, onChange, erreur }: { label: string; valeur: string; onChange: (v: string) => void; erreur?: string | undefined }) {
  const id = useId();
  return (
    <>
      <ChampTexte label={label} value={valeur} onChange={(e) => onChange(e.target.value)} list={id} placeholder="Choisir ou écrire un métier" erreur={erreur} autoComplete="off" />
      <datalist id={id}>
        {METIERS_BATIMENT.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </>
  );
}

/** Plusieurs choix à cocher en pastilles (type de mission, qualifications). */
function ChoixMultiples({ label, choix, valeurs, onChange, erreur }: { label: string; choix: readonly { id: string; libelle: string }[]; valeurs: string[]; onChange: (v: string[]) => void; erreur?: string | undefined }) {
  return (
    <fieldset className={`flex flex-col gap-2 p-4 ${CARTE} ${erreur ? "ring-2 ring-danger" : ""}`}>
      <legend className="float-left pb-1 text-[12px] text-[#6b6557]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {choix.map((c) => {
          const actif = valeurs.includes(c.id);
          return (
            <button key={c.id} type="button" aria-pressed={actif} onClick={() => onChange(actif ? valeurs.filter((v) => v !== c.id) : [...valeurs, c.id])} className={`pressable min-h-11 rounded-full px-4 text-[14px] font-extrabold ${actif ? "bg-accent text-on-accent" : "border border-[#8a8474] text-[#130901]"}`}>
              {c.libelle}
            </button>
          );
        })}
      </div>
      {erreur ? (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  );
}

function Etapes({ n, sur }: { n: number; sur: number }) {
  return <p className="text-[13px] font-bold text-accent-text">Étape {n} sur {sur}</p>;
}

const MISSION_VIDE: SaisieMission = { metier: "", lieu: "", codePostal: "", debut: "", fin: "", types: [], description: "", niveau: null, experience: null, qualifications: [], equipe: null, contexte: "", modeChiffrage: null, budgetMin: null, budgetMax: null, frais: null, conditions: "" };

/** Captures 07, 13, 49, puis l'aperçu : publier (ou modifier) une mission, en quatre temps courts. */
export function MissionFormulaire() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [s, setS] = useState<SaisieMission>(MISSION_VIDE);
  const [charge, setCharge] = useState(!id);
  const [etape, setEtape] = useState(1);
  const [fautes, setFautes] = useState<Faute[]>([]);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let vivant = true;
    api<AnnonceVue>(`/v1/missions/annonces/${id}`).then(
      (a) => {
        if (!vivant) return;
        setS({ metier: a.metier, lieu: a.lieu, codePostal: "", debut: a.debut, fin: a.fin ?? a.debut, types: a.types, description: a.description, niveau: a.niveau, experience: a.experience, qualifications: a.qualifications, equipe: a.equipe, contexte: a.contexte ?? "", modeChiffrage: a.modeChiffrage, budgetMin: a.budgetMin, budgetMax: a.budgetMax, frais: a.frais, conditions: a.conditions ?? "" });
        setCharge(true);
      },
      (e: unknown) => vivant && setRefus(phraseErreur(e)),
    );
    return () => {
      vivant = false;
    };
  }, [id]);
  // Un champ corrigé perd aussitôt sa phrase d'erreur : elle ne reste jamais sous un champ bien rempli.
  const maj = <K extends keyof SaisieMission>(k: K, v: SaisieMission[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setFautes((f) => f.filter((x) => x.champ !== k));
  };
  const erreur = (champ: string) => fautes.find((f) => f.champ === champ)?.message;
  const CHAMPS = [["metier", "lieu", "codePostal", "debut", "fin", "types", "description"], ["niveau", "experience", "qualifications", "equipe", "contexte"], ["modeChiffrage", "budgetMin", "budgetMax", "frais", "conditions"]];
  const propre = (): SaisieMission => ({ ...s, contexte: s.contexte?.trim() || null, conditions: s.conditions?.trim() || null });

  function suivant() {
    const f = fautesMission(propre(), aujourdHui()).filter((x) => CHAMPS[etape - 1]!.includes(x.champ));
    setFautes(f);
    if (f.length === 0) {
      setEtape(etape + 1);
      window.scrollTo({ top: 0 });
    }
  }
  async function publier() {
    setPending(true);
    setRefus(null);
    try {
      const a = await api<AnnonceVue>(id ? `/v1/missions/annonces/${id}` : "/v1/missions/annonces", { method: id ? "PATCH" : "POST", body: { type: "mission", ...propre() } });
      // Les plans et photos partent après la publication ; un fichier refusé n'annule pas l'annonce, il est dit sur sa fiche.
      for (const f of fichiers) {
        const corps = new FormData();
        corps.append("file", f);
        await api(`/v1/missions/annonces/${a.id}/fichiers`, { method: "POST", body: corps }).catch(() => undefined);
      }
      router.replace(`/missions/${a.id}`);
    } catch (e) {
      const f = fautesDeLApi(e);
      setFautes(f);
      setRefus(phraseErreur(e));
      const etapeFautive = CHAMPS.findIndex((c) => f.some((x) => c.includes(x.champ)));
      if (etapeFautive >= 0) setEtape(etapeFautive + 1);
      setPending(false);
    }
  }
  if (!charge) {
    return (
      <>
        <EcranTitre titre="Modifier la mission" retour="/missions" />
        {refus ? <Refus>{refus}</Refus> : <EtatEcran erreur={null} />}
      </>
    );
  }
  const titre = id ? "Modifier la mission" : "Proposer une mission";
  return (
    <form className="contents" onSubmit={(e) => e.preventDefault()} noValidate>
      {etape === 1 ? <EcranTitre titre={titre} retour="/missions" /> : <RetourEtape titre={titre} onRetour={() => setEtape(etape - 1)} />}
      {etape === 1 ? (
        <>
          <GrandTitre sous="Les coordonnées restent privées au départ.">De quelle aide as-tu besoin ?</GrandTitre>
          <ChampMetier label="Métier recherché" valeur={s.metier} onChange={(v) => maj("metier", v)} erreur={erreur("metier")} />
          <div className="grid grid-cols-[1fr_7.5rem] gap-3">
            <ChampTexte label="Lieu de la mission (commune)" value={s.lieu} onChange={(e) => maj("lieu", e.target.value)} placeholder="Plouha" erreur={erreur("lieu")} autoComplete="address-level2" />
            <ChampTexte label="Code postal" value={s.codePostal} onChange={(e) => maj("codePostal", e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" placeholder="22580" erreur={erreur("codePostal")} autoComplete="postal-code" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ChampTexte label="Du" type="date" min={aujourdHui()} value={s.debut} onChange={(e) => { setS((x) => ({ ...x, debut: e.target.value, fin: x.fin && x.fin >= e.target.value ? x.fin : e.target.value })); setFautes((f) => f.filter((x) => x.champ !== "debut" && x.champ !== "fin")); }} erreur={erreur("debut")} />
            <ChampTexte label="Au" type="date" min={s.debut || aujourdHui()} value={s.fin} onChange={(e) => maj("fin", e.target.value)} erreur={erreur("fin")} />
          </div>
          <ChoixMultiples label="Type de mission" choix={TYPES_MISSION} valeurs={s.types} onChange={(v) => maj("types", v)} erreur={erreur("types")} />
          <ChampLong label="Description" value={s.description} onChange={(e) => maj("description", e.target.value)} maxLength={1500} placeholder="Pose d'ardoises naturelles sur une maison individuelle. Équipe autonome recherchée pendant trois jours." erreur={erreur("description")} />
          <Encart titre="Mise en relation uniquement.">Vous convenez directement des conditions.</Encart>
          <BoutonJaune onClick={suivant}>Continuer</BoutonJaune>
        </>
      ) : etape === 2 ? (
        <>
          <header className="flex flex-col gap-1">
            <Etapes n={2} sur={3} />
            <GrandTitre sous="Uniquement des critères professionnels. Tout est facultatif.">Précise le profil attendu</GrandTitre>
          </header>
          <ChampChoix label="Niveau souhaité" value={s.niveau ?? ""} onChange={(e) => maj("niveau", e.target.value || null)} choix={NIVEAUX} vide="Indifférent" />
          <ChampChoix label="Expérience souhaitée" value={s.experience ?? ""} onChange={(e) => maj("experience", e.target.value || null)} choix={EXPERIENCES.filter((x) => x.id !== "indifferent")} vide="Indifférent" />
          <ChoixMultiples label="Qualifications utiles" choix={QUALIFICATIONS.map((q) => ({ id: q, libelle: q }))} valeurs={s.qualifications ?? []} onChange={(v) => maj("qualifications", v)} erreur={erreur("qualifications")} />
          <ChampChoix label="Équipe recherchée" value={s.equipe ?? ""} onChange={(e) => maj("equipe", e.target.value || null)} choix={EQUIPES} vide="À convenir" />
          <ChampLong label="Contexte donné par ton entreprise" value={s.contexte ?? ""} onChange={(e) => maj("contexte", e.target.value)} maxLength={600} placeholder="Matériaux déjà sur place. Échafaudage fourni." erreur={erreur("contexte")} />
          <ChoixFichiers fichiers={fichiers} onChange={setFichiers} />
          <BoutonJaune onClick={suivant}>Continuer</BoutonJaune>
        </>
      ) : etape === 3 ? (
        <>
          <header className="flex flex-col gap-1">
            <Etapes n={3} sur={3} />
            <GrandTitre sous="Elles restent indicatives jusqu'à votre accord. Tout est facultatif.">Informations proposées</GrandTitre>
          </header>
          <ChampChoix label="Mode de chiffrage proposé" value={s.modeChiffrage ?? ""} onChange={(e) => maj("modeChiffrage", e.target.value || null)} choix={MODES_CHIFFRAGE} vide="Non précisé" />
          <div className="grid grid-cols-2 gap-3">
            <ChampTexte label={`Budget indicatif, de (€ HT${s.modeChiffrage === "jour" ? " / jour" : ""})`} inputMode="decimal" value={s.budgetMin ?? ""} onChange={(e) => maj("budgetMin", nombre(e.target.value))} placeholder="400" erreur={erreur("budgetMin")} />
            <ChampTexte label="à (€ HT)" inputMode="decimal" value={s.budgetMax ?? ""} onChange={(e) => maj("budgetMax", nombre(e.target.value))} placeholder="500" erreur={erreur("budgetMax")} />
          </div>
          <ChampChoix label="Frais de déplacement" value={s.frais ?? ""} onChange={(e) => maj("frais", e.target.value || null)} choix={FRAIS} vide="Non précisé" />
          <ChampLong label="Conditions complémentaires" value={s.conditions ?? ""} onChange={(e) => maj("conditions", e.target.value)} maxLength={600} placeholder="Facturation et délai de paiement à convenir." erreur={erreur("conditions")} />
          <Encart titre="Mobiiz ne contractualise pas la mission.">Les entreprises définissent et signent directement leurs propres conditions.</Encart>
          <BoutonJaune onClick={suivant}>Continuer vers l&apos;aperçu</BoutonJaune>
        </>
      ) : (
        <>
          <GrandTitre sous="Vérifie avant de publier. Rien n'est encore visible.">Aperçu de ta mission</GrandTitre>
          <section aria-label="Aperçu" className={`flex flex-col gap-2 p-4 ${CARTE}`}>
            <Etiquette>Mission</Etiquette>
            <p className="text-[20px] leading-tight font-extrabold">
              {s.metier} à {s.lieu}
            </p>
            <dl className="flex flex-col divide-y divide-[#e5e0d6]">
              <Ligne label="Dates">{periodeLisible(s.debut, s.fin)}</Ligne>
              <Ligne label="Cadre">{s.types.map((t) => libelleDe(TYPES_MISSION, t)).join(" · ")}</Ligne>
              {s.niveau ? <Ligne label="Niveau">{libelleDe(NIVEAUX, s.niveau)}</Ligne> : null}
              {s.equipe ? <Ligne label="Équipe">{libelleDe(EQUIPES, s.equipe)}</Ligne> : null}
              {budgetLisible(s.modeChiffrage, s.budgetMin, s.budgetMax) ? <Ligne label="Budget indicatif">{budgetLisible(s.modeChiffrage, s.budgetMin, s.budgetMax)}</Ligne> : null}
              {fichiers.length ? <Ligne label="Pièces jointes">{fichiers.length}</Ligne> : null}
            </dl>
            <p className="text-[14px] whitespace-pre-line">{s.description}</p>
          </section>
          <Encart titre="Ce que les autres entreprises verront">Ton entreprise, son département et cette annonce. Jamais ton téléphone ni ton e-mail avant votre accord.</Encart>
          <BoutonJaune pending={pending} onClick={() => void publier()}>
            {id ? "Enregistrer les modifications" : "Publier ma mission"}
          </BoutonJaune>
          <BoutonContour onClick={() => setEtape(1)}>Modifier</BoutonContour>
        </>
      )}
      <Refus>{refus}</Refus>
    </form>
  );
}

function RetourEtape({ titre, onRetour }: { titre: string; onRetour: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onRetour} aria-label="Étape précédente" className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-[26px] leading-none">
        ‹
      </button>
      <p className="truncate text-[17px] font-extrabold">{titre}</p>
    </div>
  );
}

function ChoixFichiers({ fichiers, onChange }: { fichiers: File[]; onChange: (f: File[]) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-[18px] border border-line bg-(--voile-2) p-4">
      <label className="pressable flex min-h-11 cursor-pointer items-center gap-2 text-[15px] font-extrabold">
        + Ajouter plans ou photos du chantier
        <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { onChange([...fichiers, ...Array.from(e.target.files ?? [])].slice(0, FICHIERS_PAR_ANNONCE)); e.target.value = ""; }} />
      </label>
      {fichiers.length ? (
        <ul aria-label="Fichiers choisis" className="flex flex-col gap-1">
          {fichiers.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-[14px]">
              <span className="min-w-0 truncate">{f.name}</span>
              <button type="button" onClick={() => onChange(fichiers.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`} className="min-h-11 shrink-0 px-2 font-extrabold text-accent-text">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[12px] text-muted">
        {PHRASE_FORMATS} {FICHIERS_PAR_ANNONCE} fichiers au plus.
      </p>
    </div>
  );
}

const DISPO_VIDE: SaisieDisponibilite = { metier: "", autreMetier: "", ville: "", codePostal: "", rayonKm: 40, debut: "", fin: "", types: [], presentation: "", equipe: null, tarifJour: null, tarifUnite: "personne", dureeMinJours: null, negociable: true, tarifVisible: true };

/** Captures 08 et 50 : proposer ses services, puis le repère de tarif (facultatif, masquable, jamais un engagement). */
export function ServicesFormulaire() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [s, setS] = useState<SaisieDisponibilite>(DISPO_VIDE);
  const [charge, setCharge] = useState(!id);
  const [etape, setEtape] = useState(1);
  const [fautes, setFautes] = useState<Faute[]>([]);
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let vivant = true;
    api<AnnonceVue>(`/v1/missions/annonces/${id}`).then(
      (a) => {
        if (!vivant) return;
        setS({ metier: a.metier, autreMetier: a.autreMetier ?? "", ville: a.lieu, codePostal: "", rayonKm: a.rayonKm ?? 40, debut: a.debut, fin: a.fin ?? "", types: a.types, presentation: a.description, equipe: a.equipe, tarifJour: a.tarifJour, tarifUnite: a.tarifUnite ?? "personne", dureeMinJours: a.dureeMinJours, negociable: a.negociable, tarifVisible: a.tarifVisible });
        setCharge(true);
      },
      (e: unknown) => vivant && setRefus(phraseErreur(e)),
    );
    return () => {
      vivant = false;
    };
  }, [id]);
  const maj = <K extends keyof SaisieDisponibilite>(k: K, v: SaisieDisponibilite[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setFautes((f) => f.filter((x) => x.champ !== k));
  };
  const erreur = (champ: string) => fautes.find((f) => f.champ === champ)?.message;
  const propre = (): SaisieDisponibilite => ({ ...s, autreMetier: s.autreMetier?.trim() || null, fin: s.fin || null, tarifUnite: s.tarifJour != null ? s.tarifUnite : null });
  const ETAPE1 = ["metier", "autreMetier", "ville", "codePostal", "rayonKm", "debut", "fin", "types", "presentation", "equipe"];
  function suivant() {
    const f = fautesDisponibilite(propre(), aujourdHui()).filter((x) => ETAPE1.includes(x.champ));
    setFautes(f);
    if (f.length === 0) {
      setEtape(2);
      window.scrollTo({ top: 0 });
    }
  }
  async function publier() {
    const f = fautesDisponibilite(propre(), aujourdHui());
    setFautes(f);
    if (f.length) return;
    setPending(true);
    setRefus(null);
    try {
      const a = await api<AnnonceVue>(id ? `/v1/missions/annonces/${id}` : "/v1/missions/annonces", { method: id ? "PATCH" : "POST", body: { type: "disponibilite", ...propre() } });
      router.replace(`/missions/${a.id}`);
    } catch (e) {
      const fa = fautesDeLApi(e);
      setFautes(fa);
      setRefus(phraseErreur(e));
      if (fa.some((x) => ETAPE1.includes(x.champ))) setEtape(1);
      setPending(false);
    }
  }
  if (!charge) {
    return (
      <>
        <EcranTitre titre="Proposer mes services" retour="/missions" />
        {refus ? <Refus>{refus}</Refus> : <EtatEcran erreur={null} />}
      </>
    );
  }
  return (
    <form className="contents" onSubmit={(e) => e.preventDefault()} noValidate>
      {etape === 1 ? (
        <>
          <EcranTitre titre="Proposer mes services" retour="/missions" />
          <GrandTitre sous="Tu pourras modifier ou masquer l'annonce.">Quand peux-tu intervenir ?</GrandTitre>
          <ChampMetier label="Métier principal" valeur={s.metier} onChange={(v) => maj("metier", v)} erreur={erreur("metier")} />
          <ChampMetier label="Autre métier (facultatif)" valeur={s.autreMetier ?? ""} onChange={(v) => maj("autreMetier", v)} erreur={erreur("autreMetier")} />
          <div className="grid grid-cols-[1fr_7.5rem] gap-3">
            <ChampTexte label="Zone d'intervention, autour de" value={s.ville} onChange={(e) => maj("ville", e.target.value)} placeholder="Lannion" erreur={erreur("ville")} autoComplete="address-level2" />
            <ChampTexte label="Code postal" value={s.codePostal} onChange={(e) => maj("codePostal", e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" placeholder="22300" erreur={erreur("codePostal")} autoComplete="postal-code" />
          </div>
          <ChampChoix label="Rayon" value={String(s.rayonKm)} onChange={(e) => maj("rayonKm", Number(e.target.value))} choix={[10, 20, 30, 40, 60, 80, 100, 150].map((k) => ({ id: String(k), libelle: `${k} km` }))} erreur={erreur("rayonKm")} />
          <div className="grid grid-cols-2 gap-3">
            <ChampTexte label="Disponible à partir du" type="date" value={s.debut} onChange={(e) => maj("debut", e.target.value)} erreur={erreur("debut")} />
            <ChampTexte label="Jusqu'au (facultatif)" type="date" min={s.debut || aujourdHui()} value={s.fin ?? ""} onChange={(e) => maj("fin", e.target.value)} erreur={erreur("fin")} />
          </div>
          <ChoixMultiples label="Type de missions" choix={TYPES_MISSION} valeurs={s.types} onChange={(v) => maj("types", v)} erreur={erreur("types")} />
          <ChampChoix label="Équipe" value={s.equipe ?? ""} onChange={(e) => maj("equipe", e.target.value || null)} choix={EQUIPES} vide="Non précisé" />
          <ChampLong label="Présentation" value={s.presentation} onChange={(e) => maj("presentation", e.target.value)} maxLength={1500} placeholder="Équipe de 2 personnes disponible pour zinguerie et travaux de couverture." erreur={erreur("presentation")} />
          <BoutonJaune onClick={suivant}>Continuer</BoutonJaune>
          <p className="text-center text-[13px] text-muted">Aucun tarif public n&apos;est obligatoire. Vous convenez directement des conditions.</p>
        </>
      ) : (
        <>
          <RetourEtape titre="Disponibilité et tarif" onRetour={() => setEtape(1)} />
          <GrandTitre sous="Tu peux masquer ou modifier ces informations. Le tarif est facultatif.">Donne un repère clair</GrandTitre>
          <ChampTexte label="Tarif journalier indicatif (€ HT / jour)" inputMode="decimal" value={s.tarifJour ?? ""} onChange={(e) => maj("tarifJour", nombre(e.target.value))} placeholder="420" erreur={erreur("tarifJour")} />
          {s.tarifJour != null ? (
            <>
              <ChampChoix label="Ce tarif concerne" value={s.tarifUnite ?? "personne"} onChange={(e) => maj("tarifUnite", e.target.value)} choix={UNITES_TARIF} erreur={erreur("tarifUnite")} />
              <p className="px-1 text-[14px] font-extrabold">{tarifLisible(s.tarifJour, s.tarifUnite)}</p>
              <Coche coche={s.negociable ?? true} onChange={(v) => maj("negociable", v)} titre="Tarif négociable selon la mission" sous="Le montant final reste à convenir directement." />
              <Coche coche={s.tarifVisible ?? true} onChange={(v) => maj("tarifVisible", v)} titre="Montrer ce tarif dans mon annonce" sous="Décoché, toi seul le vois." />
            </>
          ) : null}
          <ChampTexte label="Durée minimale souhaitée (jours, facultatif)" inputMode="numeric" value={s.dureeMinJours ?? ""} onChange={(e) => maj("dureeMinJours", e.target.value.trim() === "" ? null : Math.round(Number(e.target.value)) || null)} placeholder="2" erreur={erreur("dureeMinJours")} />
          <Encart titre="Ce tarif est une indication">Il ne constitue ni un devis ni un engagement. Mobiiz assure uniquement la mise en relation.</Encart>
          <BoutonJaune pending={pending} onClick={() => void publier()}>
            {id ? "Enregistrer ma disponibilité" : "Publier ma disponibilité"}
          </BoutonJaune>
        </>
      )}
      <Refus>{refus}</Refus>
    </form>
  );
}

interface SaisieRep { niveau: string; experienceAns: string; equipe: string; message: string; tarifJour: string; tarifUnite: string; jours: string; deplacement: string; documentIds: string[] }

/** Captures 14, 51 puis 45 : répondre à une mission. L'entreprise choisit ce qu'elle partage ; ses coordonnées restent privées. */
export function RepondreFormulaire({ id }: { id: string }) {
  const fetcher = useCallback((signal: AbortSignal) => Promise.all([api<AnnonceVue>(`/v1/missions/annonces/${id}`, { signal }), api<{ items: FichierVue[] }>("/v1/dossier-pro", { signal })]).then(([annonce, dossier]) => ({ annonce, dossier: dossier.items })), [id]);
  const { data, error, reload } = useResource(fetcher);
  const [s, setS] = useState<SaisieRep>({ niveau: "", experienceAns: "", equipe: "1", message: "", tarifJour: "", tarifUnite: "personne", jours: "", deplacement: "", documentIds: [] });
  const [etape, setEtape] = useState(1);
  const [fautes, setFautes] = useState<Faute[]>([]);
  const [pending, setPending] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState<ReponseVue | null>(null);
  if (envoyee) return <ReponseEnvoyee r={envoyee} />;
  if (!data) {
    return (
      <>
        <EcranTitre titre="Répondre à la mission" retour={`/missions/${id}`} />
        <EtatEcran erreur={error} onReessayer={reload} retour={{ href: "/missions", libelle: "Revenir aux missions" }} />
      </>
    );
  }
  const a = data.annonce;
  const maj = <K extends keyof SaisieRep>(k: K, v: SaisieRep[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setFautes((f) => f.filter((x) => x.champ !== k));
  };
  const erreur = (champ: string) => fautes.find((f) => f.champ === champ)?.message;
  const corps = () => ({ niveau: s.niveau, experienceAns: nombre(s.experienceAns) ?? -1, equipe: nombre(s.equipe) ?? 0, message: s.message, tarifJour: nombre(s.tarifJour), tarifUnite: nombre(s.tarifJour) != null ? s.tarifUnite : null, jours: s.jours.trim() || null, deplacement: s.deplacement || null, documentIds: s.documentIds });
  const ETAPE1 = ["niveau", "experienceAns", "equipe", "documentIds"];
  function suivant() {
    const f = fautesReponse({ ...corps(), message: s.message || "." }).filter((x) => ETAPE1.includes(x.champ));
    setFautes(f);
    if (f.length === 0) {
      setEtape(2);
      window.scrollTo({ top: 0 });
    }
  }
  async function envoyer() {
    const f = fautesReponse(corps());
    setFautes(f);
    if (f.length) {
      if (f.some((x) => ETAPE1.includes(x.champ))) setEtape(1);
      return;
    }
    setPending(true);
    setRefus(null);
    try {
      const r = await api<ReponseVue>(`/v1/missions/annonces/${id}/reponse`, { method: "PUT", body: corps() });
      setEnvoyee({ ...r, annonce: a });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setFautes(fautesDeLApi(e));
      setRefus(phraseErreur(e));
    } finally {
      setPending(false);
    }
  }
  const rappel = (
    <div className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-(--voile-2) p-4">
      <Etiquette>Mission</Etiquette>
      <p className="text-[14px] font-extrabold">
        {a.metier} · {a.lieu} · {periodeLisible(a.debut, a.fin)}
      </p>
    </div>
  );
  return (
    <form className="contents" onSubmit={(e) => e.preventDefault()} noValidate>
      {etape === 1 ? (
        <>
          <EcranTitre titre="Répondre à la mission" retour={`/missions/${id}`} />
          {rappel}
          <GrandTitre sous="L'entreprise verra ces informations, et rien d'autre.">Ton profil pour cette mission</GrandTitre>
          <ChampChoix label="Ton niveau sur cette mission · déclaré par toi" value={s.niveau} onChange={(e) => maj("niveau", e.target.value)} choix={NIVEAUX} vide="Choisir" erreur={erreur("niveau")} />
          <div className="grid grid-cols-2 gap-3">
            <ChampTexte label="Expérience correspondante (années)" inputMode="numeric" value={s.experienceAns} onChange={(e) => maj("experienceAns", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="8" erreur={erreur("experienceAns")} />
            <ChampTexte label="Équipe disponible (personnes)" inputMode="numeric" value={s.equipe} onChange={(e) => maj("equipe", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="2" erreur={erreur("equipe")} />
          </div>
          <fieldset className={`flex flex-col gap-1 p-4 ${CARTE}`}>
            <legend className="float-left pb-1 text-[12px] text-[#6b6557]">Documents à partager pour cette mission (facultatif)</legend>
            {data.dossier.length === 0 ? (
              <p className="text-[14px] text-[#5c5648]">Ton dossier professionnel est vide. Tu peux répondre sans document, ou en ajouter dans Profil, « Documents et qualifications ».</p>
            ) : (
              data.dossier.map((d) => {
                const coche = s.documentIds.includes(d.id);
                return (
                  <label key={d.id} className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={coche} onChange={() => maj("documentIds", coche ? s.documentIds.filter((x) => x !== d.id) : [...s.documentIds, d.id])} className="size-5 accent-[#fed206]" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">{d.titre || d.nom}</span>
                    <span className="shrink-0 text-[12px] text-[#6b6557]">{CATEGORIES_DOCUMENT.find((c) => c.id === d.categorie)?.libelle ?? ""}</span>
                  </label>
                );
              })
            )}
          </fieldset>
          <BoutonJaune onClick={suivant}>Continuer</BoutonJaune>
        </>
      ) : (
        <>
          <RetourEtape titre="Ma proposition" onRetour={() => setEtape(1)} />
          <GrandTitre sous="L'entreprise pourra les discuter avec toi. Le tarif est facultatif.">Conditions pour cette mission</GrandTitre>
          {rappel}
          <div className="grid grid-cols-2 gap-3">
            <ChampTexte label="Tarif proposé (€ HT / jour)" inputMode="decimal" value={s.tarifJour} onChange={(e) => maj("tarifJour", e.target.value)} placeholder="420" erreur={erreur("tarifJour")} />
            <ChampChoix label="Ce tarif concerne" value={s.tarifUnite} onChange={(e) => maj("tarifUnite", e.target.value)} choix={UNITES_TARIF} erreur={erreur("tarifUnite")} />
          </div>
          <ChampTexte label="Jours disponibles" value={s.jours} onChange={(e) => maj("jours", e.target.value)} maxLength={120} placeholder="15 et 16 novembre" erreur={erreur("jours")} />
          <ChampChoix label="Déplacement" value={s.deplacement} onChange={(e) => maj("deplacement", e.target.value)} choix={FRAIS} vide="Non précisé" erreur={erreur("deplacement")} />
          <ChampLong label="Message à l'entreprise" value={s.message} onChange={(e) => maj("message", e.target.value)} maxLength={1500} placeholder="Équipe autonome. Disponibles les 15 et 16 novembre." erreur={erreur("message")} />
          <Encart titre="Aucun contrat n'est créé par Mobiiz.">Conditions finales à confirmer ensemble. Tes coordonnées restent privées jusqu&apos;à votre accord.</Encart>
          <BoutonJaune pending={pending} onClick={() => void envoyer()}>
            Envoyer ma proposition
          </BoutonJaune>
        </>
      )}
      <Refus>{refus}</Refus>
      {etape === 1 ? <LienContour href={`/missions/${id}`}>Revenir à la mission</LienContour> : null}
    </form>
  );
}

