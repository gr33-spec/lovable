import type { LectureDevis, LectureFourniture, LectureLigne } from "../../src/index.js";
import { DEVIS_7954 } from "../devis-reels/devis-7954.js";

/**
 * La lecture du devis 7954 écrite d'après le §6 du référentiel électricité (résultat attendu validé par le fondateur
 * le 11 octobre 2026), pour éprouver le contrôle du temps un et le parcours. ELLE NE REMPLACE PAS LE MODÈLE : la vraie
 * lecture d'Opus (`apps/api/scripts/lecture-reelle.ts`) passe le même contrôle avant toute fusion.
 */
const SANS = /^(DEPOSE DE L'INSTALLATION|POSE D'UNE PRISE DE CHANTIER|PLAN ELECTRIQUE|PERCEMENT|MESURE DE LA VALEUR|DEMANDE DE CONSUEL|FORMATION UTILISATEUR|INSTALLATION ET MISE EN SERVICE DU COFFRET|POSE, MISE EN SERVICE ET PERCEMENT)/;
const BLOC_PAGE_12 = new Set(DEVIS_7954.filter((l) => l.section.endsWith("APPAREILLAGE HAGER ESSENSYA › CHAMBRE 1") || l.section.endsWith("APPAREILLAGE HAGER ESSENSYA › DEGAGEMENT")).map((l) => l.ref));

function attend(l: (typeof DEVIS_7954)[number]): string[] {
  const out: string[] = [];
  if (/^(LAMP|VA ET VIENT|TELERUPTEUR|PRISE (DE COURANT|RJ45|TV|FOUR|PLAQUE|LAVE|REFRIG|MACHINE|SECHE))/.test(l.designation)) out.push("teinte_appareillage");
  if (l.designation.startsWith("TABLEAU GENERAL ELECTRIQUE")) out.push("composition_tableaux");
  if (/^GAINE 0\/(80|125)/.test(l.designation)) out.push("longueurs_gaine_vmc");
  if (/^(Distribution eau froide|TUBE PER)/.test(l.designation)) out.push("repartition_per");
  if (l.designation === "PAROI A DEFINIR") out.push("modele_paroi_douche");
  if (l.designation === "ALIMENTATION RADIATEUR") out.push("usage_alimentations_radiateur");
  if (BLOC_PAGE_12.has(l.ref)) out.push("logement_bloc_page_12");
  return out;
}

/** Temps trois : le point de la ligne (référentiel électricité §3), tel que le modèle le nomme dans « ouvrage ». */
const POINTS: [RegExp, string][] = [
  [/^LAMP(L)?E SIMPLE/, "point-lumineux"],
  [/^VA ET VIENT 1/, "va-et-vient-1"],
  [/^VA ET VIENT 2/, "va-et-vient-2"],
  [/^TELERUPTEUR/, "telerupteur"],
  [/^PRISE (DE COURANT 16A|REFRIGERATEUR)/, "prise-16a"],
  [/^PRISE (FOUR|PLAQUE)/, "prise-cuisson"],
  [/^(PRISE (LAVE-VAISSELLE|MACHINE A LAVER|SECHE-LINGE)|ALIMENTATION CHAUFFE-EAU)/, "prise-20a"],
  [/^ALIMENTATION HOTTE/, "prise-hotte"],
  [/^ALIMENTATION RADIATEUR/, "alim-radiateur"],
  [/^PRISE RJ45/, "prise-rj45"],
  [/^PRISE TV/, "prise-tv"],
];
const pointDe = (designation: string) => POINTS.find(([re]) => re.test(designation))?.[1] ?? null;

