import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { GroupeService } from "../application/groupe.service.js";

const date = z.iso.date().transform((s) => new Date(`${s}T00:00:00Z`));

const propositionBody = z.object({
  articles: z.array(z.string().min(1).max(300)).min(1).max(500),
  fenetre: z.object({ tot: date, tard: date }),
  statut: z.enum(["signe", "en_attente"]),
  engagement: z.boolean().default(false),
});
const signerBody = z.object({ engagement: z.boolean() });
const problemeBody = z.object({ probleme: z.string().trim().min(1).max(1000) });
const referenceBody = z.object({ prixReference: z.number().nonnegative().max(1_000_000).nullable() });

/**
 * BatiClair Groupé, étape 2 : l'entrée du besoin ; étape 6 : les offres. Toutes les routes répondent 404 tant que le drapeau `GROUPE` n'est pas
 * à `on` : le groupé n'existe pas pour l'application.
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class GroupeController {
  constructor(
    @Inject(GroupeService) private readonly groupe: GroupeService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private actif() {
    if (!this.config.groupe.enabled) throw notFound("Route");
  }

  /** L'accès au groupé de l'entreprise : ouvert, ou pourquoi pas (SIRET ; gratuit pour l'artisan, aucune condition d'abonnement). */
  @Get("groupe")
  async etat(@Tenant() tenant: TenantContext) {
    this.actif();
    return this.groupe.etat(tenant);
  }

  @Post("groupe/siret")
  @HttpCode(200)
  async verifierSiret(@Tenant() tenant: TenantContext) {
    this.actif();
    return this.groupe.verifierSiret(tenant);
  }

  @Get("projects/:projectId/groupe")
  async besoins(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    this.actif();
    return { besoins: await this.groupe.besoinsDuChantier(tenant, projectId) };
  }

  @Post("projects/:projectId/groupe")
  @HttpCode(201)
  async proposer(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Body(new ZodPipe(propositionBody)) body: z.infer<typeof propositionBody>) {
    this.actif();
    const { tot, tard } = body.fenetre;
    if (!tot || !tard) throw validationFailed("Invalid delivery window", { reason: "fenetre_invalide" });
    return { besoins: await this.groupe.proposer(tenant, projectId, { ...body, fenetre: { tot, tard } }) };
  }

  @Post("groupe/besoins/:id/signer")
  @HttpCode(200)
  async signer(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(signerBody)) body: z.infer<typeof signerBody>) {
    this.actif();
    return this.groupe.signer(tenant, id, body.engagement);
  }

  /** Étape 6 : mes offres (information seulement), « Problème », prix de référence pour l'économie. */
  @Get("groupe/offres")
  async offres(@Tenant() tenant: TenantContext) {
    this.actif();
    return { offres: await this.groupe.mesOffres(tenant) };
  }

  @Post("groupe/offres/:offreId/probleme")
  @HttpCode(200)
  async probleme(@Tenant() tenant: TenantContext, @Param("offreId") offreId: string, @Body(new ZodPipe(problemeBody)) body: z.infer<typeof problemeBody>) {
    this.actif();
    return this.groupe.signalerProbleme(tenant, offreId, body.probleme);
  }

  @Post("groupe/offres/:offreId/reference")
  @HttpCode(200)
  async reference(@Tenant() tenant: TenantContext, @Param("offreId") offreId: string, @Body(new ZodPipe(referenceBody)) body: z.infer<typeof referenceBody>) {
    this.actif();
    return this.groupe.declarerReference(tenant, offreId, body.prixReference);
  }

  @Delete("groupe/besoins/:id")
  @HttpCode(200)
  async retirer(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    this.actif();
    return this.groupe.retirer(tenant, id);
  }
}
