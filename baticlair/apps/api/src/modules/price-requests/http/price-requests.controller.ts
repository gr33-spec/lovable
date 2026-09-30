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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { z } from "zod";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import { Idempotent } from "../../../platform/http/idempotency.interceptor.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { PriceRequestsService, type PriceRequestView } from "../application/price-requests.service.js";

const supplierIds = z.array(z.string()).min(1).max(20);
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
const statusBody = z.object({
  status: z.enum(["to_send", "sent", "declined"]),
});
const classifyBody = z.object({ classified: z.boolean(), retainedSupplierIds: z.array(z.string()).max(20).optional() });

/** Plafond technique de réception ; la limite métier est vérifiée par le service des documents. */
const HARD_MAX_UPLOAD_BYTES = 50_000_000;

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

  @Get("projects/:projectId/price-requests")
  async list(@Tenant() tenant: TenantContext, @Param("projectId") projectId: string) {
    return {
      items: (await this.requests.listForProject(tenant, projectId)).map(toDto),
    };
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

  /** Devis PDF reçu du fournisseur, déposé à la main (MVP). */
  @Post("price-request-recipients/:id/quote")
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: HARD_MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  async attachQuote(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) throw validationFailed("Missing file", [{ path: "file", message: "required" }]);
    return toDto(
      await this.requests.attachQuote(tenant, id, {
        fileName: Buffer.from(file.originalname, "latin1").toString("utf8"),
        bytes: new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength),
      }),
    );
  }
}
