import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { EmailCapability } from "../../platform/email/email.port.js";
import type { AppConfig } from "../../platform/config/config.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { Public } from "../identity/index.js";

@Controller("v1/health")
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EMAIL_SENDER) private readonly email: EmailCapability,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    // `features` : ce qui est réellement disponible, pour que l'interface ne
    // promette rien d'impossible (ex. « e-mail envoyé » sans service d'e-mail).
    return { status: "ok", features: { email: this.email.deliversEmail, ai: this.config.ai.provider !== "disabled" } };
  }
}
