"use client";

import { useCallback } from "react";
import { api, ApiError } from "./api";
import { useResource } from "./use-resource";

/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026, V5.2 validée) : les contrats de `/v1/ag`. Le réglage ACHATS_GROUPES_V1 coupé,
 * `/v1/ag/etat` répond 404 : l'ancien écran reste affiché, rien ne change.
 */
export interface OptionV1 {
  valeur: string;
  libelle: string;
}
export interface UniteV1 {
  code: string;
  singulier: string;
  pluriel: string;
}
export interface ProduitV1 {
  type: string;
  libelle: string;
  lot: string;
  unite: UniteV1;
  conditionnements: { unite: UniteV1; parDefaut: number | null }[];
  caracteristiques: { attribut: string; libelle: string; options: OptionV1[] }[];
}
export interface EtatV1 {
  actif: true;
  zone: { code: string; nom: string } | null;
  verification: { entreprise: string; siret: string | null; siretVerifie: boolean; siretVerifieLe: string | null; email: string | null; emailVerifie: boolean; habilitation: string | null; complete: boolean };
  habilitations: { id: string; libelle: string }[];
  raisons: { id: string; libelle: string }[];
  motifs: { id: string; libelle: string; geste: "modifier" | "retirer" }[];
  produits: ProduitV1[];
}
export interface VolumesV1 {
  principale: string;
  sous: string | null;
  indicatif: string | null;
}
export interface AchatV1 {
  id: string;
  numero: number;
  nom: string;
  type: string;
  attributs: Record<string, string>;
  lot: string;
  zone: { code: string; nom: string };
  reception: "livraison" | "retrait";
  dateBesoin: string;
  ouvertJusquau: string;
  statut: string;
  conditionnement: { unite: string; parUnite: number; libelle: string } | null;
  volumes: VolumesV1;
}
export interface OffreVueV1 {
  fournisseur: string | null;
  prixUnitaireHt: number | null;
  livraisonHt: number | null;
  tvaPct: number;
  delai: string | null;
  lieu: string | null;
  paiement: string | null;
  validite: string | null;
  annulation: string | null;
  complete: boolean;
  manques: string[];
  calcul: { produits: number; ht: number; tva: number; ttc: number; lignes: string[] } | null;
  acceptable: false;
}
export interface BesoinV1 {
  id: string;
  nom: string;
  lot: string;
  statut: { code: string; libelle: string };
  etat: "indicatif" | "confirme" | "reconfirme" | "retire";
  quantite: { valeur: number; saisie: number; unite: string; parUnite: number | null; lisible: string; reference: UniteV1 };
  reception: "livraison" | "retrait";
  lieu: string;
  contraintes: string | null;
  dateBesoin: string;
  achat: AchatV1;
  reconfirmerAvant: string | null;
  offreAvant: string | null;
  actions: { modifier: boolean; retirer: boolean; reconfirmer: boolean; confirmer: boolean };
  avertissements: { modification: string; retrait: string } | null;
  offre: OffreVueV1 | null;
  retrait: { le: string; motif: string; precision: string | null } | null;
  historique: { type: string; le: string; transmis: boolean }[];
}
export interface CompatibiliteV1 {
  produit: { cle: string; nom: string };
  zone: { code: string; nom: string };
  compatible: AchatV1 | null;
  ouverture: { possible: true; ouvertJusquau: string } | { possible: false; message: string };
  phraseIdentique: string;
}
export interface LigneQuantitatifV1 {
  key: string;
  designation: string;
  quantiteListe: number | null;
  unite: string;
  lot: string;
  lotLu: string;
  produit: { type: string; nom: string; cle: string | null; attributs: Record<string, string>; manquantes: { attribut: string; libelle: string }[] } | null;
  quantite: { valeur: number; unite: string; conditionnement: { unite: string; parDefaut: number | null } | null } | null;
  mention: "recommande" | "compatible" | "a_preciser" | "demande_individuelle" | "deja_groupe" | "commandee" | "non_ouvert";
  texte: string;
  pourquoi: string;
  selectionnable: boolean;
}

