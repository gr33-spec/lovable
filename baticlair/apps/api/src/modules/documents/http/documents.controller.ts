import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { microUsdToEur } from "@baticlair/domain";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import type { DocumentWithProcessing, PageRecord } from "../application/document.repository.js";
import { DocumentsService } from "../application/documents.service.js";
import { chunkedFields, MAX_PART_BYTES, UploadParts } from "../infrastructure/upload-parts.js";

/** Fichier reçu par multer (stockage en mémoire). */
interface UploadedPdf {
  originalname: string;
  buffer: Buffer;
  size: number;
}

const uploadBody = z.object({ purpose: z.enum(["client_quote", "supplier_quote"]), ...chunkedFields });

/** Plafond technique de réception ; la limite métier (configurable) est vérifiée par le service. */
const HARD_MAX_UPLOAD_BYTES = 50_000_000;

@Controller("v1")
@UseGuards(TenantGuard)
export class DocumentsController {
  constructor(
    @Inject(DocumentsService) private readonly documents: DocumentsService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(UploadParts) private readonly uploads: UploadParts,
  ) {}

  private eur(microUsd: bigint | number): string {
    return microUsdToEur(microUsd, this.config.aiCost.usdToEur).toDecimalPlaces(4).toString();
  }

  private toDto(d: DocumentWithProcessing) {
    const p = d.processing;
    return {
      id: d.id,
      projectId: d.projectId,
      purpose: d.purpose,
      trade: d.trade,
      name: d.originalName,
      sizeBytes: d.sizeBytes,
      pageCount: d.pageCount,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      reading: p
        ? {
            pipelineVersion: p.pipelineVersion,
            status: p.status,
            errorCode: p.errorCode,
            pagesTotal: p.pagesTotal,
            pagesText: p.pagesText,
            pagesVision: p.pagesVision,
            pagesSkipped: p.pagesSkipped,
            /** Estimation haute, sans appel IA. */
            estimatedAiCostEur: this.eur(p.estimatedMicroUsd),
            actualAiCostEur: this.eur(p.actualMicroUsd),
          }
        : null,
    };
  }

  private pageDto(p: PageRecord) {
    return {
      pageNumber: p.pageNumber,
      route: p.route,
      reason: p.reason,
      chars: p.chars,
      metrics: p.metrics,
      lines: p.lines,
    };
  }

  @Throttle({ default: HOURLY(30) })
  @Post("projects/:projectId/documents")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: HARD_MAX_UPLOAD_BYTES, files: 1 } }))
  async upload(
    @Tenant() tenant: TenantContext,
    @Param("projectId") projectId: string,
    @UploadedFile() file: UploadedPdf | undefined,
    @Body(new ZodPipe(uploadBody)) body: z.infer<typeof uploadBody>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const received = await this.uploads.fileOf(tenant, file, body);
    const result = await this.documents.upload(tenant, projectId, { purpose: body.purpose, fileName: received.name, bytes: received.bytes });
    res.status(result.duplicate ? 200 : 201);
    return { ...this.toDto(result.document), duplicate: result.duplicate };
  }

  /** Un morceau d'un fichier trop gros pour une seule requête ; la requête de dépôt nomme ensuite l'envoi. */
  @Put("uploads/:uploadId/parts/:index")
  @HttpCode(204)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: MAX_PART_BYTES + 1, files: 1 } }))
  async part(
    @Tenant() tenant: TenantContext,
    @Param("uploadId") uploadId: string,
    @Param("index") index: string,
    @UploadedFile() file: UploadedPdf | undefined,
  ): Promise<void> {
    if (!file) throw validationFailed("Missing file", [{ path: "file", message: "required" }]);
    await this.uploads.put(tenant, uploadId, Number(index), new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength));
  }

  @Get("projects/:projectId/documents")
  async list(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    const docs = await this.documents.list(tenant, projectId);
    return { items: docs.map((d) => this.toDto(d)) };
  }

  @Get("documents/:id")
  async get(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    const { document, pages } = await this.documents.get(tenant, id);
    return { ...this.toDto(document), pages: pages.map((p) => this.pageDto(p)) };
  }

  @Delete("documents/:id")
  @HttpCode(204)
  async remove(@Tenant() tenant: TenantContext, @Param("id") id: string): Promise<void> {
    await this.documents.remove(tenant, id);
  }

  @Get("documents/:id/file")
  @HttpCode(200)
  async file(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Headers("range") range: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const content = await this.documents.content(tenant, id);
    res.setHeader("Content-Type", content.mimeType);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(content.originalName)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Accept-Ranges", "bytes");
    // Une réponse de fonction Vercel ne dépasse pas 4,5 Mo : un gros fichier se relit par plages (« bytes=0-2999999 »).
    const total = content.bytes.byteLength;
    const wanted = /^bytes=(\d+)-(\d*)$/.exec(range ?? "");
    if (wanted) {
      const start = Number(wanted[1]);
      const end = Math.min(wanted[2] ? Number(wanted[2]) : total - 1, total - 1);
      if (start >= total || end < start) {
        res.status(416).setHeader("Content-Range", `bytes */${total}`);
        return new StreamableFile(new Uint8Array(0));
      }
      res.status(206).setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      return new StreamableFile(content.bytes.subarray(start, end + 1));
    }
    return new StreamableFile(content.bytes);
  }
}
