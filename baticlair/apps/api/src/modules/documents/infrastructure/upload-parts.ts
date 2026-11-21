import { z } from "zod";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, validationFailed } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

/** Un morceau tient dans une requête : l'hébergeur (Vercel) refuse un corps de plus de 4,5 Mo. */
export const MAX_PART_BYTES = 4_000_000;
/** Un fichier recollé ne dépasse jamais ce plafond technique ; la limite métier reste celle du service appelant. */
export const MAX_ASSEMBLED_BYTES = 50_000_000;
const MAX_PARTS = Math.ceil(MAX_ASSEMBLED_BYTES / 1_000_000);
/** Morceaux d'un envoi abandonné (réseau coupé, appli fermée) : effacés par la tâche quotidienne. */
const STALE_AFTER_MS = 24 * 3_600_000;

/** Champs d'une requête de dépôt qui nomme un envoi en morceaux au lieu de joindre le fichier. */
export const chunkedFields = {
  uploadId: z.string().uuid().optional(),
  parts: z.coerce.number().int().min(1).max(MAX_PARTS).optional(),
  fileName: z.string().trim().max(255).optional(),
};

/** Fichier reçu par multer (stockage en mémoire). */
interface ReceivedFile {
  originalname: string;
  buffer: Buffer;
}

/**
 * Fichiers envoyés en morceaux : un devis scanné dépasse souvent les 4,5 Mo qu'accepte une requête chez
 * l'hébergeur. Le navigateur envoie les morceaux un à un, puis la requête habituelle (dépôt du devis, croquis…)
 * nomme l'envoi au lieu de joindre le fichier : il est recollé ici, dans l'ordre, et ses morceaux effacés.
 */
export class UploadParts {
  constructor(private readonly prisma: PrismaService) {}

  async put(tenant: TenantContext, uploadId: string, index: number, bytes: Uint8Array): Promise<void> {
    assertCanWrite(tenant);
    if (!isUuid(uploadId)) throw validationFailed("Invalid upload id", [{ path: "uploadId", message: "uuid" }]);
    if (!Number.isInteger(index) || index < 0 || index >= MAX_PARTS) throw validationFailed("Invalid part index", [{ path: "index", message: "range" }]);
    if (bytes.byteLength === 0) throw validationFailed("Empty part", [{ path: "file", message: "required" }]);
    if (bytes.byteLength > MAX_PART_BYTES) throw new DomainError("payload_too_large", "Part too large", { maxBytes: MAX_PART_BYTES });
    const owner = await this.prisma.uploadPart.findFirst({ where: { uploadId }, select: { companyId: true } });
    if (owner && owner.companyId !== tenant.companyId) throw validationFailed("Invalid upload id", [{ path: "uploadId", message: "unknown" }]);
    const data = new Uint8Array(bytes);
    await this.prisma.uploadPart.upsert({
      where: { uploadId_index: { uploadId, index } },
      create: { uploadId, index, companyId: tenant.companyId, bytes: data },
      update: { bytes: data },
    });
  }

  /** Recolle les `parts` morceaux de l'envoi (0 à parts − 1, tous présents) et les efface. */
  async take(tenant: TenantContext, uploadId: string, parts: number): Promise<Uint8Array> {
    assertCanWrite(tenant);
    const missing = () => validationFailed("Upload incomplete", [{ path: "uploadId", message: "incomplete" }]);
    if (!isUuid(uploadId) || !Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) throw missing();
    const rows = await this.prisma.uploadPart.findMany({
      where: { uploadId, companyId: tenant.companyId },
      orderBy: { index: "asc" },
      select: { index: true, bytes: true },
    });
    if (rows.length !== parts || rows.some((r, i) => r.index !== i)) throw missing();
    const total = rows.reduce((n, r) => n + r.bytes.byteLength, 0);
    if (total > MAX_ASSEMBLED_BYTES) throw new DomainError("payload_too_large", "Upload too large", { maxBytes: MAX_ASSEMBLED_BYTES });
    const out = new Uint8Array(total);
    let at = 0;
    for (const r of rows) {
      out.set(r.bytes, at);
      at += r.bytes.byteLength;
    }
    await this.prisma.uploadPart.deleteMany({ where: { uploadId, companyId: tenant.companyId } });
    return out;
  }

  /** Le fichier d'une requête de dépôt : joint tel quel, ou recollé depuis ses morceaux. */
  async fileOf(
    tenant: TenantContext,
    file: ReceivedFile | undefined,
    body: { uploadId?: string | undefined; parts?: number | undefined; fileName?: string | undefined },
  ): Promise<{ name: string; bytes: Uint8Array }> {
    if (file) {
      return {
        name: Buffer.from(file.originalname, "latin1").toString("utf8"),
        bytes: new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength),
      };
    }
    if (body.uploadId && body.parts) return { name: body.fileName ?? "document", bytes: await this.take(tenant, body.uploadId, body.parts) };
    throw validationFailed("Missing file", [{ path: "file", message: "required" }]);
  }

  async purgeStale(now: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.uploadPart.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) } } });
    return count;
  }
}
