import { DELAI_REPONSE_JOURS } from "./demande.js";

/**
 * LES NOTIFICATIONS DE L'ARTISAN (parcours groupé, étape 8 ; section 3 du document), en code pur : quatre messages par
 * lot, push iPhone + e-mail, courts, sans jamais nommer les autres artisans, aucun rappel ; plus l'avertissement après un
 * désistement (décision du fondateur, 2026-10-20). Les textes suivent le tableau de la section 3 mot pour mot.
 */
export interface MessageArtisan {
  titre: string;
  corps: string;
  /** Où le tap mène dans l'application. */
  url: string;
  /** Même étiquette = une seule notification. */
  etiquette: string;
}

/** Le nom du département pour « le groupé Côtes-d'Armor » (zone = numéro du département). */
export const NOMS_DEPARTEMENTS: Readonly<Record<string, string>> = {
  "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes", "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège",
  "10": "Aube", "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal", "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze",
  "2A": "Corse-du-Sud", "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne", "25": "Doubs", "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère",
  "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde", "34": "Hérault", "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura",
  "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique", "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire",
  "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle", "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord",
  "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques", "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône",
  "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie", "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres",
  "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse", "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne",
  "90": "Territoire de Belfort", "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise",
  "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte",
};

export const nomDuDepartement = (zone: string): string => NOMS_DEPARTEMENTS[zone] ?? `département ${zone}`;

const nombre = (q: string) => Number(q).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const jourCourt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).replace(/\.$/, "");

/**
 * 1. « Vos 31 bacs sont dans le groupé Côtes-d'Armor. Prochain lot lundi. » (section 3). Revue à froid du 21 octobre : l'app
 * tutoie partout, et « 1 250 pièces » sans dire de quoi ne se comprend pas ; le message dit donc « Tes 1 250 pièces de
 * tuile romane… ».
 */
export const quantiteDite = (q: { quantite: string; unite: string; designation: string }): string => `${nombre(q.quantite)} ${q.unite} de ${q.designation.charAt(0).toLowerCase()}${q.designation.slice(1)}`;
export function messageBesoinAccepte(b: { quantite: string; unite: string; designation: string; zone: string; projectId: string }): MessageArtisan {
  return { titre: "Groupé", corps: `Tes ${quantiteDite(b)} sont dans le groupé ${nomDuDepartement(b.zone)}. Prochain lot lundi.`, url: "/groupe", etiquette: `groupe-besoin-${b.projectId}` };
}

/** 2. « Le groupé est parti chez 4 négoces. Réponses attendues sous 7 jours. » */
export function messageDemandeEnvoyee(lot: { numero: number; negoces: number }): MessageArtisan {
  return { titre: "Groupé", corps: `Le groupé est parti chez ${lot.negoces} négoce${lot.negoces > 1 ? "s" : ""}. Réponses attendues sous ${DELAI_REPONSE_JOURS} jours.`, url: "/groupe", etiquette: `groupe-lot-${lot.numero}` };
}

/** 3. « Vos 31 bacs : X € chez A (−Y %). Bon de commande transmis, livraison le 3 nov. » (−Y % seulement avec un prix de référence). */
export function messageNegoceRetenu(o: { quantite: string; unite: string; designation: string; prixUnitaire: number; prixReference: number | null; negoce: string; dateLivraison: Date | null; numero: number }): MessageArtisan {
  const baisse = o.prixReference && o.prixReference > 0 ? Math.round(((o.prixReference - o.prixUnitaire) / o.prixReference) * 100) : null;
  const pct = baisse !== null && baisse > 0 ? ` (−${baisse} %)` : "";
  const livraison = o.dateLivraison ? `, livraison le ${jourCourt(o.dateLivraison)}` : "";
  return { titre: "Groupé : négoce retenu", corps: `Tes ${quantiteDite(o)} : ${euros(o.prixUnitaire)} chez ${o.negoce}${pct}. Bon de commande transmis${livraison}.`, url: "/groupe", etiquette: `groupe-lot-${o.numero}` };
}

/** 4. « Livraison aujourd'hui. Tout est arrivé ? » */
export function messageLivraisonDuJour(lot: { numero: number }): MessageArtisan {
  return { titre: "Groupé : livraison", corps: "Livraison aujourd'hui. Tout est arrivé ?", url: "/groupe", etiquette: `groupe-livraison-${lot.numero}` };
}

/** Décision du fondateur (2026-10-20) : l'avertissement après un désistement, par e-mail. */
export function messageDesistement(d: { sanction: "avertissement" | "exclusion"; excluJusquau: Date | null }): { objet: string; texte: string } {
  if (d.sanction === "avertissement") {
    return {
      objet: "Groupé : désistement enregistré, avertissement",
      texte: "Bonjour,\n\nTu t'étais engagé à commander ces quantités au prix groupé et tu ne donnes pas suite : c'est un avertissement, sans frais. Un deuxième désistement dans les 12 mois fermerait le groupé 6 mois (tu garderais BatiClair). Le négoce est prévenu et peut annuler ta ligne.\n\nBatiClair",
    };
  }
  const jusquau = d.excluJusquau ? d.excluJusquau.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  return {
    objet: "Groupé : deuxième désistement, groupé fermé 6 mois",
    texte: `Bonjour,\n\nDeuxième désistement en 12 mois : le groupé se ferme pour toi jusqu'au ${jusquau}. Tu gardes BatiClair et tes chantiers. Le négoce est prévenu et peut annuler ta ligne.\n\nBatiClair`,
  };
}

/** L'adresse de réponse d'un lot (`lot-<numéro>@reponses.<domaine>`) et sa lecture dans un e-mail entrant. */
export const adresseDeReponse = (numero: number, domaine: string) => `lot-${numero}@${domaine}`;
export function numeroDuLotDansAdresse(adresses: readonly string[], domaine: string): number | null {
  for (const a of adresses) {
    const m = /(?:^|<)lot-(\d+)@([^>\s]+)>?$/i.exec(a.trim());
    if (m && m[2]!.toLowerCase() === domaine.toLowerCase()) return Number(m[1]);
  }
  return null;
}
