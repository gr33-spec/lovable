import type { CompletionRecord, FicheChantier, LineRole, QuoteLineReading } from "@baticlair/domain";
import type { TenantContext } from "../../tenancy/index.js";

export type TakeoffStatus = "draft" | "validated";
export type LineOrigin = "ai" | "manual" | "partner";

export interface LineFields {
  designation: string;
  quantityRaw: string | null;
  unitRaw: string | null;
  reference: string | null;
}

export interface NewTakeoffLine extends LineFields {
  sourceRefs: string[];
  sourcePages: number[];
  /** Titres du devis au-dessus de la ligne (lot, marque, logement, pièce). */
  section: string[];
  /** Doute exprimé par l'IA sur la ligne, montré tel quel à l'artisan. */
  aiDoubt: string | null;
  /** Prix unitaire envoyé par un partenaire, gardé tel quel (jamais utilisé pour calculer). */
  priceRaw?: string | null;
  /** Qui a écrit la ligne : l'IA (défaut) ou un partenaire. */
  origin?: LineOrigin;
  /** Prompt A (§41.1) : matériau et format nommés, dimensions lues ; gardés pour l'annexe fournisseur (§42). */
  material?: string | null;
  dimensions?: Record<string, string> | null;
  /** Prompt A v12 (§41.1 réécrit) : rôle, articles écrits, façonnage écrit, « manque » (questions de comptoir, §49.4). */
  reading?: QuoteLineReading | null;
}

export interface TakeoffLineRecord extends NewTakeoffLine {
  id: string;
  position: number;
  origin: LineOrigin;
  edited: boolean;
  /** L'artisan a vérifié la ligne et la garde telle quelle. */
  confirmed: boolean;
  /** Rôle de la quantité : mesure d'ouvrage, à commander, ou indéterminé (null : pas encore établi). */
  role: LineRole | null;
}

export interface TakeoffRecord {
  id: string;
  projectId: string;
  /** Nul pour une liste envoyée en lignes par un partenaire. */
  documentId: string | null;
  source: "pdf" | "lignes";
  /** Version du référentiel enregistrée à la création (§27.1.6). */
  referentialVersion: string | null;
  trade: string;
  status: TakeoffStatus;
  promptId: string;
  promptVersion: number;
  model: string;
  notes: string[];
  /** En-tête et notes du devis lus par l'IA (§41.1), ou null. */
  context: Record<string, string> | null;
  /** §51.1 : la fiche de chantier (lue par l'IA, complétée par les réponses « Autre » relues), ou null. */
  fiche: FicheChantier | null;
  /** Appel IA n° 2 : ajouts et doutes proposés (null : pas d'appel). */
  completion: CompletionRecord | null;
  /** Parcours (§48) : calcul lancé après les questions, et terminé (null : pas encore). */
  calculStartedAt: Date | null;
  calculatedAt: Date | null;
  /** L'analyse (lecture) d'où vient la liste ; le coût de l'appel n° 2 y est rattaché. */
  analysisId: string | null;
  /** Réponses aux questions du calcul pour ce chantier : produit, valeur, « aucun » (null), « pas celui-ci » (""). */
  answers: Record<string, string | { value: string; unit: string } | null>;
  createdAt: Date;
  validatedAt: Date | null;
  lines: TakeoffLineRecord[];
}

export interface NewTakeoff {
  projectId: string;
  documentId: string | null;
  source?: "pdf" | "lignes";
  /** Version du référentiel du métier ; null quand le métier n'a pas de tiroir (rien n'est calculé). */
  referentialVersion: string | null;
  analysisId: string | null;
  trade: string;
  promptId: string;
  promptVersion: number;
  model: string;
  notes: string[];
  lines: NewTakeoffLine[];
  /** En-tête et notes du devis (adresse, type de bâtiment, neuf/rénovation…), §41.1 règle 4. */
  context?: Record<string, string> | null;
  /** §51.1 : la fiche de chantier lue par l'IA. */
  fiche?: FicheChantier | null;
  /** Déjà calculé à la création (lignes d'un partenaire : pas de questions, pas d'appel IA). */
  calculated?: boolean;
}

export interface TakeoffRepository {
  findByDocument(tenant: TenantContext, documentId: string): Promise<TakeoffRecord | null>;
  findLatestByProject(tenant: TenantContext, projectId: string): Promise<TakeoffRecord | null>;
  findById(tenant: TenantContext, id: string): Promise<TakeoffRecord | null>;
  /** Quantitatif auquel appartient une ligne (dans l'entreprise active). */
  findByLine(tenant: TenantContext, lineId: string): Promise<TakeoffRecord | null>;
  create(tenant: TenantContext, data: NewTakeoff): Promise<TakeoffRecord>;
  /** Corrige une ligne ; une confirmation précédente est retirée (la ligne corrigée est relue). */
  updateLine(tenant: TenantContext, lineId: string, fields: LineFields): Promise<void>;
  confirmLine(tenant: TenantContext, lineId: string): Promise<void>;
  addLine(tenant: TenantContext, takeoffId: string, fields: LineFields): Promise<void>;
  deleteLine(tenant: TenantContext, lineId: string): Promise<void>;
  setStatus(tenant: TenantContext, id: string, status: TakeoffStatus): Promise<void>;
  setAnswer(tenant: TenantContext, id: string, key: string, value: string | { value: string; unit: string } | null): Promise<void>;
  /** Enregistre ce que l'appel IA n° 2 propose (ajouts, doutes). */
  setCompletion(tenant: TenantContext, id: string, completion: CompletionRecord): Promise<void>;
  /** §51.2 : la fiche mise à jour par la relecture d'une réponse « Autre ». */
  setFiche(tenant: TenantContext, id: string, fiche: FicheChantier): Promise<void>;
  /** Le calcul part (questions répondues) ou se termine. Le départ n'est pris qu'une fois (double appui). */
  startCalcul(tenant: TenantContext, id: string, at: Date, staleBefore: Date): Promise<boolean>;
  finishCalcul(tenant: TenantContext, id: string, at: Date): Promise<void>;
  /** Enregistre le rôle de la quantité de ces lignes (niveau 1 : mesure ou à commander). */
  setRoles(tenant: TenantContext, roles: ReadonlyMap<string, LineRole>): Promise<void>;
}

export const TAKEOFF_REPOSITORY = Symbol("TAKEOFF_REPOSITORY");
