import { Module } from "@nestjs/common";
import { AiUsageModule } from "./modules/ai-usage/index.js";
import { BillingModule } from "./modules/billing/index.js";
import { DemoModule } from "./modules/demo/index.js";
import { DocumentsModule } from "./modules/documents/index.js";
import { HealthModule } from "./modules/health/health.module.js";
import { IdentityModule } from "./modules/identity/index.js";
import { OffersModule } from "./modules/offers/index.js";
import { PriceRequestsModule } from "./modules/price-requests/index.js";
import { PrivacyModule } from "./modules/privacy/privacy.module.js";
import { ProjectsModule } from "./modules/projects/index.js";
import { QuantitatifsModule } from "./modules/quantitatifs/quantitatifs.module.js";
import { SuppliersModule } from "./modules/suppliers/index.js";
import { TakeoffModule } from "./modules/takeoff/index.js";
import { TenancyModule } from "./modules/tenancy/index.js";
import { ConfigModule } from "./platform/config/config.module.js";
import { DatabaseModule } from "./platform/database/database.module.js";
import { EmailModule } from "./platform/email/email.module.js";
import { RateLimitModule } from "./platform/http/rate-limit.module.js";
import { LoggingModule } from "./platform/logging/logging.module.js";

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    RateLimitModule,
    EmailModule,
    IdentityModule,
    TenancyModule,
    ProjectsModule,
    DocumentsModule,
    AiUsageModule,
    TakeoffModule,
    SuppliersModule,
    PriceRequestsModule,
    OffersModule,
    DemoModule,
    BillingModule,
    HealthModule,
    PrivacyModule,
    QuantitatifsModule,
  ],
})
export class AppModule {}
