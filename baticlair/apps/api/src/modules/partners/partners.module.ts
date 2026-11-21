import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/index.js";
import { PartnerKeysController } from "./http/partner-keys.controller.js";

/** Clés API partenaire avec quota (plan v3 §1). */
@Module({
  imports: [TenancyModule],
  controllers: [PartnerKeysController],
})
export class PartnersModule {}
