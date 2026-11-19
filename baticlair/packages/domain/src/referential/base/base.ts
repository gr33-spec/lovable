import { z } from "zod";

/**
 * BASE DE RÉFÉRENCE D'UN MÉTIER (mission du fondateur, 2026-11-19 : « tout va dans la fiche métier unique, classée par
 * famille, puis marque, puis modèle, avec la carte des régions à part ; le code lit cette fiche et rien d'autre ; le
 * cœur reste sans métier ; la structure doit servir de modèle aux autres métiers »).
 *
 * Format commun à tous les métiers (`docs/format-base-metier.md`) : rien ici ne connaît la couverture. Un chiffre de la
 * base porte sa valeur, son unité, sa condition, son STATUT et ses sources ; seuls `confirme` et `confirme_fabricant`
 * sont des chiffres sûrs (`estConfirme`), le reste se dit « à confirmer » à l'écran (§47.1).
 */
export const STATUTS = ["confirme", "confirme_fabricant", "une_source", "a_confirmer"] as const;
export type StatutBase = (typeof STATUTS)[number];

const str = z.string().min(1);
const scalaire = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const valeurLibre = z.union([scalaire, z.array(z.unknown()), z.record(z.string(), z.unknown())]);

const chiffre = z.object({
  id: str,
  attribut: str,
  valeur: valeurLibre,
  unite: z.string().nullable().optional(),
  statut: z.enum(STATUTS),
  sources: z.array(str),
  condition: z.string().optional(),
  regions: z.array(z.string()).optional(),
  ecart: z.unknown().optional(),
  raison: z.unknown().optional(),
  controle: z.array(z.string()).optional(),
  portee: z.string().optional(),
  preuves: z.array(z.object({ source: str, extrait: z.string() })).optional(),
}).loose();

const modele = z.object({ nom: str, attributs: z.array(chiffre) });
const marque = z.object({ nom: str, groupe: z.string(), modeles: z.array(modele) });
const sousFamille = z.object({ nom: str, regles: z.array(chiffre), marques: z.array(marque) });
const famille = z.object({
  code: str,
  libelle: str,
  sous_familles: z.array(sousFamille),
  verdicts: z.array(z.record(z.string(), z.unknown())).optional(),
  comptoir: z.array(z.record(z.string(), z.unknown())).optional(),
}).loose();
/** Constante de calcul lue par le code (« ardoise.jeu_de_tete_crochet ») : sa valeur, et les chiffres confirmés qui la prouvent. */
const constante = z.object({
  cle: str,
  famille: str,
  libelle: str,
  valeur: str,
  unite: str,
  regle: z.string().optional(),
  decision: str,
  preuves: z.array(str).min(1),
  avant: z.string().optional(),
  statut: z.enum(STATUTS),
});
const source = z.object({ id: str, titre: z.string().nullable().optional(), url: z.string().nullable().optional(), type: z.string().nullable().optional(), consulte: z.string().nullable().optional() });

export const baseSchema = z.object({
  fiche: str,
  metier: str,
  nom: str,
  version: str,
  etat: z.enum(["brouillon", "en validation", "relu"]),
  regle_confirmation: str,
  carte_regions: z.string().optional(),
  taux_confirme: z.number(),
  constantes: z.array(constante).default([]),
  familles: z.array(famille).min(1),
  sources: z.array(source).min(1),
}).loose();

const departement = z.object({ code: str, nom: str, statut: z.enum(STATUTS) }).loose();
export const carteSchema = z.object({ version: str, departements: z.array(departement) }).loose();

export type BaseMetier = z.infer<typeof baseSchema>;
export type FamilleBase = z.infer<typeof famille>;
export type ModeleBase = z.infer<typeof modele>;
export type ChiffreBase = z.infer<typeof chiffre>;
export type CarteRegions = z.infer<typeof carteSchema>;
export type ConstanteBase = z.infer<typeof constante>;

export class BaseFileError extends Error {}

/**
 * Lit une base : forme (schéma), puis sens (chaque source citée existe, chaque identifiant de chiffre est unique). Une
 * base fausse ne se charge pas, avec le chemin de la faute.
 */
