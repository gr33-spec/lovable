import { normalizeText } from "../trades/trade-profile.js";
import { fenetresCompatibles, type FamilleGroupe, type FenetreLivraison } from "./groupe.js";
import { SEUILS_SOURCE } from "./seuils.generated.js";

/**
 * LE REGROUPEMENT (parcours groupé, étape 4) : du code pur. Les besoins se groupent par référence exacte (clé), famille,
 * zone (département) et fenêtre de livraison compatible ; un seul lot ouvert par référence et par zone ; un lot se forme
 * un lundi sur deux à 7 h, ou dès qu'un seuil est atteint (`groupe/seuils.json`) ; le lot sépare le volume FERME (signé)
 * du volume PROBABLE (en attente) ; un besoin est plafonné à 3 × la médiane des besoins de sa référence sur 90 jours.
 */
export interface Seuil {
  /** Nombre d'artisans distincts (besoins signés) qui forment le lot. */
  artisans: number;
  /** Ou une quantité signée, dans l'unité donnée (comparée seulement aux besoins de cette unité). */
  quantite?: number;
  unite?: string;
}

export interface Seuils {
  defaut: Seuil;
  familles: Partial<Record<FamilleGroupe, Seuil>>;
  references: (Seuil & { mot: string })[];
  plafond: { foisMediane: number; jours: number };
  calendrier: { jour: "lundi"; heure: number; toutesLesSemaines: number };
}

function lireSeuils(texte: string): Seuils {
  const v = JSON.parse(texte) as Partial<Seuils> & { _?: string };
  const seuil = (x: unknown): Seuil | null => {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    if (typeof o.artisans !== "number" || o.artisans < 1) return null;
    const quantite = typeof o.quantite === "number" && o.quantite > 0 ? o.quantite : undefined;
    const unite = typeof o.unite === "string" && o.unite.trim() ? o.unite.trim() : undefined;
    return { artisans: Math.floor(o.artisans), ...(quantite && unite ? { quantite, unite } : {}) };
  };
  const defaut = seuil(v.defaut);
  if (!defaut) throw new Error("groupe/seuils.json : « defaut.artisans » manquant");
  const familles: Partial<Record<FamilleGroupe, Seuil>> = {};
  for (const [f, x] of Object.entries(v.familles ?? {})) {
    const s = seuil(x);
    if (s) familles[f as FamilleGroupe] = s;
  }
  const references = (v.references ?? []).flatMap((r) => {
    const s = seuil(r);
    return s && typeof r.mot === "string" && r.mot.trim() ? [{ ...s, mot: r.mot.trim() }] : [];
  });
  const plafond = v.plafond && typeof v.plafond.foisMediane === "number" && typeof v.plafond.jours === "number" ? v.plafond : { foisMediane: 3, jours: 90 };
  const calendrier = v.calendrier && typeof v.calendrier.heure === "number" ? { jour: "lundi" as const, heure: v.calendrier.heure, toutesLesSemaines: v.calendrier.toutesLesSemaines ?? 2 } : { jour: "lundi" as const, heure: 7, toutesLesSemaines: 2 };
  return { defaut, familles, references, plafond, calendrier };
}

/** Les seuils du fichier `groupe/seuils.json` (générés dans le module au build). */
export const SEUILS: Seuils = lireSeuils(SEUILS_SOURCE);

/** Le seuil d'un lot : la première référence dont le mot est dans la clé, sinon sa famille, sinon le défaut. */
export function seuilDuLot(cle: string, famille: string, seuils: Seuils = SEUILS): Seuil {
  const c = normalizeText(cle);
  const ref = seuils.references.find((r) => c.includes(normalizeText(r.mot)));
  if (ref) {
    const { mot: _mot, ...s } = ref;
    return s;
  }
  return seuils.familles[famille as FamilleGroupe] ?? seuils.defaut;
}

export interface BesoinACouper {
  id: string;
  companyId: string;
  cle: string;
  famille: string;
  zone: string;
  quantite: number;
  unite: string;
  statut: "signe" | "en_attente";
  fenetre: FenetreLivraison;
}

export interface LotOuvert {
  id: string;
  cle: string;
  zone: string;
  fenetre: FenetreLivraison;
  besoins: readonly BesoinACouper[];
}

/** Le volume d'un lot (section 2, étape 4) : ferme (signé) et probable (en attente), avec le nombre d'artisans fermes. */
export function volumeDuLot(besoins: readonly BesoinACouper[]): { ferme: number; probable: number; artisansFermes: number; unite: string | null } {
  const signes = besoins.filter((b) => b.statut === "signe");
  return {
    ferme: signes.reduce((s, b) => s + b.quantite, 0),
    probable: besoins.filter((b) => b.statut === "en_attente").reduce((s, b) => s + b.quantite, 0),
    artisansFermes: new Set(signes.map((b) => b.companyId)).size,
    unite: besoins[0]?.unite ?? null,
  };
}

