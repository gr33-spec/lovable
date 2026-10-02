import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import type { ArtisanView } from "@baticlair/domain";
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

/**
 * Ce que reçoit l'écran : compteurs, décisions, ouvrages demandés pour leur
 * mesure, et pour chaque élément sa PREUVE (« Voir le calcul ») — critères et
 * origines, calcul détaillé pour un besoin calculé. Aucun pourcentage.
 */
function viewDto(view: ArtisanView) {
  return {
    counts: { verified: view.counts.verified, toConfirm: view.counts.to_confirm, missing: view.counts.missing },
    decisions: view.decisions.map((d) => ({
      key: d.key,
      state: d.state === "to_confirm" ? "to_confirm" : "missing",
      title: d.title,
      text: d.text,
      lineIds: d.lineIds,
      pieceLineIds: d.pieceLineIds ?? [],
      primary: d.primary,
      secondary: d.secondary,
      question: d.question
        ? { key: d.question.key, kind: d.question.kind, unit: d.question.unit ?? null, hint: d.question.hint ?? null, options: d.question.options ?? [] }
        : null,
    })),
    measures: view.measures,
    // Les trois niveaux, ligne par ligne : lu dans le devis → il faut → à commander.
    ouvrages: view.ouvrages.map((o) => ({
      lineId: o.lineId,
      designation: o.designation,
      role: o.role,
      read: o.read,
      needs: o.needs.map((n) => ({
        slot: n.slot,
        label: n.label,
        origin: n.origin,
        need: n.need,
        needRange: n.needRange,
        order: n.order,
        missing: n.missing,
        provisional: n.provisional,
        usual: n.usual,
        state: n.state,
      })),
      direct: o.direct,
      pending: o.pending,
      state: o.state,
    })),
    items: view.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      label: i.label,
      quantity: i.quantity,
      state: i.state === "to_confirm" ? "to_confirm" : i.state,
      reason: i.reason,
      proof: i.assessment.criteria.map((c) => ({ key: c.key, status: c.status, detail: c.detail, origin: c.origin ?? null, comparisonRisk: c.comparisonRisk ?? false })),
      calculation: i.need
        ? {
            slot: i.need.slot,
            formula: i.need.formula ?? null,
            exclusions: i.need.exclusions ?? null,
            productOrigin: i.need.productOrigin ?? null,
            trace: i.need.trace.map((t) => ({ label: t.label, value: t.value, unit: t.unit, from: t.from, origin: t.origin ?? null, url: t.url ?? null })),
          }
        : null,
    })),
  };
}

function toDto({ takeoff, validation, view, roles }: ReviewedTakeoff) {
  const byId = new Map(validation.lines.map((v) => [v.lineId, v]));
  return {
    id: takeoff.id,
    projectId: takeoff.projectId,
    documentId: takeoff.documentId,
    status: takeoff.status,
    view: viewDto(view),
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
        role: roles.get(l.id)?.role ?? null,
        roleWhy: roles.get(l.id)?.why ?? null,
        status: v?.status ?? "to_verify",
        issues: (v?.issues ?? []).map((i) => ({ code: i.code, severity: i.severity, message: i.message })),
      };
    }),
  };
}

const uuidList = z.array(z.string().uuid()).max(500);
const decisionBody = z.object({
  action: z.enum(["pieces", "keep"]),
  lineIds: uuidList.min(1),
  pieceLineIds: uuidList.default([]),
});
const answerBody = z
  .object({
    // « role:<ligne> » : l'artisan tranche une ambiguïté (« 6 : ardoises ou jouées ? »).
    key: z.string().regex(/^(?:(?:product|param):[a-z0-9_]{1,40}|role:[0-9a-f-]{36})$/),
    value: z.union([
      z.string().trim().max(120),
      z.object({ value: z.string().trim().regex(/^\d+(?:[.,]\d+)?$/), unit: z.string().trim().min(1).max(10) }),
      z.null(),
    ]),
  })
  .refine((b) => !b.key.startsWith("role:") || b.value === "measure" || b.value === "purchase", { message: "role answer must be measure or purchase" });

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
