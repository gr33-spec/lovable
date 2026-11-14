import { Module } from "@nestjs/common";
import { hashPassword } from "better-auth/crypto";
import { PrismaService } from "../../platform/database/prisma.service.js";
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
      // Le hachage de base de better-auth (scrypt, celui qui vérifie à la connexion) : le contrôle des mots de passe fuités
      // l'enveloppe en ligne et n'est utilisable que dans une requête d'authentification (recette du 7 novembre 2026).
      useFactory: (prisma: PrismaService, chantier: DemoService) => new AccesDemoService(prisma, hashPassword, chantier),
      inject: [PrismaService, DemoService],
    },
  ],
  exports: [AccesDemoService],
})
export class AccesDemoModule {}
