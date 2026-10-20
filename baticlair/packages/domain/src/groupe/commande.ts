import { TAUX_COMMISSION_POURCENT } from "./demande.js";
import type { FenetreLivraison } from "./groupe.js";

/**
 * BONS DE COMMANDE, FACTURE, LIVRAISON, DÉSISTEMENT (parcours groupé, étape 7 ; sections 2 étape 8, 4 c et 6), en code
 * pur : le bon de commande de chaque artisan (nom, numéro de compte ou « ouverture de compte demandée », adresse du
 * chantier, quantités, fenêtre, « tarif groupé lot n° … »), le récapitulatif des livraisons du négoce, la facture de
 * commission (2 % × total HT des bons du lot, à 30 jours, relance automatique), la relance de livraison à J+15, et la
 * sanction d'un désistement (1er sur 12 mois : avertissement ; 2e : exclusion 6 mois).
 */
const JOUR = 24 * 3600 * 1000;
export const ECHEANCE_FACTURE_JOURS = 30;
export const RELANCE_LIVRAISON_JOURS = 15;
export const EXCLUSION_MOIS = 6;
export const FENETRE_DESISTEMENTS_MOIS = 12;

/** L'émetteur de la facture : BatiClair. Les mentions légales (SIRET, TVA, adresse) sont À COMPLÉTER PAR LE FONDATEUR avant la première vraie facture. */
export const EMETTEUR_FACTURE = { nom: "BatiClair", mentions: "SIRET, numéro de TVA et adresse : à compléter par le fondateur avant la première facture réelle." };

export interface LigneDeBon {
  designation: string;
  quantite: string;
  unite: string;
  /** Prix unitaire HT groupé. */
  prixUnitaire: number;
}

export interface BonDeCommande {
  numeroLot: number;
  artisan: { nom: string; siret: string | null; telephone: string | null; email: string | null };
  numeroCompte: string | null;
  adresseChantier: string;
  lignes: readonly LigneDeBon[];
  fenetre: FenetreLivraison;
  dateLivraison: Date | null;
  negoce: string;
}

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const nombre = (s: string) => Number(s).toLocaleString("fr-FR", { maximumFractionDigits: 3 });

/** Le total HT d'un bon : Σ quantité × prix unitaire, arrondi au centime. */
export function totalDuBon(lignes: readonly LigneDeBon[]): number {
  return Math.round(lignes.reduce((s, l) => s + Number(l.quantite) * l.prixUnitaire, 0) * 100) / 100;
}

/** Le document du bon (section 2, étape 8) : ce que le négoce reçoit pour un artisan ; c'est ici qu'il voit son nom. */
export function documentBonDeCommande(bon: BonDeCommande): { titre: string; blocs: { titre?: string; lignes: (string | string[])[] }[] } {
  const compte = bon.numeroCompte ? `Numéro de compte chez ${bon.negoce} : ${bon.numeroCompte}` : `Ouverture de compte demandée chez ${bon.negoce}`;
  return {
    titre: `Bon de commande, tarif groupé lot n° ${bon.numeroLot}`,
    blocs: [
      {
        titre: "Client",
        lignes: [bon.artisan.nom, ...(bon.artisan.siret ? [`SIRET ${bon.artisan.siret}`] : []), compte, ...(bon.artisan.telephone ? [`Téléphone : ${bon.artisan.telephone}`] : []), ...(bon.artisan.email ? [`E-mail : ${bon.artisan.email}`] : [])],
      },
      {
        titre: "Livraison",
        lignes: [`Adresse du chantier : ${bon.adresseChantier}`, `Fenêtre : du ${jour(bon.fenetre.tot)} au ${jour(bon.fenetre.tard)}`, ...(bon.dateLivraison ? [`Date prévue : ${jour(bon.dateLivraison)}`] : [])],
      },
      {
        titre: "Fournitures",
        lignes: [["Désignation", "Quantité", "P.U. HT", "Total HT"], ...bon.lignes.map((l) => [l.designation, `${nombre(l.quantite)} ${l.unite}`, euros(l.prixUnitaire), euros(Math.round(Number(l.quantite) * l.prixUnitaire * 100) / 100)]), `Total HT : ${euros(totalDuBon(bon.lignes))}`],
      },
      { lignes: [`Tarif groupé lot n° ${bon.numeroLot} : le prix ci-dessus est celui de votre offre retenue pour le lot. Facturation et paiement comme d'habitude, sur le compte du client.`] },
    ],
  };
}

