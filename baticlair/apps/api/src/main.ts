import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { configureApp } from "./app.js";
import type { AppConfig } from "./platform/config/config.js";
import { CONFIG } from "./platform/tokens.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, bufferLogs: true });
  configureApp(app);
  const config = app.get<AppConfig>(CONFIG);
  await app.listen(config.port);
}

void bootstrap();
