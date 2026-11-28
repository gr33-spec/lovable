import { Module } from "@nestjs/common";
import { ClientErrorsController } from "./http/client-errors.controller.js";
import { HealthController } from "./health.controller.js";
import { CompteurController } from "./http/compteur.controller.js";
import { VersionController } from "./http/version.controller.js";

@Module({ controllers: [HealthController, ClientErrorsController, CompteurController, VersionController] })
export class HealthModule {}
