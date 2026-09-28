import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module.js";
import { IdentityModule } from "./modules/identity/index.js";
import { ProjectsModule } from "./modules/projects/index.js";
import { TenancyModule } from "./modules/tenancy/index.js";
import { ConfigModule } from "./platform/config/config.module.js";
import { DatabaseModule } from "./platform/database/database.module.js";
import { EmailModule } from "./platform/email/email.module.js";
import { LoggingModule } from "./platform/logging/logging.module.js";

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    EmailModule,
    IdentityModule,
    TenancyModule,
    ProjectsModule,
    HealthModule,
  ],
})
export class AppModule {}
