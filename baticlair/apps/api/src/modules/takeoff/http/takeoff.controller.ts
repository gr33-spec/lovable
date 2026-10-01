import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { TakeoffService, type ReviewedTakeoff } from "../application/takeoff.service.js";
import { artisanNotes } from "../../../platform/ai/artisan-notes.js";

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

function toDto({ takeoff, validation }: ReviewedTakeoff) {
  const byId = new Map(validation.lines.map((v) => [v.lineId, v]));
  return {
    id: takeoff.id,
    projectId: takeoff.projectId,
    documentId: takeoff.documentId,
    status: takeoff.status,
    model: takeoff.model,
    promptVersion: takeoff.promptVersion,
    notes: artisanNotes(takeoff.notes),
    createdAt: takeoff.createdAt.toISOString(),
    validatedAt: takeoff.validatedAt?.toISOString() ?? null,
    counts: validation.counts,
    issues: validation.issues.map((i) => ({ code: i.code, severity: i.severity, message: i.message, lineIds: i.lineIds ?? [] })),
    lines: takeoff.lines.map((l) => {
      const v = byId.get(l.id);
      return {
        id: l.id,
        position: l.position,
        designation: l.designation,
        quantity: l.quantityRaw,
        unit: l.unitRaw,
        reference: l.reference,
        sourceRefs: l.sourceRefs,
        sourcePages: l.sourcePages,
        section: l.section,
        origin: l.origin,
        edited: l.edited,
        aiDoubt: l.aiDoubt,
        confirmed: l.confirmed,
        kind: v?.kind ?? "unknown",
        family: v?.familyLabel ?? null,
        basis: v?.basis ?? "purchase",
        status: v?.status ?? "to_verify",
        issues: (v?.issues ?? []).map((i) => ({ code: i.code, severity: i.severity, message: i.message })),
      };
    }),
  };
}

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
  @Post("documents/:id/takeoff")
  @HttpCode(201)
  async extract(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return toDto(await this.takeoffs.extract(tenant, id));
  }

  @Get("projects/:projectId/takeoff")
  async forProject(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    const result = await this.takeoffs.forProject(tenant, projectId);
    return { takeoff: result ? toDto(result) : null, aiAvailable: this.takeoffs.aiAvailable };
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
  async addLine(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(lineBody)) body: z.infer<typeof lineBody>) {
    return toDto(await this.takeoffs.addLine(tenant, id, fields(body)));
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
