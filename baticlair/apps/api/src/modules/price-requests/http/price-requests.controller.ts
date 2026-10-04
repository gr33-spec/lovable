import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { z } from "zod";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import { Idempotent } from "../../../platform/http/idempotency.interceptor.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { assembleQuote } from "../../documents/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { PriceRequestsService, type PriceRequestView } from "../application/price-requests.service.js";
import { packetDocument } from "../application/supplier-packet.js";

const supplierIds = z.array(z.string()).min(1).max(20);
const settingsBody = z.object({ attachQuoteDetail: z.boolean() });
const createBody = z.object({
  supplierIds,
  message: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => (v ? v : null)),
  dueDate: z.iso
    .date()
    .nullish()
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null)),
});
const addBody = z.object({ supplierIds });
const previewBody = createBody.omit({ supplierIds: true }).extend({ destinataire: z.string().trim().max(200).nullish() });
const statusBody = z.object({
  status: z.enum(["to_send", "sent", "declined"]),
});
const classifyBody = z.object({ classified: z.boolean(), retainedSupplierIds: z.array(z.string()).max(20).optional() });

/** Plafond technique de réception ; la limite métier est vérifiée par le service des documents. */
const HARD_MAX_UPLOAD_BYTES = 50_000_000;
/** Un devis photographié page par page. */
const MAX_QUOTE_PHOTOS = 10;

export function toDto(r: PriceRequestView) {
  return {
    id: r.id,
    projectId: r.projectId,
    lines: r.lines,
    message: r.message,
    dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
    createdAt: r.createdAt.toISOString(),
    classifiedAt: r.classifiedAt?.toISOString() ?? null,
    retainedSupplierIds: r.retainedSupplierIds,
    packet: r.packet
      ? {
          entreprise: r.packet.entreprise,
          chantier: r.packet.chantier,
          articles: r.packet.articles,
          a_chiffrer: r.packet.a_chiffrer,
          resume: r.packet.resume,
          detail: r.packet.joindre_detail ? r.packet.detail : [],
          joindre_detail: r.packet.joindre_detail,
          croquis: r.packet.croquis ?? [],
          fournitures: r.packet.fournitures ?? [],
        }
      : null,
    /** Le document tel que le fournisseur le reçoit (§45.3), pour l'afficher sans le PDF. */
    document: r.packet ? packetDocument(r.packet) : null,
    recipients: r.recipients.map((x) => ({
      id: x.id,
      supplier: x.supplier,
      status: x.status,
      sentAt: x.sentAt?.toISOString() ?? null,
      document: x.document,
      email: r.emails.get(x.id) ?? null,
    })),
  };
}

@Controller("v1")
@UseGuards(TenantGuard)
export class PriceRequestsController {
  constructor(
    @Inject(PriceRequestsService)
    private readonly requests: PriceRequestsService,
  ) {}

  /** Réglages des envois (§42.2) : la case « Joindre le détail du chantier », mémorisée par entreprise. */
  @Get("price-requests/settings")
  async settings(@Tenant() tenant: TenantContext) {
    return { ...(await this.requests.settings(tenant)), deliversEmail: this.requests.deliversEmail };
  }

  @Patch("price-requests/settings")
  async setSettings(@Tenant() tenant: TenantContext, @Body(new ZodPipe(settingsBody)) body: z.infer<typeof settingsBody>) {
    return { ...(await this.requests.setSettings(tenant, body)), deliversEmail: this.requests.deliversEmail };
  }

