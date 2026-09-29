import { createHash } from "node:crypto";
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  UseInterceptors,
} from "@nestjs/common";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants.js";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { catchError, from, mergeMap, type Observable, of, throwError } from "rxjs";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../database/prisma.service.js";
import { DomainError, validationFailed } from "../errors/domain-error.js";

const KEY_FORMAT = /^[A-Za-z0-9_-]{8,128}$/;
const RETENTION_MS = 24 * 60 * 60 * 1000;

type Record = { requestHash: string; responseStatus: number | null; responseBody: Prisma.JsonValue | null };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/**
 * En-tête `Idempotency-Key` (docs/architecture.md, §93 du cahier des charges).
 *
 * Le client (application web, mobile) génère une clé par action utilisateur.
 * Si la même requête arrive deux fois — double appui, réseau qui coupe puis
 * nouvelle tentative — la seconde reçoit la réponse de la première au lieu
 * de créer un doublon. Sans en-tête, la route fonctionne normalement.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { userId: string } }>();
    const res = http.getResponse<Response>();
    const key = req.header("idempotency-key");
    const userId = req.user?.userId;
    if (!key || !userId) return next.handle();
    if (!KEY_FORMAT.test(key)) throw validationFailed("Invalid Idempotency-Key header");

    const requestHash = createHash("sha256")
      .update(JSON.stringify([req.method, req.originalUrl, req.header("x-company-id") ?? null, req.body ?? null]))
      .digest("hex");
    const where = { userId_key: { userId, key } };

    let existing = await this.prisma.idempotencyRecord.findUnique({ where });
    if (existing && Date.now() - existing.createdAt.getTime() > RETENTION_MS) {
      await this.prisma.idempotencyRecord.delete({ where }).catch(() => undefined);
      existing = null;
    }
    if (existing) return this.replay(existing, requestHash, res);

    try {
      await this.prisma.idempotencyRecord.create({ data: { userId, key, requestHash } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Requête jumelle arrivée au même instant.
      const twin = await this.prisma.idempotencyRecord.findUnique({ where });
      if (!twin) throw error;
      return this.replay(twin, requestHash, res);
    }

    const status =
      this.reflector.get<number | undefined>(HTTP_CODE_METADATA, context.getHandler()) ??
      (req.method === "POST" ? 201 : 200);

    return next.handle().pipe(
      mergeMap(async (body) => {
        await this.prisma.idempotencyRecord.update({
          where,
          data: { responseStatus: status, responseBody: (body ?? Prisma.JsonNull) as Prisma.InputJsonValue },
        });
        return body;
      }),
      // Échec : la clé est libérée pour qu'une nouvelle tentative puisse aboutir.
      catchError((error) =>
        from(this.prisma.idempotencyRecord.delete({ where }).catch(() => undefined)).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
    );
  }

  private replay(record: Record, requestHash: string, res: Response): Observable<unknown> {
    if (record.requestHash !== requestHash) {
      throw new DomainError("conflict", "Idempotency-Key already used for a different request");
    }
    if (record.responseStatus === null) {
      throw new DomainError("request_in_progress", "The original request is still being processed");
    }
    res.status(record.responseStatus);
    res.setHeader("idempotent-replay", "true");
    return of(record.responseBody);
  }
}

/** À poser sur les routes qui créent quelque chose. */
export const Idempotent = () => UseInterceptors(IdempotencyInterceptor);