/** Le seuil est atteint sur le volume FERME : assez d'artisans, ou assez de quantité dans l'unité du seuil. */
export function seuilAtteint(lot: { cle: string; famille: string; besoins: readonly BesoinACouper[] }, seuils: Seuils = SEUILS): boolean {
  const s = seuilDuLot(lot.cle, lot.famille, seuils);
  const v = volumeDuLot(lot.besoins);
  if (v.artisansFermes >= s.artisans) return true;
  const unite = s.unite;
  if (s.quantite && unite) {
    const memeUnite = lot.besoins.filter((b) => b.statut === "signe" && normalizeText(b.unite) === normalizeText(unite));
    if (memeUnite.reduce((t, b) => t + b.quantite, 0) >= s.quantite) return true;
  }
  return false;
}

/** La fenêtre commune de plusieurs fenêtres compatibles : du plus tard des « tôt » au plus tôt des « tard ». */
export function fenetreCommune(fenetres: readonly FenetreLivraison[]): FenetreLivraison | null {
  if (fenetres.length === 0) return null;
  const tot = new Date(Math.max(...fenetres.map((f) => f.tot.getTime())));
  const tard = new Date(Math.min(...fenetres.map((f) => f.tard.getTime())));
  return tot.getTime() <= tard.getTime() ? { tot, tard } : null;
}

/**
 * Le rangement des besoins libres dans les lots : un besoin rejoint le lot OUVERT de sa clé et de sa zone si sa fenêtre
 * est compatible avec celle du lot (qui se resserre à la fenêtre commune) ; sinon il attend (un seul lot ouvert par clé et
 * zone : il rejoindra le suivant) ; sans lot ouvert, il en ouvre un. Rend ce qu'il faut créer et rattacher.
 */
export function rangerLesBesoins(
  libres: readonly BesoinACouper[],
  ouverts: readonly LotOuvert[],
): { aCreer: { cle: string; famille: string; zone: string; fenetre: FenetreLivraison; besoins: BesoinACouper[] }[]; aRattacher: { lotId: string; besoinId: string; fenetre: FenetreLivraison }[]; enAttente: string[] } {
  const parLot = new Map(ouverts.map((l) => [`${l.cle}|${l.zone}`, { id: l.id, fenetre: l.fenetre }]));
  const aCreer: { cle: string; famille: string; zone: string; fenetre: FenetreLivraison; besoins: BesoinACouper[] }[] = [];
  const aRattacher: { lotId: string; besoinId: string; fenetre: FenetreLivraison }[] = [];
  const enAttente: string[] = [];
  const nouveaux = new Map<string, (typeof aCreer)[number]>();
  for (const b of [...libres].sort((x, y) => x.fenetre.tot.getTime() - y.fenetre.tot.getTime())) {
    const k = `${b.cle}|${b.zone}`;
    const ouvert = parLot.get(k);
    if (ouvert) {
      const commune = fenetresCompatibles(ouvert.fenetre, b.fenetre) ? fenetreCommune([ouvert.fenetre, b.fenetre]) : null;
      if (commune) {
        ouvert.fenetre = commune;
        aRattacher.push({ lotId: ouvert.id, besoinId: b.id, fenetre: commune });
      } else enAttente.push(b.id);
      continue;
    }
    const nouveau = nouveaux.get(k);
    if (nouveau) {
      const commune = fenetresCompatibles(nouveau.fenetre, b.fenetre) ? fenetreCommune([nouveau.fenetre, b.fenetre]) : null;
      if (commune) {
        nouveau.fenetre = commune;
        nouveau.besoins.push(b);
      } else enAttente.push(b.id);
      continue;
    }
    const lot = { cle: b.cle, famille: b.famille, zone: b.zone, fenetre: { ...b.fenetre }, besoins: [b] };
    nouveaux.set(k, lot);
    aCreer.push(lot);
  }
  return { aCreer, aRattacher, enAttente };
}

/** La médiane d'une série (section 5 : la médiane des besoins de la même référence sur 90 jours). */
export function mediane(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  const v = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

/**
 * Le plafond d'un besoin (section 5) : 3 × la médiane des besoins de la même référence sur 90 jours. Sans historique
 * (moins de deux autres besoins), pas de plafond. Rend la quantité admise, ou null si le besoin dépasse.
 */
export function plafondDuBesoin(quantite: number, autres: readonly number[], seuils: Seuils = SEUILS): { admis: boolean; plafond: number | null } {
  if (autres.length < 2) return { admis: true, plafond: null };
  const plafond = mediane(autres)! * seuils.plafond.foisMediane;
  return { admis: quantite <= plafond, plafond };
}

/**
 * Le lundi de formation (section 2, étape 4 : « toutes les deux semaines, lundi 7 h ») : un lundi sur deux, compté depuis
 * l'époque Unix en semaines ISO (les semaines paires). `maintenant` est en UTC ; l'heure du fichier est l'heure de Paris
 * approchée en UTC + 1 (hiver) : la tâche planifiée tourne au plus tôt à cette heure.
 */
export function estUnLundiDeFormation(maintenant: Date, seuils: Seuils = SEUILS): boolean {
  if (maintenant.getUTCDay() !== 1) return false;
  const semaines = Math.floor((maintenant.getTime() - Date.UTC(1970, 0, 5)) / (7 * 24 * 3600 * 1000));
  return semaines % seuils.calendrier.toutesLesSemaines === 0;
}
