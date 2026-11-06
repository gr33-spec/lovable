import { Module } from "@nestjs/common";
import { fabriqueIa } from "../../platform/ai/fabrique-ia.js";
import type { AppConfig } from "../../platform/config/config.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { CONFIG, LOGGER } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { InterpretationService } from "./application/interpretation.service.js";
import { InterpretationController } from "./http/interpretation.controller.js";
import { FakeInterpreteur } from "./infrastructure/fake-interpreteur.js";
import { IaInterpreteur } from "./infrastructure/ia-interpreteur.js";

/** Lot 7 : l'interprétation IA des réponses libres, éteinte par défaut (`INTERPRETE_IA`). */
@Module({
  imports: [TenancyModule],
  controllers: [InterpretationController],
  providers: [
    {
      provide: InterpretationService,
      useFactory: (config: AppConfig, logger: AppLogger) => {
        if (!config.ai.interprete) return new InterpretationService(null);
        const ia = fabriqueIa(config);
        const interpreteur = ia ? new IaInterpreteur(ia, config.ai.interpreteModel) : config.ai.provider === "fake" ? new FakeInterpreteur() : null;
        return new InterpretationService(interpreteur, (e) => logger.info({ interpretation: e }, "interprétation IA d'une réponse libre"));
      },
      inject: [CONFIG, LOGGER],
    },
  ],
})
export class InterpretationModule {}
