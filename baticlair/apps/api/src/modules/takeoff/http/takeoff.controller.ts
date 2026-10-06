import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Res, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { TakeoffService } from "../application/takeoff.service.js";
import { takeoffDto as toDto } from "./takeoff-dto.js";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

const lineBody = z.object({
  designation: z.string().trim().min(1).max(300),
  quantity: optionalText(40),
  unit: optionalText(20),
  reference: optionalText(80),
});

const uuidList = z.array(z.string().uuid()).max(500);
const decisionBody = z.object({
  action: z.enum(["pieces", "keep"]),
  lineIds: uuidList.min(1),
  pieceLineIds: uuidList.default([]),
});
const answerBody = z
  .object({
    // « role:<ligne> » : l'artisan tranche une ambiguïté (« 6 : ardoises ou jouées ? »).
    // « libelle:<ligne> » et « quantite:<ligne> » : l'artisan réécrit une ligne du quantitatif (§41.4).
    // « ajout:<article> » : « On ajoute ? » (§45.8), oui ou non. « precision:<article> », « retire:<article> » : l'aperçu (§45.9).
    // « ratio:<article> » : « C'est bon » sur une quantité à confirmer (règle « à vérifier », écart devis / calcul).
    key: z.string().regex(/^(?:(?:product|param):[a-z0-9_]{1,40}|role:[0-9a-f-]{36}|(?:libelle|quantite|ajout|precision|retire):.{1,200}|precise:[0-9a-f-]{36}|ratio:.{1,300})$/),
    value: z.union([
      z.string().trim().max(120),
      z.object({ value: z.string().trim().regex(/^\d+(?:[.,]\d+)?$/), unit: z.string().trim().min(1).max(30) }),
      z.null(),
    ]),
  })
  .refine((b) => !b.key.startsWith("role:") || b.value === "measure" || b.value === "purchase", { message: "role answer must be measure or purchase" })
  .refine((b) => !b.key.startsWith("ajout:") || b.value === "oui" || b.value === "non", { message: "ajout answer must be oui or non" });

const fields = (b: z.infer<typeof lineBody>) => ({
  designation: b.designation,
  quantityRaw: b.quantity,
  unitRaw: b.unit,
  reference: b.reference,
});

@Controller("v1")
@UseGuards(TenantGuard)
export class TakeoffController {
  constructor(@Inject(TakeoffService) private readonly takeoffs: TakeoffService) {}

  /** Lance la lecture du devis client par l'IA (ou renvoie la liste déjà préparée, sans nouveau coût). */
  @Throttle({ default: HOURLY(30) })
  @Post("documents/:id/takeoff")
  async extract(@Tenant() tenant: TenantContext, @Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    // Liste prête dans le délai : 201 et la liste. Lecture longue : 202, elle continue (audit B3).
    const started = await this.takeoffs.start(tenant, id);
    if (started.state === "reading") {
      res.status(202);
      return { reading: { status: "reading", reason: null } };
    }
    res.status(201);
    return toDto(started.result);
  }

  @Get("projects/:projectId/takeoff")
  async forProject(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    const result = await this.takeoffs.forProject(tenant, projectId);
    const reading = result ? null : await this.takeoffs.readingState(tenant, projectId);
    return { takeoff: result ? toDto(result) : null, aiAvailable: this.takeoffs.aiAvailable, reading };
  }

  @Patch("takeoff-lines/:id")
  async updateLine(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(lineBody)) body: z.infer<typeof lineBody>) {
    return toDto(await this.takeoffs.updateLine(tenant, id, fields(body)));
  }

  /** « C'est bon » : ligne douteuse vérifiée par l'artisan, gardée telle quelle. */
  @Post("takeoff-lines/:id/confirm")
  @HttpCode(200)
  async confirmLine(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return toDto(await this.takeoffs.confirmLine(tenant, id));
  }

  @Delete("takeoff-lines/:id")
  async deleteLine(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return toDto(await this.takeoffs.deleteLine(tenant, id));
  }

  @Post("takeoffs/:id/lines")
  @HttpCode(201)
  async addLine(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body(new ZodPipe(lineBody.extend({ depuisApercu: z.boolean().optional() }))) body: z.infer<typeof lineBody> & { depuisApercu?: boolean },
  ) {
    // « + Ajouter une ligne » de l'aperçu avant envoi (§45.9) : la liste validée le reste.
    return toDto(await this.takeoffs.addLine(tenant, id, fields(body), { keepStatus: body.depuisApercu === true }));
  }

  /** Une décision qui règle plusieurs lignes en un geste (« Oui, à la pièce », « Oui, tels qu'écrits »). */
  @Post("takeoffs/:id/decisions")
  @HttpCode(200)
  async decide(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(decisionBody)) body: z.infer<typeof decisionBody>) {
    return toDto(await this.takeoffs.decide(tenant, id, body));
  }

  /** Réponse à une question du calcul (produit, donnée du chantier), pour ce chantier. */
  @Post("takeoffs/:id/answers")
  @HttpCode(200)
  async answer(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(answerBody)) body: z.infer<typeof answerBody>) {
    const value = body.value && typeof body.value === "object" ? { value: body.value.value.replace(",", "."), unit: body.value.unit } : body.value;
    return toDto(await this.takeoffs.answer(tenant, id, body.key, value));
  }

  @Post("takeoffs/:id/validate")
  @HttpCode(200)
  async validate(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return toDto(await this.takeoffs.validate(tenant, id));
  }

  @Post("takeoffs/:id/reopen")
  @HttpCode(200)
  async reopen(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return toDto(await this.takeoffs.reopen(tenant, id));
  }
}
