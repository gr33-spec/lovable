import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { AUTH } from "../../platform/tokens.js";
import type { Auth } from "../identity/index.js";
import { DemoModule, DemoService } from "../demo/index.js";
import { IdentityModule } from "../identity/index.js";
import { AccesDemoController } from "./http/acces-demo.controller.js";
import { AccesDemoService } from "./application/acces-demo.service.js";

/** L'accès démo « Découvrir l'application » (Greg, 7 novembre 2026). */
@Module({
  imports: [DemoModule, IdentityModule],
  controllers: [AccesDemoController],
  providers: [
    {
      provide: AccesDemoService,
      useFactory: (prisma: PrismaService, auth: Auth, chantier: DemoService) => new AccesDemoService(prisma, async (mdp) => (await auth.$context).password.hash(mdp), chantier),
      inject: [PrismaService, AUTH, DemoService],
    },
  ],
  exports: [AccesDemoService],
})
export class AccesDemoModule {}
