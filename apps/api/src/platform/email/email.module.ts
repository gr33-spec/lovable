import { Global, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import type { AppLogger } from "../logging/logger.js";
import { CONFIG, EMAIL_SENDER, LOGGER } from "../tokens.js";
import { CapturingEmailSender } from "./capturing-email.sender.js";
import { ConsoleEmailSender } from "./console-email.sender.js";
import { DisabledEmailSender } from "./disabled-email.sender.js";
import { ResendEmailSender } from "./resend-email.sender.js";

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      useFactory: (config: AppConfig, logger: AppLogger) => {
        switch (config.emailProvider) {
          case "resend":
            return new ResendEmailSender(config.resend!.apiKey, config.resend!.from, logger);
          case "disabled":
            return new DisabledEmailSender(logger);
          case "capture":
            return new CapturingEmailSender();
          case "console":
            return new ConsoleEmailSender(logger);
        }
      },
      inject: [CONFIG, LOGGER],
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
