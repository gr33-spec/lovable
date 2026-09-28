import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { Public } from "../identity/index.js";

@Controller("v1/health")
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
