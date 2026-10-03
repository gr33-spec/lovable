import { Global, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import type { AppLogger } from "../logging/logger.js";
import { ChannelAlerter } from "../alerts/alerter.js";
import { ALERTER, CONFIG, EMAIL_SENDER, LOGGER } from "../tokens.js";
import type { TransactionalEmailSender } from "./email.port.js";
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
    {
      // Alertes de production (B5) : à côté des e-mails, qu'elles peuvent emprunter.
      provide: ALERTER,
      useFactory: (config: AppConfig, email: TransactionalEmailSender, logger: AppLogger) => new ChannelAlerter({ ...config.alerts, env: config.env }, email, logger),
      inject: [CONFIG, EMAIL_SENDER, LOGGER],
    },
  ],
  exports: [EMAIL_SENDER, ALERTER],
})
export class EmailModule {}
