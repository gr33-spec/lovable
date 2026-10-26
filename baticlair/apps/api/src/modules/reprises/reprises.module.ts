import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/index.js";
import { RepriseController, RepriseTacheController } from "./http/reprises.controller.js";

@Module({ imports: [TenancyModule], controllers: [RepriseController, RepriseTacheController] })
export class ReprisesModule {}
