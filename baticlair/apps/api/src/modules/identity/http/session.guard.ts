import { createHash } from "node:crypto";
import { type CanActivate, type ExecutionContext, Inject, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError } from "../../../platform/errors/domain-error.js";
import { enrichRequestContext } from "../../../platform/logging/request-context.js";
import { AUTH } from "../../../platform/tokens.js";
import type { AuthenticatedUser } from "../authenticated-user.js";
import type { Auth } from "../infrastructure/auth.js";

const IS_PUBLIC = "identity:isPublic";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Marque une route comme accessible sans session (ex. santé). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Clé API partenaire qui a authentifié la requête (jamais une session) : son entreprise et son quota. */
export interface ApiKeyContext {
  id: string;
  companyId: string;
  monthlyQuota: number;
}

export type RequestWithUser = Request & { user?: AuthenticatedUser; apiKey?: ApiKeyContext };

export const API_KEY_HEADER = "x-api-key";

/** Une clé « bc_… » n'est stockée que hachée : la comparaison se fait sur l'empreinte. */
export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

/**
 * Garde global : toute route exige une session valide, sauf `@Public()`.
 * Sécurisé par défaut — oublier un garde ne peut pas exposer une route.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * Dernière connexion (effacement 3 ans après, page Confidentialité) : jamais bloquante. La
   * condition « plus d'un jour » est dans la requête : une seule écriture par jour, même sur
   * plusieurs instances ; les autres jours, la mise à jour ne touche aucune ligne.
   */
  private noteVisit(userId: string): void {
    const now = Date.now();
    void this.prisma.user
      .updateMany({ where: { id: userId, lastSeenAt: { lt: new Date(now - DAY_MS) } }, data: { lastSeenAt: new Date(now) } })
      .catch(() => undefined);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    // Clé API partenaire (plan v3 §1) : elle vaut pour l'entreprise qui l'a créée, au nom de son auteur.
    const apiKey = req.header(API_KEY_HEADER);
    if (apiKey) {
      const key = await this.prisma.partnerApiKey.findUnique({ where: { hash: hashApiKey(apiKey.trim()) }, select: { id: true, companyId: true, createdById: true, name: true, monthlyQuota: true, revokedAt: true } });
      if (!key || key.revokedAt) throw new DomainError("unauthenticated", "Unknown or revoked API key");
      req.user = { userId: key.createdById, email: "", name: `Clé API ${key.name}`, emailVerified: true };
      req.apiKey = { id: key.id, companyId: key.companyId, monthlyQuota: key.monthlyQuota };
      enrichRequestContext({ userId: key.createdById });
      void this.prisma.partnerApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
      return true;
    }
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new DomainError("unauthenticated", "A valid session is required");

    req.user = {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
    };
    enrichRequestContext({ userId: session.user.id });
    this.noteVisit(session.user.id);
    return true;
  }
}
