import type { LineRole } from "@baticlair/domain";
import type { TenantContext } from "../../tenancy/index.js";

export type TakeoffStatus = "draft" | "validated";
export type LineOrigin = "ai" | "manual";

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
  documentId: string;
  trade: string;
  status: TakeoffStatus;
  promptId: string;
  promptVersion: number;
  model: string;
  notes: string[];
  /** Réponses aux questions du calcul pour ce chantier : produit, valeur, « aucun » (null), « pas celui-ci » (""). */
  answers: Record<string, string | { value: string; unit: string } | null>;
  createdAt: Date;
  validatedAt: Date | null;
  lines: TakeoffLineRecord[];
}

export interface NewTakeoff {
  projectId: string;
  documentId: string;
  analysisId: string | null;
  trade: string;
  promptId: string;
  promptVersion: number;
  model: string;
  notes: string[];
  lines: NewTakeoffLine[];
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
  /** Enregistre le rôle de la quantité de ces lignes (niveau 1 : mesure ou à commander). */
  setRoles(tenant: TenantContext, roles: ReadonlyMap<string, LineRole>): Promise<void>;
}

export const TAKEOFF_REPOSITORY = Symbol("TAKEOFF_REPOSITORY");
