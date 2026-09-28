import { Global, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import type { AppLogger } from "../logging/logger.js";
import { CONFIG, EMAIL_SENDER, LOGGER } from "../tokens.js";
import { CapturingEmailSender } from "./capturing-email.sender.js";
import { ConsoleEmailSender } from "./console-email.sender.js";

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      useFactory: (config: AppConfig, logger: AppLogger) =>
        config.emailProvider === "capture" ? new CapturingEmailSender() : new ConsoleEmailSender(logger),
      inject: [CONFIG, LOGGER],
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