  /**
   * Le PDF « Demande de devis » (§45.3) d'une demande, pour imprimer ou transmettre au magasin ; `destinataire` = id du
   * destinataire pour son exemplaire. L'ancien chemin `commande.pdf` reste servi (liens déjà partagés).
   */
  @Get(["price-requests/:id/demande-de-devis.pdf", "price-requests/:id/commande.pdf"])
  async pdf(@Tenant() tenant: TenantContext, @Param("id") id: string, @Query("destinataire") recipientId: string | undefined, @Res({ passthrough: true }) res: Response) {
    const pdf = await this.requests.pdf(tenant, id, recipientId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(pdf.bytes);
  }

  /** Envoi par le serveur (§45) : le mail court, le PDF « Demande de devis » joint, puis « envoyée ». */
  @Throttle({ default: HOURLY(60) })
  @Post("price-request-recipients/:id/send")
  @HttpCode(200)
  async send(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return toDto(await this.requests.send(tenant, id));
  }

  /** « Exporter la liste en PDF » (§21.3, §45.9) : la liste validée du chantier, même PDF que celui du fournisseur, aucun prix. */
  @Get(["projects/:projectId/demande-de-devis.pdf", "projects/:projectId/commande.pdf"])
  async exportPdf(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Res({ passthrough: true }) res: Response) {
    const pdf = await this.requests.exportPdf(tenant, projectId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(pdf.bytes);
  }

  @Get("projects/:projectId/price-requests")
  async list(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return {
      items: (await this.requests.listForProject(tenant, projectId)).map(toDto),
    };
  }

  /** L'aperçu avant envoi (§45.9) : le document tel que le fournisseur le recevra, l'objet et le mail. Rien ne part. */
  @Post("projects/:projectId/price-requests/preview")
  @HttpCode(200)
  async preview(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string, @Body(new ZodPipe(previewBody)) body: z.infer<typeof previewBody>) {
    return this.requests.preview(tenant, projectId, { message: body.message ?? null, dueDate: body.dueDate ?? null, destinataire: body.destinataire ?? null });
  }

  @Post("projects/:projectId/price-requests")
  @HttpCode(201)
  @Idempotent()
  async create(
    @Tenant() tenant: TenantContext,
    @Param("projectId") projectId: string,
    @Body(new ZodPipe(createBody)) body: z.infer<typeof createBody>,
  ) {
    const input = { supplierIds: body.supplierIds, message: body.message ?? null, dueDate: body.dueDate ?? null };
    return toDto(await this.requests.create(tenant, projectId, input));
  }

  @Post("price-requests/:id/recipients")
  @HttpCode(200)
  async addSuppliers(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(addBody)) body: z.infer<typeof addBody>) {
    return toDto(await this.requests.addSuppliers(tenant, id, body.supplierIds));
  }

  @Delete("price-requests/:id")
  @HttpCode(204)
  async remove(@Tenant() tenant: TenantContext, @Param("id") id: string): Promise<void> {
    await this.requests.remove(tenant, id);
  }

  /** « Classé » (fournisseurs retenus facultatifs), ou réouverture. */
  @Patch("price-requests/:id/classification")
  async classify(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(classifyBody)) body: z.infer<typeof classifyBody>) {
    return toDto(await this.requests.classify(tenant, id, body.classified, body.retainedSupplierIds ?? []));
  }

  @Patch("price-request-recipients/:id")
  async setStatus(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body(new ZodPipe(statusBody)) body: z.infer<typeof statusBody>,
  ) {
    return toDto(await this.requests.setStatus(tenant, id, body.status));
  }

  /** Devis reçu du fournisseur, déposé à la main : un PDF, ou des photos (une par page). */
  @Throttle({ default: HOURLY(30) })
  @Post("price-request-recipients/:id/quote")
  @HttpCode(201)
  @UseInterceptors(
    FilesInterceptor("file", MAX_QUOTE_PHOTOS, {
      storage: memoryStorage(),
      limits: { fileSize: HARD_MAX_UPLOAD_BYTES, files: MAX_QUOTE_PHOTOS },
    }),
  )
  async attachQuote(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @UploadedFiles() files: { originalname: string; buffer: Buffer }[] | undefined,
  ) {
    if (!files?.length) throw validationFailed("Missing file", [{ path: "file", message: "required" }]);
    const quote = await assembleQuote(
      files.map((file) => ({
        fileName: Buffer.from(file.originalname, "latin1").toString("utf8"),
        bytes: new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength),
      })),
    );
    return toDto(await this.requests.attachQuote(tenant, id, quote));
  }
}
