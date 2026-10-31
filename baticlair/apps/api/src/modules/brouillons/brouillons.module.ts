import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/index.js";
import { BrouillonsController } from "./http/brouillons.controller.js";

/** Les brouillons des parcours (correction après test de Greg, 30 octobre 2026, point 2). */
@Module({ imports: [TenancyModule], controllers: [BrouillonsController] })
export class BrouillonsModule {}
