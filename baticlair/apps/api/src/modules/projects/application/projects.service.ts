import { notFound } from "../../../platform/errors/domain-error.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { normalizeOptionalText, normalizeProjectName, type Project, type ProjectStatus } from "../domain/project.js";
import type { ProjectListQuery, ProjectPage, ProjectPatch, ProjectRepository } from "./project.repository.js";

export interface CreateProjectInput {
  name: string;
  clientName?: string | null | undefined;
  address?: string | null | undefined;
  demo?: boolean | undefined;
}

export interface UpdateProjectInput {
  name?: string | undefined;
  clientName?: string | null | undefined;
  address?: string | null | undefined;
  status?: ProjectStatus | undefined;
}

export class ProjectsService {
  constructor(private readonly projects: ProjectRepository) {}

  create(tenant: TenantContext, input: CreateProjectInput): Promise<Project> {
    assertCanWrite(tenant);
    return this.projects.create(tenant, {
      name: normalizeProjectName(input.name),
      clientName: normalizeOptionalText(input.clientName, "clientName"),
      address: normalizeOptionalText(input.address, "address"),
      demo: input.demo === true,
    });
  }

  async get(tenant: TenantContext, id: string): Promise<Project> {
    const project = await this.projects.findById(tenant, id);
    if (!project) throw notFound("Project");
    return project;
  }

  /**
   * Chantiers du plus récemment travaillé au plus ancien. Une recherche
   * porte par défaut sur tous les chantiers, archivés compris : l'artisan
   * qui cherche « Dupont » veut aussi le chantier de l'an dernier.
   */
  list(tenant: TenantContext, query: ProjectListQuery): Promise<ProjectPage> {
    return this.projects.list(tenant, query);
  }

  async update(tenant: TenantContext, id: string, input: UpdateProjectInput): Promise<Project> {
    assertCanWrite(tenant);
    const patch: ProjectPatch = {};
    if (input.name !== undefined) patch.name = normalizeProjectName(input.name);
    if (input.clientName !== undefined) patch.clientName = normalizeOptionalText(input.clientName, "clientName");
    if (input.address !== undefined) patch.address = normalizeOptionalText(input.address, "address");
    if (input.status !== undefined) patch.status = input.status;
    const project = await this.projects.update(tenant, id, patch);
    if (!project) throw notFound("Project");
    return project;
  }
}
