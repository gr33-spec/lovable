import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { BillingModule } from "../billing/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { PROJECT_REPOSITORY, type ProjectRepository } from "./application/project.repository.js";
import { ProjectsService } from "./application/projects.service.js";
import { NextActionsController } from "./http/next-actions.controller.js";
import { ProjectsController } from "./http/projects.controller.js";
import { PrismaNextActionsQuery } from "./infrastructure/prisma-next-actions.query.js";
import { PrismaProjectRepository } from "./infrastructure/prisma-project.repository.js";

@Module({
  imports: [TenancyModule, BillingModule],
  controllers: [ProjectsController, NextActionsController],
  providers: [
    { provide: PROJECT_REPOSITORY, useFactory: (p: PrismaService) => new PrismaProjectRepository(p), inject: [PrismaService] },
    { provide: ProjectsService, useFactory: (r: ProjectRepository) => new ProjectsService(r), inject: [PROJECT_REPOSITORY] },
    { provide: PrismaNextActionsQuery, useFactory: (p: PrismaService) => new PrismaNextActionsQuery(p), inject: [PrismaService] },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