export function lectureAttendue7954(): LectureDevis {
  const lignes: LectureLigne[] = DEVIS_7954.map((l) => {
    const sans = SANS.test(l.designation) || l.designation === "CHAPEAU PREVU PAR LE COUVREUR";
    const fourniture: LectureFourniture = { nom: l.designation, quantite: l.quantity, unite: l.unit === "ML" ? "ml" : "u", ouvrage: pointDe(l.designation), emplacement: null, donnees: {}, attend: attend(l), aPreciser: [], precision: null };
    return { ref: l.ref, designation: l.designation, quantite: l.quantity, unite: l.unit, role: sans ? (l.designation.startsWith("CHAPEAU") ? "hors_quantitatif" : "pose") : "fourniture", fournitures: sans ? [] : [fourniture] };
  });
  const refs = (re: RegExp) => DEVIS_7954.filter((l) => re.test(l.section)).map((l) => l.ref);
  return {
    metier: "electrical",
    lots: [
      { metier: "electrical", libelle: "Électricité", lignes: refs(/^DEVIS ELECTRICITE/) },
      { metier: "hvac", libelle: "Chauffage électrique et VMC", lignes: refs(/^(DEVIS RADIATEURS|VMC)/) },
      { metier: "plumbing", libelle: "Plomberie et sanitaire", lignes: refs(/^TRAVAUX SANITAIRE/) },
    ],
    fiche: {
      donnees: [
        { cle: "ouvrage", libelle: "Ouvrage", valeur: "transformation d'un hôtel-restaurant en 10 logements", origine: "devis", preuve: "objet du devis et numéros de logement N°1 à N°10" },
        { cle: "ville", libelle: "Ville", valeur: "Paimpol", origine: "devis", preuve: "adresse des travaux" },
        { cle: "alimentation", libelle: "Alimentation", valeur: "monophasée 220 V, NF C 15-100", origine: "devis", preuve: "en-tête du devis électricité" },
        { cle: "appareillage", libelle: "Appareillage", valeur: "Hager Essensya", origine: "devis", preuve: "titre « APPAREILLAGE HAGER ESSENSYA »" },
        { cle: "teinte_appareillage", libelle: "Teinte de l'appareillage", valeur: null, origine: "manquante", question: "Essensya en blanc ou en noir ?" },
        { cle: "tableaux", libelle: "Tableaux", valeur: "un tableau Hager par logement, composition déduite des points du logement", origine: "deduite", regle: "§4 du référentiel électricité", preuve: null },
        { cle: "longueurs_gaine_vmc", libelle: "Gaine VMC Ø80 et Ø125", valeur: null, origine: "manquante", question: "Combien de mètres de gaine Ø80 et Ø125 par logement ?" },
        { cle: "repartition_per", libelle: "PER en dalle", valeur: null, origine: "manquante", question: "Les 890 m de PER : combien en 10×12 et en 13×16 ?" },
        { cle: "modele_paroi_douche", libelle: "Parois de douche", valeur: null, origine: "manquante", question: "Quel modèle pour les parois de douche « à définir » ?" },
        { cle: "usage_alimentations_radiateur", libelle: "Alimentations radiateur", valeur: null, origine: "manquante", question: "59 alimentations pour 49 appareils : à quoi servent les 10 en plus ?" },
        { cle: "logement_bloc_page_12", libelle: "Bloc chambre et dégagement (page 12)", valeur: null, origine: "manquante", question: "À quel logement rattacher la chambre et le dégagement de la page 12 ?" },
      ],
    },
    bref: [
      "Transformation d'un hôtel-restaurant en 10 logements à Paimpol",
      "Électricité complète monophasée, appareillage Hager Essensya",
      "Un tableau Hager et un coffret de communication par logement",
      "Chauffage électrique Atoll et sèche-serviettes",
      "VMC hygro B Aldes par logement",
      "Plomberie avec 10 WC suspendus, 10 meubles vasque, 10 douches, 10 chauffe-eau",
      "PER en dalle, évacuation PVC 100",
    ],
    questions: [
      { cle: "teinte_appareillage", texte: "Essensya en blanc ou en noir ?", boutons: [{ label: "Blanc", valeur: "blanc" }, { label: "Noir", valeur: "noir" }], unite: null, donnee: "teinte de l'appareillage", ligne: null },
      { cle: "composition_tableaux", texte: "Composition des tableaux déduite des points de chaque logement (disjoncteurs, différentiels 30 mA, contacteur J/N, peignes) : c'est bon ?", boutons: [{ label: "C'est bon", valeur: "oui" }, { label: "Modifier", valeur: "modifier" }], unite: null, donnee: "composition des tableaux", ligne: null },
      { cle: "longueurs_gaine_vmc", texte: "Combien de mètres de gaine Ø80 et de gaine Ø125 par logement ?", boutons: [], unite: "m", donnee: "longueurs de gaine VMC", ligne: null },
      { cle: "repartition_per", texte: "Les 890 m de PER : combien en 10×12 et combien en 13×16 ?", boutons: [], unite: "m", donnee: "répartition du PER", ligne: null },
      { cle: "modele_paroi_douche", texte: "Quel modèle pour les parois de douche « à définir » ?", boutons: [], unite: null, donnee: "modèle des parois de douche", ligne: null },
      { cle: "usage_alimentations_radiateur", texte: "59 alimentations radiateur pour 49 appareils : à quoi servent les 10 en plus ?", boutons: [], unite: null, donnee: "usage des 10 alimentations en plus", ligne: null },
      { cle: "logement_bloc_page_12", texte: "La chambre et le dégagement de la page 12 : à quel logement les rattacher ?", boutons: [], unite: null, donnee: "logement du bloc de la page 12", ligne: null },
    ],
    lignes,
    contexte: { ville: "Paimpol" },
    notes: [],
  };
}
