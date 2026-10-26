import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { CONFIG, LOGGER } from "../../platform/tokens.js";
import { AiUsageModule, AiUsageRecorder, AnalysisMeter } from "../ai-usage/index.js";
import { DOCUMENT_REPOSITORY, DocumentAiInput, DocumentsModule, type DocumentRepository } from "../documents/index.js";
import { PRICE_REQUEST_REPOSITORY, PriceRequestsModule, type PriceRequestRepository } from "../price-requests/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { OFFER_EXTRACTOR, type OfferExtractor } from "./application/offer-extractor.js";
import { OFFER_REPOSITORY, type OfferRepository } from "./application/offer.repository.js";
import { OffersService } from "./application/offers.service.js";
import { OffersController } from "./http/offers.controller.js";
import { IaOfferExtractor } from "./infrastructure/ia-offer-extractor.js";
import { fabriqueIa } from "../../platform/ai/fabrique-ia.js";
import { FakeOfferExtractor } from "./infrastructure/fake-offer-extractor.js";
import { PrismaOfferRepository } from "./infrastructure/prisma-offer.repository.js";

@Module({
  imports: [TenancyModule, DocumentsModule, AiUsageModule, PriceRequestsModule],
  controllers: [OffersController],
  providers: [
    { provide: OFFER_REPOSITORY, useFactory: (p: PrismaService) => new PrismaOfferRepository(p), inject: [PrismaService] },
    {
      provide: OFFER_EXTRACTOR,
      useFactory: (config: AppConfig): OfferExtractor | null => {
        const ia = fabriqueIa(config);
        if (ia) return new IaOfferExtractor(ia, config.ai.extractionModel, config.ai.effort);
        return config.ai.provider === "fake" ? new FakeOfferExtractor() : null;
      },
      inject: [CONFIG],
    },
    {
      provide: OffersService,
      useFactory: (
        offers: OfferRepository,
        requests: PriceRequestRepository,
        docs: DocumentRepository,
        aiInput: DocumentAiInput,
        extractor: OfferExtractor | null,
        meter: AnalysisMeter,
        recorder: AiUsageRecorder,
        logger: AppLogger,
      ) =>
        new OffersService(offers, requests, docs, aiInput, extractor, meter, recorder, (error) =>
          logger.error({ err: error }, "offers: coût IA non enregistré"),
        ),
      inject: [OFFER_REPOSITORY, PRICE_REQUEST_REPOSITORY, DOCUMENT_REPOSITORY, DocumentAiInput, OFFER_EXTRACTOR, AnalysisMeter, AiUsageRecorder, LOGGER],
    },
  ],
})
export class OffersModule {}
