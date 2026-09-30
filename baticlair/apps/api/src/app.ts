import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import type { IncomingMessage, ServerResponse } from "node:http";
import helmetImport, { type HelmetOptions } from "helmet";
import { AUTH_BASE_PATH, type Auth } from "./modules/identity/index.js";
import type { AppConfig } from "./platform/config/config.js";
import { ErrorFilter } from "./platform/http/error.filter.js";
import { requestContextMiddleware } from "./platform/http/request-context.middleware.js";
import { NestPinoLogger, type AppLogger } from "./platform/logging/logger.js";
import { AUTH, CONFIG, LOGGER } from "./platform/tokens.js";

type Helmet = (
  options?: Readonly<HelmetOptions>,
) => (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void;
// helmet publie des types CJS et ESM : selon le compilateur (celui de Vercel
// notamment), l'import par défaut est la fonction ou l'objet qui la contient.
const helmet = ((helmetImport as unknown as { default?: Helmet }).default ?? helmetImport) as Helmet;

/**
 * Configure une application Nest créée avec `bodyParser: false`.
 * Partagé entre main.ts et les tests d'intégration : ce qui est testé est
 * exactement ce qui est déployé.
 *
 * Ordre important : les routes d'authentification (Better Auth) lisent
 * elles-mêmes le corps de la requête ; elles sont donc montées AVANT le
 * parseur JSON de l'API.
 */
export function configureApp(app: INestApplication): void {
  const express = app as NestExpressApplication;
  const config = app.get<AppConfig>(CONFIG);
  const logger = app.get<AppLogger>(LOGGER);
  const auth = app.get<Auth>(AUTH);

  app.useLogger(new NestPinoLogger(logger));
  express.disable("x-powered-by");
  express.set("trust proxy", 1);
  app.use(helmet());
  app.enableCors({ origin: config.webAppUrl, credentials: true });
  app.use(requestContextMiddleware(logger));
  express.getHttpAdapter().getInstance().all(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(auth));
  express.useBodyParser("json", { limit: "1mb" });
  app.useGlobalFilters(new ErrorFilter(logger));
  app.enableShutdownHooks();
}
