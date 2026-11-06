/**
 * LE COÛT TOTAL LIVRÉ (Greg, 6 novembre 2026, prompt maître points 11 et 12) : pour les MÊMES lignes, l'offre du groupe
 * (prix fermes, livraison comprise) face à la meilleure offre individuelle de l'artisan (prix des lignes + sa livraison).
 * Jamais une économie promise : on dit les deux totaux, et l'écart seulement quand les deux offres chiffrent toutes les
 * lignes. Code pur, sans import interne.
 */
export interface LigneComparee {
  designation: string;
  quantite: number;
  unite: string;
}

export interface OffreIndividuelle {
  nom: string;
  /** Prix unitaire HT par désignation (telle qu'écrite dans la demande). */
  prix: { designation: string; unite: string; prixHt: number }[];
  livraisonHt: number;
}

export interface ComparaisonLivree {
  lignes: number;
  groupe: { totalLivreHt: number; complet: boolean };
  individuelle: { nom: string; totalLivreHt: number; complet: boolean } | null;
  /** Groupe moins individuel (négatif : le groupe coûte moins) ; null si l'une des deux offres est incomplète. */
  ecartHt: number | null;
  phrase: string;
}

const norme = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[×x*]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
const uniteNorme = (u: string) => (norme(u) === "ml" ? "m" : norme(u));
const arrondi2 = (n: number) => Math.round(n * 100) / 100;
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[\u202f\u00a0]/g, " ")} €`;

/** Le total d'une offre individuelle pour ces lignes (prix × quantité du groupe, plus SA livraison entière). */
export function totalIndividuel(lignes: readonly LigneComparee[], o: OffreIndividuelle): { totalLivreHt: number; complet: boolean } {
  let total = 0;
  let complet = true;
  for (const l of lignes) {
    const p = o.prix.find((x) => norme(x.designation) === norme(l.designation) && uniteNorme(x.unite) === uniteNorme(l.unite));
    if (!p) complet = false;
    else total += p.prixHt * l.quantite;
  }
  return { totalLivreHt: arrondi2(total + o.livraisonHt), complet };
}

export function comparerCoutLivre(lignes: readonly LigneComparee[], groupe: { totalLivreHt: number; complet: boolean }, offres: readonly OffreIndividuelle[]): ComparaisonLivree {
  const candidates = offres.map((o) => ({ nom: o.nom, ...totalIndividuel(lignes, o) })).filter((o) => o.totalLivreHt > 0);
  // La meilleure : complète d'abord, puis la moins chère.
  candidates.sort((a, b) => Number(b.complet) - Number(a.complet) || a.totalLivreHt - b.totalLivreHt);
  const individuelle = candidates[0] ?? null;
  const ecartHt = individuelle && individuelle.complet && groupe.complet ? arrondi2(groupe.totalLivreHt - individuelle.totalLivreHt) : null;
  const n = lignes.length;
  const pour = `Pour ${n === 1 ? "cette ligne" : `ces ${n} lignes`}, livré`;
  let phrase: string;
  if (!individuelle) phrase = `${pour} : achat groupé ${euros(groupe.totalLivreHt)} HT${groupe.complet ? "" : " (offre incomplète)"}. Aucune offre individuelle chiffrée à comparer.`;
  else {
    phrase = `${pour} : achat groupé ${euros(groupe.totalLivreHt)} HT${groupe.complet ? "" : " (offre incomplète)"} ; ta meilleure offre individuelle (${individuelle.nom}) ${euros(individuelle.totalLivreHt)} HT${individuelle.complet ? "" : " (incomplète)"}.`;
    if (ecartHt !== null) phrase += ecartHt === 0 ? " Même total." : ` Écart : ${euros(Math.abs(ecartHt))} HT ${ecartHt < 0 ? "de moins en groupe" : "de plus en groupe"}.`;
    else phrase += " Écart non calculé : une offre ne chiffre pas toutes les lignes.";
  }
  return { lignes: n, groupe, individuelle, ecartHt, phrase };
}

/* ---------------------------------------------------------------------------------- la reconfirmation avant clôture */

/** La reconfirmation se demande dans les 48 h avant la clôture, à qui s'est engagé plus de 3 jours avant celle-ci. */
export const RECONFIRMATION_FENETRE_H = 48;
export const RECONFIRMATION_ANCIENNETE_J = 3;

export function reconfirmationDue(p: { engageLe: Date | null; clotureLe: Date; demandeeLe: Date | null }, maintenant: Date): boolean {
  if (p.demandeeLe || !p.engageLe) return false;
  const debut = p.clotureLe.getTime() - RECONFIRMATION_FENETRE_H * 3_600_000;
  const ancien = p.engageLe.getTime() <= p.clotureLe.getTime() - RECONFIRMATION_ANCIENNETE_J * 86_400_000;
  return ancien && maintenant.getTime() >= debut && maintenant.getTime() < p.clotureLe.getTime();
}

export const PHRASE_RECONFIRMATION = "Avant la clôture, reconfirme que ce besoin est toujours réel : sans ta reconfirmation, ta liste ne part pas aux négoces et ta demande reste individuelle.";
export const PHRASE_NON_RECONFIRMEE = "Ta participation n'a pas été reconfirmée avant la clôture : ta liste n'est pas partie aux négoces. Ta demande reste individuelle ; ce n'est pas compté comme une sortie.";
