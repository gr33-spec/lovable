import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden } from "../../../platform/errors/domain-error.js";
import { Idempotent } from "../../../platform/http/idempotency.interceptor.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { CurrentUser, Public, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../../pilotage/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { AchatsGroupesV1Service } from "../application/achats-groupes-v1.service.js";

const jour = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));
const attributs = z.record(z.string().max(40), z.string().trim().max(60));
const reception = z.enum(["livraison", "retrait"]);
const compatibiliteBody = z.object({ type: z.string().min(1).max(40), attributs, reception, dateBesoin: jour });
const besoinBody = z.object({
  type: z.string().min(1).max(40),
  attributs,
  quantite: z.number().positive().max(10_000_000),
  unite: z.string().min(1).max(20),
  parUnite: z.number().positive().max(1_000_000).nullable().optional(),
  conversionConfirmee: z.boolean().optional(),
  reception,
  lieu: z.string().trim().min(3).max(300),
  contraintes: z.string().trim().max(300).nullable().optional(),
  dateBesoin: jour,
  achatId: z.uuid().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  articleKey: z.string().min(1).max(200).nullable().optional(),
});
const confirmerBody = z.object({ besoins: z.array(besoinBody).min(1).max(30), confirmation: z.boolean(), cleIdempotence: z.string().min(8).max(80) });
const quantiteBody = z.object({ quantite: z.number().positive().max(10_000_000), parUnite: z.number().positive().max(1_000_000).nullable().optional(), conversionConfirmee: z.boolean().optional() });
const dateBody = z.object({ dateBesoin: jour });
const retraitBody = z.object({ motif: z.enum(["annule", "autrement", "autre"]), precision: z.string().trim().max(300).nullable().optional() });
const habilitationBody = z.object({ role: z.enum(["dirigeant", "autorise"]) });
const lotBody = z.object({ lot: z.string().min(1).max(30) });
const preparationBody = z.object({ heures: z.number().int().min(1).max(500).optional() });
const clotureBody = z.object({ avantLHeure: z.boolean().optional() });
const texte = z.string().trim().max(300).nullable();
const offreBody = z.object({
  fournisseur: texte,
  prixUnitaireHt: z.number().positive().max(1_000_000).nullable(),
  livraisonHt: z.number().min(0).max(1_000_000).nullable(),
  tvaPct: z.number().min(0).max(30).optional(),
  delai: texte,
  lieu: texte,
  paiement: texte,
  validite: texte,
  annulation: texte,
});

/** ACHATS GROUPÉS V1 (V5.2), côté artisan : tout passe par l'entreprise courante (isolation stricte). */
@Controller("v1/ag")
@UseGuards(TenantGuard)
export class AchatsGroupesV1Controller {
  constructor(@Inject(AchatsGroupesV1Service) private readonly ag: AchatsGroupesV1Service) {}

  @Get("etat")
  etat(@Tenant() t: TenantContext) {
    return this.ag.etat(t);
  }

  @Post("habilitation")
  @HttpCode(200)
  habilitation(@Tenant() t: TenantContext, @Body(new ZodPipe(habilitationBody)) b: z.infer<typeof habilitationBody>) {
    return this.ag.declarerHabilitation(t, b.role);
  }

  @Get("achats")
  achats(@Tenant() t: TenantContext, @Query("lot") lot?: string) {
    return this.ag.achatsOuverts(t, lot ?? null);
  }

  @Post("compatibilite")
  @HttpCode(200)
  compatibilite(@Tenant() t: TenantContext, @Body(new ZodPipe(compatibiliteBody)) b: z.infer<typeof compatibiliteBody>) {
    return this.ag.compatibilite(t, { type: b.type, attributs: b.attributs, reception: b.reception, dateBesoin: b.dateBesoin! });
  }

  @Post("besoins")
  @Idempotent()
  confirmer(@Tenant() t: TenantContext, @Body(new ZodPipe(confirmerBody)) b: z.infer<typeof confirmerBody>) {
    return this.ag.confirmer(t, {
      confirmation: b.confirmation,
      cleIdempotence: b.cleIdempotence,
      besoins: b.besoins.map((x) => ({ ...x, dateBesoin: x.dateBesoin!, parUnite: x.parUnite ?? null, conversionConfirmee: x.conversionConfirmee === true, contraintes: x.contraintes ?? null, achatId: x.achatId ?? null, projectId: x.projectId ?? null, articleKey: x.articleKey ?? null })),
    });
  }

  @Get("besoins")
  mesBesoins(@Tenant() t: TenantContext) {
    return this.ag.mesBesoins(t);
  }

  @Get("actions")
  async actions(@Tenant() t: TenantContext) {
    this.ag.exigerActif();
    return { items: await this.ag.actions(t) };
  }

  @Get("besoins/:id")
  besoin(@Tenant() t: TenantContext, @Param("id") id: string) {
    this.ag.exigerActif();
    return this.ag.vueBesoin(t, id);
  }

