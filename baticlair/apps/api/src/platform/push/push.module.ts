import { Global, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import type { AppLogger } from "../logging/logger.js";
import { CONFIG, LOGGER, PUSH_SENDER } from "../tokens.js";
import { CapturingPushSender, WebPushSender } from "./web-push.sender.js";

@Global()
@Module({
  providers: [
    {
      provide: PUSH_SENDER,
      useFactory: (config: AppConfig, logger: AppLogger) =>
        config.env === "test" ? new CapturingPushSender(config.authSecret) : new WebPushSender(config.authSecret, config.webAppUrl.replace(/^http:/, "https:"), logger),
      inject: [CONFIG, LOGGER],
    },
  ],
  exports: [PUSH_SENDER],
})
export class PushModule {}
