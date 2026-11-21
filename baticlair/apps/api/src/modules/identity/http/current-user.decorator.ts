import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { DomainError } from "../../../platform/errors/domain-error.js";
import type { AuthenticatedUser } from "../authenticated-user.js";
import type { RequestWithUser } from "./session.guard.js";

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const user = ctx.switchToHttp().getRequest<RequestWithUser>().user;
  if (!user) throw new DomainError("unauthenticated", "A valid session is required");
  return user;
});
