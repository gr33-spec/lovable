import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { PDF_READER, PdfJsPdfReader, type PdfReader } from "../documents/index.js";
import { TakeoffModule, TakeoffService } from "../takeoff/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { ChoixService } from "./application/choix.service.js";
import { CommandeService } from "./application/commande.service.js";
import { DemandeService } from "./application/demande.service.js";
import { GroupeService } from "./application/groupe.service.js";
import { NEGOCE_EXTRACTOR, type NegoceExtractor } from "./application/negoce-extractor.js";
import { AnthropicNegoceExtractor } from "./infrastructure/anthropic-negoce-extractor.js";
import { FakeNegoceExtractor } from "./infrastructure/fake-negoce-extractor.js";
import { InseeSiretVerifier, SIRET_VERIFIER, siretBienForme, type SiretVerifier } from "./application/siret-verifier.js";
import { NegocesService } from "./application/negoces.service.js";
import { RegroupementService } from "./application/regroupement.service.js";
import { GroupeController } from "./http/groupe.controller.js";
import { NegocesController } from "./http/negoces.controller.js";
import { RegroupementController } from "./http/regroupement.controller.js";
import { ReponseController } from "./http/reponse.controller.js";

@Module({
  imports: [TenancyModule, TakeoffModule],
  controllers: [GroupeController, NegocesController, RegroupementController, ReponseController],
  providers: [
    {
      provide: SIRET_VERIFIER,
      // En test sans clé INSEE, ou en prévisualisation avec `SIRET_VERIFICATION=forme` (refusé en production par la
      // configuration) : un SIRET bien formé vaut actif, sans appel réseau. Sinon, seule l'API Sirene vérifie.
      useFactory: (c: AppConfig): SiretVerifier =>
        (c.env === "test" && !c.groupe.inseeApiKey) || c.groupe.siretVerification === "forme"
          ? { verifier: async (s) => (siretBienForme(s) ? { statut: "actif" } : { statut: "inconnu" }) }
          : new InseeSiretVerifier(c.groupe.inseeApiKey),
      inject: [CONFIG],
    },
    { provide: RegroupementService, useFactory: (p: PrismaService) => new RegroupementService(p), inject: [PrismaService] },
    { provide: PDF_READER, useFactory: () => new PdfJsPdfReader() },
    { provide: CommandeService, useFactory: (p: PrismaService, e: TransactionalEmailSender) => new CommandeService(p, e), inject: [PrismaService, EMAIL_SENDER] },
    { provide: ChoixService, useFactory: (p: PrismaService, c: CommandeService) => new ChoixService(p, c), inject: [PrismaService, CommandeService] },
    {
      provide: NEGOCE_EXTRACTOR,
      // Le devis du négoce est lu par le modèle rapide (Sonnet), à la demande ; en test, le faux lecteur ; sans clé, Greg relit.
      useFactory: (c: AppConfig): NegoceExtractor | null => {
        switch (c.ai.provider) {
          case "anthropic":
            return new AnthropicNegoceExtractor(c.ai.apiKey!, c.ai.quantitatifModel);
          case "fake":
            return new FakeNegoceExtractor();
          case "disabled":
            return null;
        }
      },
      inject: [CONFIG],
    },
    {
      provide: DemandeService,
      useFactory: (p: PrismaService, e: TransactionalEmailSender, pdf: PdfReader, x: NegoceExtractor | null, c: AppConfig, choix: ChoixService) => new DemandeService(p, e, pdf, x, { webAppUrl: c.webAppUrl, authSecret: c.authSecret }, choix),
      inject: [PrismaService, EMAIL_SENDER, PDF_READER, NEGOCE_EXTRACTOR, CONFIG, ChoixService],
    },
    {
      provide: GroupeService,
      useFactory: (p: PrismaService, t: TakeoffService, s: SiretVerifier, r: RegroupementService, d: DemandeService, c: CommandeService) => new GroupeService(p, (tenant, id) => t.reviewed(tenant, id), s, r, d, c),
      inject: [PrismaService, TakeoffService, SIRET_VERIFIER, RegroupementService, DemandeService, CommandeService],
    },
    { provide: NegocesService, useFactory: (p: PrismaService, c: AppConfig) => new NegocesService(p, c.authSecret), inject: [PrismaService, CONFIG] },
  ],
  exports: [GroupeService, NegocesService, RegroupementService, DemandeService, ChoixService, CommandeService],
})
export class GroupeModule {}
