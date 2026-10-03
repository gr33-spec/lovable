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

export type RequestWithUser = Request & { user?: AuthenticatedUser };

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
