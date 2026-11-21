import { Global, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import { CONFIG, LOGGER } from "../tokens.js";
import { createLogger } from "./logger.js";

@Global()
@Module({
  providers: [
    { provide: LOGGER, useFactory: (config: AppConfig) => createLogger(config.logLevel), inject: [CONFIG] },
  ],
  exports: [LOGGER],
})
export class LoggingModule {}
