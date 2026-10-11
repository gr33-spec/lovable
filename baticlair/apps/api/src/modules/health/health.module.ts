import { Module } from "@nestjs/common";
import { ClientErrorsController } from "./http/client-errors.controller.js";
import { HealthController } from "./health.controller.js";

@Module({ controllers: [HealthController, ClientErrorsController] })
export class HealthModule {}