export function lireBase(texte: string): BaseMetier {
  const r = baseSchema.safeParse(JSON.parse(texte));
  if (!r.success) {
    const i = r.error.issues[0]!;
    throw new BaseFileError(`base de référence invalide : ${i.path.join(".")} : ${i.message}`);
  }
  const base = r.data;
  const sources = new Set(base.sources.map((s) => s.id));
  const vus = new Set<string>();
  for (const c of tousLesChiffres(base)) {
    if (vus.has(c.chiffre.id)) throw new BaseFileError(`base de référence invalide : identifiant en double « ${c.chiffre.id} »`);
    vus.add(c.chiffre.id);
    for (const s of c.chiffre.sources) {
      if (!sources.has(s)) throw new BaseFileError(`base de référence invalide : « ${c.chiffre.id} » cite la source inconnue ${s}`);
    }
  }
  const ids = new Map([...tousLesChiffres(base)].map((c) => [c.chiffre.id, c.chiffre]));
  const cles = new Set<string>();
  for (const k of base.constantes) {
    if (cles.has(k.cle)) throw new BaseFileError(`base de référence invalide : constante en double « ${k.cle} »`);
    cles.add(k.cle);
    for (const p of k.preuves) {
      const c = ids.get(p);
      if (!c) throw new BaseFileError(`base de référence invalide : la constante « ${k.cle} » cite la preuve inconnue ${p}`);
      if (!estConfirme(c)) throw new BaseFileError(`base de référence invalide : la constante « ${k.cle} » repose sur ${p}, qui n'est pas confirmé`);
    }
  }
  return base;
}

/** Une constante de calcul de la base, ou une erreur qui la nomme : le code ne devine jamais un chiffre absent. */
export function constanteDe(base: BaseMetier, cle: string): ConstanteBase {
  const k = base.constantes.find((c) => c.cle === cle);
  if (!k) throw new BaseFileError(`constante absente de la base ${base.fiche} : « ${cle} »`);
  return k;
}

export function lireCarte(texte: string): CarteRegions {
  const r = carteSchema.safeParse(JSON.parse(texte));
  if (!r.success) {
    const i = r.error.issues[0]!;
    throw new BaseFileError(`carte des régions invalide : ${i.path.join(".")} : ${i.message}`);
  }
  return r.data;
}

export const estConfirme = (c: { statut: StatutBase }) => c.statut === "confirme" || c.statut === "confirme_fabricant";

export interface ChiffreSitue {
  famille: string;
  sousFamille: string;
  marque: string | null;
  modele: string | null;
  chiffre: ChiffreBase;
}

/** Tous les chiffres de la base, chacun avec sa place (famille, sous-famille, marque, modèle ; null pour une règle). */
export function* tousLesChiffres(base: BaseMetier): Generator<ChiffreSitue> {
  for (const f of base.familles) {
    for (const s of f.sous_familles) {
      for (const c of s.regles) yield { famille: f.code, sousFamille: s.nom, marque: null, modele: null, chiffre: c };
      for (const m of s.marques) {
        for (const mo of m.modeles) {
          for (const c of mo.attributs) yield { famille: f.code, sousFamille: s.nom, marque: m.nom, modele: mo.nom, chiffre: c };
        }
      }
    }
  }
}

export interface ModeleSitue {
  famille: string;
  sousFamille: string;
  marque: string;
  groupe: string;
  modele: ModeleBase;
}

/** Les modèles d'une famille (ou de toutes), dans l'ordre de la base. */
export function modelesDe(base: BaseMetier, familleCode?: string): ModeleSitue[] {
  const out: ModeleSitue[] = [];
  for (const f of base.familles) {
    if (familleCode && f.code !== familleCode) continue;
    for (const s of f.sous_familles) {
      for (const m of s.marques) for (const mo of m.modeles) out.push({ famille: f.code, sousFamille: s.nom, marque: m.nom, groupe: m.groupe, modele: mo });
    }
  }
  return out;
}

/** Le chiffre d'un modèle pour un attribut (le premier sans condition, sinon le premier), ou null. */
export function chiffreDe(modele: ModeleBase, attribut: string): ChiffreBase | null {
  const tous = modele.attributs.filter((a) => a.attribut === attribut);
  return tous.find((a) => !a.condition) ?? tous[0] ?? null;
}

/** Comptes par statut et taux de chiffres confirmés, recalculés depuis la base (jamais recopiés). */
export function tauxConfirme(base: BaseMetier): { total: number; confirmes: number; taux: number; parStatut: Record<StatutBase, number> } {
  const parStatut = { confirme: 0, confirme_fabricant: 0, une_source: 0, a_confirmer: 0 } as Record<StatutBase, number>;
  let total = 0;
  for (const c of tousLesChiffres(base)) {
    parStatut[c.chiffre.statut] += 1;
    total += 1;
  }
  const confirmes = parStatut.confirme + parStatut.confirme_fabricant;
  return { total, confirmes, taux: total ? Math.round((1000 * confirmes) / total) / 10 : 0, parStatut };
}
