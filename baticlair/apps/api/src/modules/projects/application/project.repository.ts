import type { TenantContext } from "../../tenancy/index.js";
import type { Project, ProjectStatus } from "../domain/project.js";

export interface NewProject {
  name: string;
  clientName: string | null;
  address: string | null;
  /** Chantier de démonstration : ne compte pas dans la formule. */
  demo?: boolean;
}

export type ProjectPatch = Partial<Omit<NewProject, "demo"> & { status: ProjectStatus }>;

/** Filtre de statut ; « all » = en cours et archivés (utile en recherche). */
export type ProjectStatusFilter = ProjectStatus | "all";

export interface ProjectListQuery {
  status: ProjectStatusFilter;
  /** Mots recherchés dans le nom, le client et l'adresse (tous doivent figurer). */
  search?: string[];
  limit: number;
  cursor?: ProjectCursor;
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
