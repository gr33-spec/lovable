/**
 * LES HYPOTHÈSES DE LANCEMENT (Greg, 25 octobre 2026) : trois chiffres décident du lancement, par zone et par mois.
 * 1. Les négoces répondent-ils ? (taux de réponse perso et groupe, délai moyen)
 * 2. Les demandes finissent-elles en commande ?
 * 3. Les artisans passent-ils du gratuit au payant, et restent-ils ? (plus les regroupements formés, consultés,
 *    commandés, et l'écart entre le prix groupe et le dernier prix perso des participants)
 * Du calcul pur : l'API compte dans la base, ce fichier fait les rapports, sans jamais diviser par zéro.
 */

export interface ComptesDuMois {
  zone: string;
  mois: string;
  envoisPerso: number;
  reponsesPerso: number;
  /** Délais de réponse des négoces en heures (perso). */
  delaisPersoHeures: readonly number[];
  consultationsGroupe: number;
  reponsesGroupe: number;
  delaisGroupeHeures: readonly number[];
  demandes: number;
  demandesCommandees: number;
  artisansGratuits: number;
  passagesPayant: number;
  resiliations: number;
  abonnesDebutDeMois: number;
  regroupementsFormes: number;
  regroupementsConsultes: number;
  regroupementsCommandes: number;
  /** Pour chaque participant commandé : (prix groupe − dernier prix perso) / dernier prix perso. */
  ecartsPrixGroupe: readonly number[];
}

export interface IndicateursDuMois {
  zone: string;
  mois: string;
  tauxReponsePerso: number | null;
  tauxReponseGroupe: number | null;
  delaiMoyenPersoHeures: number | null;
  delaiMoyenGroupeHeures: number | null;
  tauxCommande: number | null;
  tauxPassagePayant: number | null;
  tauxResiliation: number | null;
  regroupements: { formes: number; consultes: number; commandes: number };
  ecartMoyenPrixGroupe: number | null;
}

const taux = (n: number, sur: number) => (sur > 0 ? Math.round((n / sur) * 1000) / 1000 : null);
const moyenne = (v: readonly number[]) => (v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null);

export function indicateursDuMois(c: ComptesDuMois): IndicateursDuMois {
  return {
    zone: c.zone,
    mois: c.mois,
    tauxReponsePerso: taux(c.reponsesPerso, c.envoisPerso),
    tauxReponseGroupe: taux(c.reponsesGroupe, c.consultationsGroupe),
    delaiMoyenPersoHeures: moyenne(c.delaisPersoHeures),
    delaiMoyenGroupeHeures: moyenne(c.delaisGroupeHeures),
    tauxCommande: taux(c.demandesCommandees, c.demandes),
    tauxPassagePayant: taux(c.passagesPayant, c.artisansGratuits),
    tauxResiliation: taux(c.resiliations, c.abonnesDebutDeMois),
    regroupements: { formes: c.regroupementsFormes, consultes: c.regroupementsConsultes, commandes: c.regroupementsCommandes },
    ecartMoyenPrixGroupe: c.ecartsPrixGroupe.length ? Math.round((c.ecartsPrixGroupe.reduce((a, b) => a + b, 0) / c.ecartsPrixGroupe.length) * 1000) / 1000 : null,
  };
}

/** « 62 % » ; « – » sans donnée. */
export const enPourcent = (t: number | null) => (t === null ? "–" : `${Math.round(t * 100)} %`);

/** Le coût IA d'un compte gratuit dépasse-t-il l'alerte (3 $ par mois par défaut) ? */
export const ALERTE_COUT_IA_GRATUIT_USD = 3;
export const coutIaTropHaut = (coutUsd: number, seuil = ALERTE_COUT_IA_GRATUIT_USD) => coutUsd > seuil;

/** « Vos résultats » du négoce : ce que Mobiiz lui rapporte. */
export interface ResultatsNegoce {
  demandesRecues: number;
  reponses: number;
  tauxReponse: number | null;
  commandesGagnees: number;
  caHt: number;
}
export function resultatsNegoce(c: { demandesRecues: number; reponses: number; commandesGagnees: number; caHt: number }): ResultatsNegoce {
  return { ...c, tauxReponse: taux(c.reponses, c.demandesRecues), caHt: Math.round(c.caHt * 100) / 100 };
}
