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
  // Le serveur garde une connexion ouverte plus longtemps que ne le fait le client (le proxy de Next, 5 s par défaut
  // côté Node) : sinon une requête part sur une connexion que l'API vient de fermer et finit en ECONNRESET, donc en
  // 500 chez l'artisan (vu en e2e sur /v1/price-requests/settings et /v1/partner-keys, DETTE n° 33).
  const server = app.getHttpServer() as import("node:http").Server;
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

void bootstrap();
