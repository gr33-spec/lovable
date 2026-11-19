import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { identiteAConfirmer, PHRASE_IDENTITE_A_CONFIRMER } from "@baticlair/domain";
import { PrismaService } from "../database/prisma.service.js";
import { DomainError } from "../errors/domain-error.js";

/**
 * RIEN NE PART CHEZ UN NÉGOCE TANT QUE L'ENTREPRISE N'EST PAS CONFIRMÉE (nouvel onboarding, Greg, 19 novembre 2026) : à
 * poser APRÈS `TenantGuard` sur chaque route qui envoie à un négoce ou commande. Seules les entreprises du parcours
 * « essai » sont concernées ; les comptes d'avant passent comme avant. Refus 403 `identite_a_confirmer`, avec sa phrase.
 */
@Injectable()
export class IdentiteConfirmeeGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ tenant?: { companyId: string } }>();
    const companyId = req.tenant?.companyId;
    if (!companyId) return true; // Le garde d'entreprise a déjà refusé ou la route n'en a pas.
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { parcoursInscription: true, identiteConfirmeeLe: true } });
    if (c && identiteAConfirmer(c)) throw new DomainError("forbidden", "Company identity not confirmed", { reason: "identite_a_confirmer", phrase: PHRASE_IDENTITE_A_CONFIRMER });
    return true;
  }
}
