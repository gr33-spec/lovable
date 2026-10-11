import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import type { Alerter } from "../../../platform/alerts/alerter.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import type { AppLogger } from "../../../platform/logging/logger.js";
import { ALERTER, LOGGER } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";

const body = z.object({
  message: z.string().min(1).max(5000),
  digest: z.string().max(100).optional(),
  path: z.string().max(2000).optional(),
});

/** Jamais de donnée de client dans une alerte : ni e-mail, ni numéro, ni identifiant, ni paramètre d'adresse. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "<e-mail>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\d[\d .-]{5,}\d/g, "<nombre>");
}

/**
 * ERREURS DU NAVIGATEUR (audit avant commercialisation, 2026-10-11) : quand un écran casse chez un artisan, l'application
 * le signale ici ; l'équipe est prévenue par le canal des alertes (B5, au plus une fois toutes les 10 minutes).
 */
@Controller("v1/client-errors")
export class ClientErrorsController {
  constructor(
    @Inject(ALERTER) private readonly alerter: Alerter,
    @Inject(LOGGER) private readonly logger: AppLogger,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post()
  @HttpCode(204)
  report(@Body(new ZodPipe(body)) b: z.infer<typeof body>): void {
    const path = scrub((b.path ?? "").split(/[?#]/)[0]!).slice(0, 120);
    const message = scrub(b.message).slice(0, 240);
    const text = `${message} (écran ${path || "?"}${b.digest ? `, réf. ${scrub(b.digest).slice(0, 20)}` : ""})`;
    this.logger.error({ path, digest: b.digest }, `erreur navigateur : ${message}`);
    this.alerter.alert("client_error", text);
  }
}
