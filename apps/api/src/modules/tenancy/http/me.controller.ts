import { Body, Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";
import { TenancyService } from "../application/tenancy.service.js";

const createCompanyBody = z.object({ name: z.string() });

@Controller("v1")
export class MeController {
  constructor(@Inject(TenancyService) private readonly tenancy: TenancyService) {}

  /** Qui suis-je, et à quelles entreprises ai-je accès ? (sert à l'onboarding) */
  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    const companies = await this.tenancy.listMemberships(user.userId);
    return {
      user: { id: user.userId, email: user.email, name: user.name, emailVerified: user.emailVerified },
      companies: companies.map((c) => ({ id: c.companyId, name: c.companyName, role: c.role })),
    };
  }

  @Post("companies")
  @HttpCode(201)
  async createCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodPipe(createCompanyBody)) body: z.infer<typeof createCompanyBody>,
  ) {
    const c = await this.tenancy.createCompany(user.userId, body.name);
    return { id: c.companyId, name: c.companyName, role: c.role };
  }
}
