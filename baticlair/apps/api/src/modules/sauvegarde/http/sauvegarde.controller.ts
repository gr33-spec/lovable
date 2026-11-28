import { Body, Controller, Get, Headers, HttpCode, Inject, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { JetonRefuse, verifierJetonGithub, type LireCles } from "../application/jeton-github.js";
import { SauvegardeService } from "../application/sauvegarde.service.js";

export const LECTEUR_CLES_GITHUB = Symbol("LECTEUR_CLES_GITHUB");

const entier = z.number().int().min(0).max(2_000_000_000).optional();
const rapport = z.object({ statut: z.enum(["reussie", "echec"]), etape: z.string().trim().max(120).optional(), tables: entier, lignes: entier, octets: entier });

/**
 * La sauvegarde nocturne dit son résultat (Greg, 28 novembre 2026). `POST /v1/internal/sauvegarde` : seulement avec le
 * jeton signé de GitHub de l'exécution du workflow « Sauvegarde de la base » de notre dépôt (`jeton-github.ts`) ; sans
 * lui, refusé. `GET /v1/internal/sauvegarde/veille` : la veille quotidienne (tâche planifiée, CRON_SECRET).
 */
@Controller("v1/internal/sauvegarde")
export class SauvegardeInterneController {
  constructor(
    @Inject(SauvegardeService) private readonly service: SauvegardeService,
    @Inject(LECTEUR_CLES_GITHUB) private readonly cles: LireCles,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post()
  @HttpCode(200)
  async rapport(@Headers("authorization") authorization: string | undefined, @Body(new ZodPipe(rapport)) corps: z.infer<typeof rapport>) {
    const jeton = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    let atteste;
    try {
      atteste = await verifierJetonGithub(jeton, this.cles);
    } catch (e) {
      if (e instanceof JetonRefuse) throw forbidden("GitHub workflow token required");
      throw e;
    }
    return this.service.recevoir({ statut: corps.statut, etape: corps.etape, tables: corps.tables, lignes: corps.lignes, octets: corps.octets }, atteste);
  }

  @Public()
  @Throttle({ default: HOURLY(60) })
  @Get("veille")
  async veille(@Headers("authorization") authorization: string | undefined) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.service.veille();
  }
}

/** Pour la carte « Santé » de l'admin (à venir) : l'état de la sauvegarde, réservé à l'équipe, double authentification comprise. */
@Controller("v1/admin/sauvegarde")
export class SauvegardeAdminController {
  constructor(
    @Inject(SauvegardeService) private readonly service: SauvegardeService,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
  ) {}

  @Get()
  async etat(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.service.etat();
  }
}