/** Le récapitulatif joint au négoce : toutes ses livraisons du lot. */
export function documentRecapitulatif(numeroLot: number, negoce: string, bons: readonly BonDeCommande[]): { titre: string; blocs: { titre?: string; lignes: (string | string[])[] }[] } {
  return {
    titre: `Récapitulatif des livraisons, tarif groupé lot n° ${numeroLot} (${negoce})`,
    blocs: [
      { lignes: [["Client", "Adresse du chantier", "Quantités", "Fenêtre", "Total HT"], ...bons.map((b) => [b.artisan.nom, b.adresseChantier, b.lignes.map((l) => `${nombre(l.quantite)} ${l.unite} ${l.designation}`).join(" ; "), `du ${jour(b.fenetre.tot)} au ${jour(b.fenetre.tard)}`, euros(totalDuBon(b.lignes))])] },
      { lignes: [`${bons.length} bon${bons.length > 1 ? "s" : ""} de commande, total HT du lot : ${euros(bons.reduce((s, b) => s + totalDuBon(b.lignes), 0))}.`] },
    ],
  };
}

/** Section 6 : 2 % × total HT des bons de commande du lot, à 30 jours. */
export function factureDeCommission(totalLotHt: number, emiseLe: Date, taux = TAUX_COMMISSION_POURCENT): { montantHt: number; echeanceLe: Date } {
  return { montantHt: Math.round(totalLotHt * taux) / 100, echeanceLe: new Date(emiseLe.getTime() + ECHEANCE_FACTURE_JOURS * JOUR) };
}

export function documentFacture(f: { numero: number; numeroLot: number; negoce: { nom: string; email: string }; totalLotHt: number; montantHt: number; emiseLe: Date; echeanceLe: Date; versionContrat: string }): { titre: string; blocs: { titre?: string; lignes: (string | string[])[] }[] } {
  return {
    titre: `Facture n° ${f.numero}, commission d'apporteur d'affaires, lot n° ${f.numeroLot}`,
    blocs: [
      { titre: "Émetteur", lignes: [EMETTEUR_FACTURE.nom, EMETTEUR_FACTURE.mentions] },
      { titre: "Client", lignes: [f.negoce.nom, f.negoce.email] },
      {
        titre: "Détail",
        lignes: [
          ["Objet", "Base HT", "Taux", "Montant HT"],
          [`Commission d'apporteur d'affaires, lot n° ${f.numeroLot} (accord du ${f.versionContrat})`, euros(f.totalLotHt), `${TAUX_COMMISSION_POURCENT} %`, euros(f.montantHt)],
          `Total HT : ${euros(f.montantHt)} (TVA : à préciser par le fondateur selon le régime de BatiClair)`,
        ],
      },
      { lignes: [`Émise le ${jour(f.emiseLe)}, payable à ${ECHEANCE_FACTURE_JOURS} jours, soit le ${jour(f.echeanceLe)}. Une relance automatique est envoyée après l'échéance.`] },
    ],
  };
}

/** Une facture envoyée, non payée, échue : à relancer une fois. */
export function factureARelancer(f: { statut: string; echeanceLe: Date; relanceeLe: Date | null; payeeLe: Date | null }, maintenant: Date): boolean {
  return f.statut === "envoyee" && !f.payeeLe && !f.relanceeLe && maintenant.getTime() > f.echeanceLe.getTime();
}

/** Section 2, étape 8 : « relance à J+15 » après la date prévue, tant que l'artisan n'a rien dit. */
export function livraisonARelancer(l: { statut: string; datePrevue: Date | null; relanceLe: Date | null }, maintenant: Date): boolean {
  return l.statut === "prevue" && !l.relanceLe && !!l.datePrevue && maintenant.getTime() >= l.datePrevue.getTime() + RELANCE_LIVRAISON_JOURS * JOUR;
}

/** Section 4 c : premier désistement sur 12 mois = avertissement ; deuxième = exclusion 6 mois (il garde BatiClair). */
export function sanctionDesistement(precedents: readonly Date[], maintenant: Date): { sanction: "avertissement" | "exclusion"; excluJusquau: Date | null } {
  const depuis = new Date(maintenant);
  depuis.setUTCMonth(depuis.getUTCMonth() - FENETRE_DESISTEMENTS_MOIS);
  const recents = precedents.filter((d) => d.getTime() >= depuis.getTime());
  if (recents.length === 0) return { sanction: "avertissement", excluJusquau: null };
  const jusquau = new Date(maintenant);
  jusquau.setUTCMonth(jusquau.getUTCMonth() + EXCLUSION_MOIS);
  return { sanction: "exclusion", excluJusquau: jusquau };
}

/** L'exclusion court-elle encore ? */
export function excluDuGroupe(exclusions: readonly (Date | null)[], maintenant: Date): boolean {
  return exclusions.some((d) => d !== null && d.getTime() > maintenant.getTime());
}
