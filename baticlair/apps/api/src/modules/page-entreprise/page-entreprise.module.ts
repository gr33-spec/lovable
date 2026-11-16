import { Module } from "@nestjs/common";
import { waitUntil } from "@vercel/functions";
import { fabriqueIa } from "../../platform/ai/fabrique-ia.js";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { CONFIG, EMAIL_SENDER, LOGGER } from "../../platform/tokens.js";
import { AiUsageModule, AiUsageRecorder, AnalysisMeter } from "../ai-usage/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { AideEcriture } from "./application/aide-ecriture.js";
import { PageEntrepriseService } from "./application/page-entreprise.service.js";
import { MaPageController, PagesPubliquesAdminController, PagesPubliquesController } from "./http/page-entreprise.controller.js";
import { StockageBlob, StockageCoupe, StockageLocal, type StockagePhotos } from "./infrastructure/stockage-photos.js";
import { STOCKAGE_PAGES } from "./tokens.js";

/** MA PAGE MOBIIZ (Greg, 16 novembre 2026) : tables nouvelles, trois portes (l'artisan, les visiteurs, l'admin). */
@Module({
  imports: [TenancyModule, AiUsageModule],
  controllers: [MaPageController, PagesPubliquesController, PagesPubliquesAdminController],
  providers: [
    {
      provide: STOCKAGE_PAGES,
      useFactory: (c: AppConfig): StockagePhotos => {
        const s = c.pagesEntreprises;
        if (s.stockage === "blob" && s.blobToken) return new StockageBlob(s.blobToken);
        if (s.stockage === "local") return new StockageLocal(s.dossierLocal, "");
        return new StockageCoupe();
      },
      inject: [CONFIG],
    },
    {
      provide: PageEntrepriseService,
      useFactory: (p: PrismaService, s: StockagePhotos, e: TransactionalEmailSender, c: AppConfig, l: AppLogger) => new PageEntrepriseService(p, s, e, c, l, (travail) => waitUntil(travail)),
      inject: [PrismaService, STOCKAGE_PAGES, EMAIL_SENDER, CONFIG, LOGGER],
    },
    {
      provide: AideEcriture,
      useFactory: (c: AppConfig, m: AnalysisMeter, r: AiUsageRecorder, l: AppLogger) => {
        const ia = fabriqueIa(c);
        return new AideEcriture(ia ? ia({ model: c.ai.quantitatifModel, effort: "low" }) : null, m, r, l);
      },
      inject: [CONFIG, AnalysisMeter, AiUsageRecorder, LOGGER],
    },
  ],
})
export class PageEntrepriseModule {}
