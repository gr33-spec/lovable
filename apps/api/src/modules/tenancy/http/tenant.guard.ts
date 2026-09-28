import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { enrichRequestContext } from "../../../platform/logging/request-context.js";
import type { RequestWithUser } from "../../identity/index.js";
import { TenancyService } from "../application/tenancy.service.js";
import type { TenantContext } from "../domain/tenant-context.js";

export const COMPANY_HEADER = "x-company-id";

export type RequestWithTenant = RequestWithUser & { tenant?: TenantContext };

/** À placer sur tout contrôleur manipulant des données d'entreprise. */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(TenancyService) private readonly tenancy: TenancyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithTenant>();
    if (!req.user) return false; // SessionGuard (global) s'exécute avant.
    const requested = req.header(COMPANY_HEADER);
    req.tenant = await this.tenancy.resolveTenant(req.user.userId, requested || undefined);
    enrichRequestContext({ companyId: req.tenant.companyId });
    return true;
  }
}
