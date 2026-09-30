import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { TenancyModule } from "../tenancy/index.js";
import { PROJECT_REPOSITORY, type ProjectRepository } from "./application/project.repository.js";
import { ProjectsService } from "./application/projects.service.js";
import { ProjectsController } from "./http/projects.controller.js";
import { PrismaProjectRepository } from "./infrastructure/prisma-project.repository.js";

@Module({
  imports: [TenancyModule],
  controllers: [ProjectsController],
  providers: [
    { provide: PROJECT_REPOSITORY, useFactory: (p: PrismaService) => new PrismaProjectRepository(p), inject: [PrismaService] },
    { provide: ProjectsService, useFactory: (r: ProjectRepository) => new ProjectsService(r), inject: [PROJECT_REPOSITORY] },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
