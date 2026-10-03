import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Controller, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { priceRequestDto } from "../../price-requests/index.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { DemoService } from "../application/demo.service.js";

@Controller("v1/demo")
@UseGuards(TenantGuard)
export class DemoController {
  constructor(@Inject(DemoService) private readonly demo: DemoService) {}

  /** Crée un chantier fictif (devis client compris) et les fournisseurs fictifs. */
  @Throttle({ default: HOURLY(10) })
  @Post("project")
  @HttpCode(201)
  createProject(@Tenant() tenant: TenantContext) {
    return this.demo.createProject(tenant);
  }

  /** Un fournisseur fictif « répond » : son devis PDF est rangé sur sa ligne. */
  @Post("recipients/:id/quote")
  @HttpCode(201)
  async simulateQuote(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return priceRequestDto(await this.demo.simulateQuote(tenant, id));
  }
}
