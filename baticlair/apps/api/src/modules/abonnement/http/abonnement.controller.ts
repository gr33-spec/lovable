import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AbonnementService } from "../application/abonnement.service.js";
import { signatureStripeValide } from "../infrastructure/stripe.js";

const simulationBody = z.object({ issue: z.enum(["payer", "echec"]) });
/** La formule choisie ; sans corps (anciens écrans), le mensuel. */
const payerBody = z.object({ formule: z.enum(["mensuel", "annuel"]).optional() }).optional();
const tvaBody = z.object({ tvaIntra: z.string().trim().max(20).nullable() });

/** L'instant de la requête ; `?maintenant=` seulement en test. */
const instant = (config: AppConfig, m?: string) => (config.env === "test" && m && !Number.isNaN(Date.parse(m)) ? new Date(m) : new Date());

/** « Mon abonnement » : l'état, payer (simulé ou Stripe), résilier, le n° de TVA, les factures. */
@Controller("v1/abonnement")
@UseGuards(TenantGuard)
export class AbonnementController {
  constructor(
    @Inject(AbonnementService) private readonly abonnement: AbonnementService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  vue(@Tenant() tenant: TenantContext, @Query("maintenant") m?: string) {
    return this.abonnement.vue(tenant, instant(this.config, m));
  }

  @Post("payer")
  @HttpCode(200)
  payer(@Tenant() tenant: TenantContext, @Body(new ZodPipe(payerBody)) body: z.infer<typeof payerBody>) {
    return this.abonnement.commencerPaiement(tenant, body?.formule ?? "mensuel");
  }

  /** Du mensuel à l'annuel, au prorata. */
  @Post("annuel")
  @HttpCode(200)
  annuel(@Tenant() tenant: TenantContext, @Query("maintenant") m?: string) {
    return this.abonnement.basculerAnnuel(tenant, instant(this.config, m));
  }

  /** La formule d'une session simulée : la page « Paiement (simulation) » dit le bon prix. */
  @Get("simulation/:session")
  async session(@Tenant() tenant: TenantContext, @Param("session") session: string) {
    return { formule: await this.abonnement.formuleDeSession(tenant, session) };
  }

  @Post("simulation/:session")
  @HttpCode(200)
  simuler(@Tenant() tenant: TenantContext, @Param("session") session: string, @Body(new ZodPipe(simulationBody)) body: z.infer<typeof simulationBody>, @Query("maintenant") m?: string) {
    return this.abonnement.simuler(tenant, session, body.issue, instant(this.config, m));
  }

  @Post("resilier")
  @HttpCode(200)
  resilier(@Tenant() tenant: TenantContext, @Query("maintenant") m?: string) {
    return this.abonnement.resilier(tenant, instant(this.config, m));
  }

  @Post("portail")
  @HttpCode(200)
  portail(@Tenant() tenant: TenantContext) {
    return this.abonnement.portail(tenant);
  }

  @Put("tva")
  tva(@Tenant() tenant: TenantContext, @Body(new ZodPipe(tvaBody)) body: z.infer<typeof tvaBody>) {
    return this.abonnement.majTva(tenant, body.tvaIntra || null);
  }

  @Get("factures")
  async factures(@Tenant() tenant: TenantContext) {
    return { factures: await this.abonnement.factures(tenant) };
  }

  @Get("factures/:id/pdf")
  async facture(@Tenant() tenant: TenantContext, @Param("id") id: string, @Res() res: Response) {
    const f = await this.abonnement.facturePdf(tenant, id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${f.nom}"`);
    res.send(Buffer.from(f.pdf));
  }
}

/** Le webhook Stripe (signé) et la tâche horaire (renouvellements simulés, fins de résiliation, rappels d'essai). */
@Controller("v1")
export class AbonnementPublicController {
  constructor(
    @Inject(AbonnementService) private readonly abonnement: AbonnementService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(3600) })
  @Post("abonnement/stripe/webhook")
  @HttpCode(200)
  async webhook(@Req() req: { rawBody?: Buffer; body?: unknown }, @Headers("stripe-signature") signature: string | undefined) {
    const stripe = this.config.abonnement.stripe;
    if (!stripe || this.config.abonnement.paiement !== "stripe") throw notFound("Route");
    if (!req.rawBody || !signatureStripeValide(stripe.webhookSecret, signature, req.rawBody)) throw forbidden("Webhook signature");
    const evt = req.body as { id: string; type: string; data: { object: Record<string, unknown> } };
    return this.abonnement.webhookStripe(evt);
  }

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get("internal/abonnement")
  async tache(@Headers("authorization") authorization: string | undefined, @Query("maintenant") m?: string) {
    const secret = this.config.cronSecret;
    if (!secret || authorization !== `Bearer ${secret}`) throw forbidden("Scheduled task only");
    return this.abonnement.tache(instant(this.config, m));
  }
}