/**
 * RÈGLE CHANGÉE (Greg, 13 novembre 2026) : la zinguerie est un lot à part, plus un sous-lot de la couverture (même règle
 * que le serveur). `dans` reste possible pour ranger un lot SOUS un autre ; aucun ne l'utilise à ce jour.
 */
export const LOTS_V1: { id: string; libelle: string; dans?: string }[] = [
  { id: "couverture", libelle: "Couverture" },
  { id: "zinguerie", libelle: "Zinguerie" },
  { id: "isolation", libelle: "Isolation" },
  { id: "bois", libelle: "Bois" },
  { id: "electricite", libelle: "Électricité" },
  { id: "plomberie", libelle: "Plomberie" },
  { id: "maconnerie", libelle: "Maçonnerie" },
  { id: "platrerie", libelle: "Plâtrerie" },
  { id: "menuiserie", libelle: "Menuiserie" },
  { id: "peinture", libelle: "Peinture" },
  { id: "divers", libelle: "Divers" },
];
/** Les lots de premier niveau, chacun avec ses sous-lots (aucun à ce jour). */
export const LOTS_PRINCIPAUX_V1 = LOTS_V1.filter((l) => !l.dans).map((l) => ({ ...l, sous: LOTS_V1.filter((s) => s.dans === l.id) }));
/** Le lot de premier niveau d'un lot (lui-même tant qu'aucun sous-lot n'existe). */
export const lotPrincipal = (id: string) => LOTS_V1.find((l) => l.id === id)?.dans ?? id;
/** Les filtres de l'accueil : Couverture · Zinguerie (à part depuis le 13 novembre 2026) · Isolation · Bois · Électricité. */
export const FILTRES_V1 = LOTS_PRINCIPAUX_V1.slice(0, 5);
/** « Couverture », « Zinguerie » (« Lot › Sous-lot » si un sous-lot existe un jour). */
export const libelleLot = (id: string) => {
  const l = LOTS_V1.find((x) => x.id === id);
  if (!l) return id;
  return l.dans ? `${LOTS_V1.find((x) => x.id === l.dans)?.libelle ?? l.dans} › ${l.libelle}` : l.libelle;
};

export const CASE_UNE_LIGNE = (date: string) =>
  `Je confirme que cette quantité correspond à un besoin réel de mon entreprise. Je la maintiendrai à jour jusqu'au ${date}. Ce n'est pas encore une commande : je pourrai accepter ou refuser l'offre finale.`;
export const CASE_PLUSIEURS_LIGNES = "Je confirme qu'il s'agit de besoins réels de mon entreprise. Ce n'est pas encore une commande : je pourrai accepter ou refuser séparément chaque offre finale.";
export const PHRASE_ADRESSE_PRIVEE = "Ton adresse exacte n'est jamais montrée aux autres entreprises. Elles voient seulement la zone de regroupement.";
export const SIGNATURE = "Mobiiz. Plus on est, moins on paie.";

export const dateLongue = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
export const dateCourte = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
export const heureCourte = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ").replace(/ h 00$/, " h")}`;
};
export const zoneLisible = (z: { code: string; nom: string }) => `${z.nom} (${z.code})`;
export const jourDans = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** L'état du parcours V1 : `undefined` pendant le chargement, `null` quand le réglage est coupé (404). */
export function useAgV1(): { etat: EtatV1 | null | undefined; recharger: () => void; setEtat: (e: EtatV1) => void } {
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api<EtatV1>("/v1/ag/etat", { signal }).then(
        (etat) => ({ etat }),
        (e: unknown) => (e instanceof ApiError && e.status === 404 ? { etat: null } : Promise.reject(e)),
      ),
    [],
  );
  const { data, error, reload, setData } = useResource<{ etat: EtatV1 | null }>(fetcher);
  // Une panne de l'API n'allume jamais le nouveau parcours par erreur : l'ancien écran reste.
  return { etat: error ? null : data === null ? undefined : data.etat, recharger: reload, setEtat: (e) => setData({ etat: e }) };
}
