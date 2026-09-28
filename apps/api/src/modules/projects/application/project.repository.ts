import type { TenantContext } from "../../tenancy/index.js";
import type { Project, ProjectStatus } from "../domain/project.js";

export interface NewProject {
  name: string;
  clientName: string | null;
  address: string | null;
}

export type ProjectPatch = Partial<NewProject & { status: ProjectStatus }>;

export interface ProjectPage {
  items: Project[];
  nextCursor: string | null;
}

/**
 * Port de persistance des chantiers. Chaque méthode exige un
 * TenantContext : il est impossible de lire ou d'écrire hors de
 * l'entreprise courante.
 */
export interface ProjectRepository {
  create(tenant: TenantContext, data: NewProject): Promise<Project>;
  findById(tenant: TenantContext, id: string): Promise<Project | null>;
  list(tenant: TenantContext, query: { status: ProjectStatus; limit: number; cursor?: string }): Promise<ProjectPage>;
  update(tenant: TenantContext, id: string, patch: ProjectPatch): Promise<Project | null>;
}

export const PROJECT_REPOSITORY = Symbol("PROJECT_REPOSITORY");
