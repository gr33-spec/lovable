import type { TenantContext } from "../../tenancy/index.js";
import type { Project, ProjectStatus } from "../domain/project.js";

export interface NewProject {
  name: string;
  clientName: string | null;
  address: string | null;
  /** Infos chantier facultatives (note de l'artisan), ou null. */
  siteNotes?: string | null;
  /** Chantier de démonstration : ne compte pas dans la formule. */
  demo?: boolean;
  /** Métier du chantier, ou null : celui de l'entreprise. */
  trade?: string | null;
  /** « achat-groupe » : liste faite pour un besoin groupé (Greg, 19 novembre 2026). */
  origine?: string | null;
}

export type ProjectPatch = Partial<Omit<NewProject, "demo"> & { status: ProjectStatus }>;

/** Filtre de statut ; « all » = en cours et archivés (utile en recherche). */
export type ProjectStatusFilter = ProjectStatus | "all";

/**
 * « MES DEMANDES » (Greg, 1er novembre 2026) : l'étape du dossier, d'après ses demandes de prix.
 * À préparer : rien n'est encore parti ; Envoyées : partie, sans réponse ; Réponses reçues : au moins une réponse, aucun
 * négoce retenu ; Terminées : marquée terminée ou un négoce retenu.
 */
/** « parties » (Greg, 22 novembre 2026) : tout sauf les brouillons, qui vivent repliés en bas de Demandes. */
export type EtapeDemande = "a-preparer" | "parties" | "envoyees" | "reponses" | "terminees";

export interface ProjectListQuery {
  status: ProjectStatusFilter;
  /** L'étape du dossier (« Mes demandes ») ; prime sur `status`. */
  etape?: EtapeDemande;
  /** Mots recherchés dans le nom, le client et l'adresse (tous doivent figurer). */
  search?: string[];
  limit: number;
  cursor?: ProjectCursor;
  /**
   * Greg, 19 novembre 2026 : une liste faite pour un besoin groupé, jamais partie chez un négoce, vit dans Demandes ›
   * Groupées. « sans » (par défaut) l'écarte ; « a-finir » ne rend qu'elles, et seulement celles qui n'ont encore aucun
   * besoin publié ; « toutes » ne filtre rien.
   */
  groupe?: "sans" | "a-finir" | "toutes";
}

/** Position dans la liste triée par dernière activité. */
export interface ProjectCursor {
  lastActivityAt: Date;
  id: string;
}

export interface ProjectPage {
  items: Project[];
  nextCursor: ProjectCursor | null;
}

/**
 * Port de persistance des chantiers. Chaque méthode exige un
 * TenantContext : il est impossible de lire ou d'écrire hors de
 * l'entreprise courante.
 */
export interface ProjectRepository {
  create(tenant: TenantContext, data: NewProject): Promise<Project>;
  findById(tenant: TenantContext, id: string): Promise<Project | null>;
  list(tenant: TenantContext, query: ProjectListQuery): Promise<ProjectPage>;
  update(tenant: TenantContext, id: string, patch: ProjectPatch): Promise<Project | null>;
}

export const PROJECT_REPOSITORY = Symbol("PROJECT_REPOSITORY");
