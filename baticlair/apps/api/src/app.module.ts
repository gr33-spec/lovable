import { Module } from "@nestjs/common";
import { AbonnementModule } from "./modules/abonnement/index.js";
import { AiUsageModule } from "./modules/ai-usage/index.js";
import { BillingModule } from "./modules/billing/index.js";
import { DemoModule } from "./modules/demo/index.js";
import { DocumentsModule } from "./modules/documents/index.js";
import { GroupeModule } from "./modules/groupe/index.js";
import { AdresseMobiizModule } from "./modules/adresse-mobiiz/index.js";
import { HealthModule } from "./modules/health/health.module.js";
import { IdentityModule } from "./modules/identity/index.js";
import { OffersModule } from "./modules/offers/index.js";
import { PartnersModule } from "./modules/partners/partners.module.js";
import { PilotageModule } from "./modules/pilotage/pilotage.module.js";
import { RecentrageModule } from "./modules/recentrage/index.js";
import { AchatGroupeModule } from "./modules/achat-groupe/index.js";
import { PriceRequestsModule } from "./modules/price-requests/index.js";
import { PrivacyModule } from "./modules/privacy/index.js";
import { ProjectsModule } from "./modules/projects/index.js";
import { QuantitatifsModule } from "./modules/quantitatifs/quantitatifs.module.js";
import { SuppliersModule } from "./modules/suppliers/index.js";
import { TakeoffModule } from "./modules/takeoff/index.js";
import { TenancyModule } from "./modules/tenancy/index.js";
import { ConfigModule } from "./platform/config/config.module.js";
import { DatabaseModule } from "./platform/database/database.module.js";
import { EmailModule } from "./platform/email/email.module.js";
import { RepriseModule } from "./platform/reprise/reprise.module.js";
import { ReprisesModule } from "./modules/reprises/reprises.module.js";
import { BrouillonsModule } from "./modules/brouillons/brouillons.module.js";
import { CatalogueModule } from "./modules/catalogue/index.js";
import { RateLimitModule } from "./platform/http/rate-limit.module.js";
import { LoggingModule } from "./platform/logging/logging.module.js";
import { PushModule } from "./platform/push/push.module.js";

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    RateLimitModule,
    EmailModule,
    RepriseModule,
    PushModule,
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
    AbonnementModule,
    HealthModule,
    PrivacyModule,
    QuantitatifsModule,
    PartnersModule,
    AdresseMobiizModule,
    GroupeModule,
    PilotageModule,
    RecentrageModule,
    AchatGroupeModule,
    ReprisesModule,
    BrouillonsModule,
    CatalogueModule,
  ],
})
export class AppModule {}