  @Post("besoins/:id/quantite")
  @HttpCode(200)
  @Idempotent()
  quantite(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(quantiteBody)) b: z.infer<typeof quantiteBody>) {
    return this.ag.modifierQuantite(t, id, { quantite: b.quantite, parUnite: b.parUnite ?? null, conversionConfirmee: b.conversionConfirmee === true });
  }

  @Post("besoins/:id/date")
  @HttpCode(200)
  @Idempotent()
  date(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(dateBody)) b: z.infer<typeof dateBody>) {
    return this.ag.modifierDate(t, id, b.dateBesoin!);
  }

  @Post("besoins/:id/retrait")
  @HttpCode(200)
  @Idempotent()
  retrait(@Tenant() t: TenantContext, @Param("id") id: string, @Body(new ZodPipe(retraitBody)) b: z.infer<typeof retraitBody>) {
    return this.ag.retirer(t, id, b.motif, b.precision ?? null);
  }

  @Post("besoins/:id/reconfirmation")
  @HttpCode(200)
  @Idempotent()
  reconfirmer(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.ag.reconfirmer(t, id);
  }

  @Post("besoins/:id/confirmation")
  @HttpCode(200)
  @Idempotent()
  confirmerIndicatif(@Tenant() t: TenantContext, @Param("id") id: string) {
    return this.ag.confirmerIndicatif(t, id);
  }

  @Get("projects/:projectId/lignes")
  lignes(@Tenant() t: TenantContext, @Param("projectId") projectId: string) {
    return this.ag.lignesDuQuantitatif(t, projectId);
  }

  @Put("projects/:projectId/lignes/:key/lot")
  lot(@Tenant() t: TenantContext, @Param("projectId") projectId: string, @Param("key") key: string, @Body(new ZodPipe(lotBody)) b: z.infer<typeof lotBody>) {
    return this.ag.corrigerLot(t, projectId, key, b.lot);
  }
}

/** L'admin Mobiiz (double authentification) : préparer, clôturer, saisir l'offre. Aucun envoi réel aux négoces. */
@Controller("v1/admin/ag")
export class AchatsGroupesV1AdminController {
  constructor(
    @Inject(AchatsGroupesV1Service) private readonly ag: AchatsGroupesV1Service,
    @Inject(PilotageService) private readonly pilotage: PilotageService,
  ) {}

  @Get("achats")
  async liste(@CurrentUser() u: AuthenticatedUser) {
    await this.pilotage.exiger(u);
    return this.ag.adminListe();
  }

  @Post("achats/:id/preparation")
  @HttpCode(200)
  async preparer(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(preparationBody)) b: z.infer<typeof preparationBody>) {
    await this.pilotage.exiger(u);
    await this.pilotage.journal(u, "ag_preparation", id);
    return this.ag.preparer(id, b.heures);
  }

  @Post("achats/:id/cloture")
  @HttpCode(200)
  async cloturer(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(clotureBody)) b: z.infer<typeof clotureBody>) {
    await this.pilotage.exiger(u);
    await this.pilotage.journal(u, "ag_cloture", id);
    return this.ag.cloturer(id, { avantLHeure: b.avantLHeure === true });
  }

  @Put("achats/:id/offre")
  async offre(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(offreBody)) b: z.infer<typeof offreBody>) {
    await this.pilotage.exiger(u);
    await this.pilotage.journal(u, "ag_offre", id);
    return this.ag.saisirOffre(id, {
      fournisseur: b.fournisseur ?? null,
      prixUnitaireHt: b.prixUnitaireHt ?? null,
      livraisonHt: b.livraisonHt ?? null,
      ...(b.tvaPct !== undefined ? { tvaPct: b.tvaPct } : {}),
      delai: b.delai ?? null,
      lieu: b.lieu ?? null,
      paiement: b.paiement ?? null,
      validite: b.validite ?? null,
      annulation: b.annulation ?? null,
    });
  }

  @Post("achats/:id/renegociation")
  @HttpCode(200)
  async renegocier(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(u);
    await this.pilotage.journal(u, "ag_renegociation", id);
    return this.ag.renegocier(id);
  }

  @Post("achats/:id/annulation")
  @HttpCode(200)
  async annuler(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    await this.pilotage.exiger(u);
    await this.pilotage.journal(u, "ag_annulation", id);
    return this.ag.annuler(id);
  }
}

/** La tâche planifiée des rappels (secret de la tâche). */
@Controller("v1/internal")
export class AchatsGroupesV1TacheController {
  constructor(
    @Inject(AchatsGroupesV1Service) private readonly ag: AchatsGroupesV1Service,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get("achats-groupes-v1/rappels")
  rappels(@Headers("authorization") authorization: string | undefined) {
    if (!this.config.cronSecret || authorization !== `Bearer ${this.config.cronSecret}`) throw forbidden("Scheduled task only");
    return this.ag.rappels();
  }
}
