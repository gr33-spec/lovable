import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { DomainError } from "../../../platform/errors/domain-error.js";
import type { TenantContext } from "../domain/tenant-context.js";
import type { RequestWithTenant } from "./tenant.guard.js";

export const Tenant = createParamDecorator((_: unknown, ctx: ExecutionContext): TenantContext => {
  const tenant = ctx.switchToHttp().getRequest<RequestWithTenant>().tenant;
  if (!tenant) throw new DomainError("internal_error", "TenantGuard missing on this route");
  return tenant;
});
