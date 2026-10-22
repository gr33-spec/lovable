import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG, EMAIL_SENDER, PUSH_SENDER } from "../../platform/tokens.js";
import type { PushSender } from "../../platform/push/push.port.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { PDF_READER, PdfJsPdfReader, type PdfReader } from "../documents/index.js";
import { TakeoffModule, TakeoffService } from "../takeoff/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { AdminGroupeService } from "./application/admin-groupe.service.js";
import { ChoixService } from "./application/choix.service.js";
import { CommandeService } from "./application/commande.service.js";
import { NotificationsGroupeService } from "./application/notifications-groupe.service.js";
import { DemandeService } from "./application/demande.service.js";
import { GroupeService } from "./application/groupe.service.js";
import { JeuDemonstrationService } from "./application/jeu-demonstration.service.js";
import { NEGOCE_EXTRACTOR, type NegoceExtractor } from "./application/negoce-extractor.js";
import { AnthropicNegoceExtractor } from "./infrastructure/anthropic-negoce-extractor.js";
import { FakeNegoceExtractor } from "./infrastructure/fake-negoce-extractor.js";
import { InseeSiretVerifier, SIRET_VERIFIER, siretBienForme, type SiretVerifier } from "./application/siret-verifier.js";
import { NegocesService } from "./application/negoces.service.js";
import { SIRENE_HTTP, SireneService, type SireneHttp } from "./application/sirene.service.js";
import { SireneController } from "./http/sirene.controller.js";
import { RapportMensuelService } from "./application/rapport-mensuel.service.js";
import { RegroupementService } from "./application/regroupement.service.js";
import { AdminGroupeController } from "./http/admin-groupe.controller.js";
import { GroupeController } from "./http/groupe.controller.js";
import { JeuDemonstrationController } from "./http/jeu-demonstration.controller.js";
import { NegocesController } from "./http/negoces.controller.js";
import { RapportMensuelController } from "./http/rapport-mensuel.controller.js";
import { RegroupementController } from "./http/regroupement.controller.js";
import { ReponseController } from "./http/reponse.controller.js";
import { TestMailboxController } from "./http/test-mailbox.controller.js";
import { WebhookResendController } from "./http/webhook-resend.controller.js";
import { SuiviController } from "./http/suivi.controller.js";
import { SuiviService } from "./application/suivi.service.js";
import { BanGeocodeur, GEOCODEUR, TableGeocodeur, type Geocodeur } from "./application/geocodeur.js";
import { CommandeDuMoisService } from "./application/commande-du-mois.service.js";
import { CommandeDuMoisAdminController, CommandeDuMoisController, CommandeDuMoisTacheController, GrilleNegoceController } from "./http/commande-du-mois.controller.js";

@Module({
  imports: [TenancyModule, TakeoffModule],
  controllers: [SuiviController, GroupeController, NegocesController, RegroupementController, ReponseController, WebhookResendController, TestMailboxController, AdminGroupeController, SireneController, RapportMensuelController, JeuDemonstrationController, CommandeDuMoisController, GrilleNegoceController, CommandeDuMoisTacheController, CommandeDuMoisAdminController],
  providers: [
    {
      provide: SIRET_VERIFIER,
      // En test sans clé INSEE, ou en prévisualisation avec `SIRET_VERIFICATION=forme` (refusé en production par la
      // configuration) : un SIRET bien formé vaut actif, sans appel réseau. Sinon, seule l'API Sirene vérifie.
      useFactory: (c: AppConfig): SiretVerifier =>
        (c.env === "test" && !c.groupe.inseeApiKey) || c.groupe.siretVerification === "forme"
          ? { verifier: async (s) => (siretBienForme(s) ? { statut: "actif" } : { statut: "inconnu" }) }
          : new InseeSiretVerifier(c.groupe.inseeApiKey),
      inject: [CONFIG],
    },
    // Décision de Greg (22 octobre) : la distance au chantier. En ligne, l'API Adresse de l'État ; ailleurs, une table fixe.
    { provide: GEOCODEUR, useFactory: (c: AppConfig): Geocodeur => (c.env === "production" || c.env === "staging" ? new BanGeocodeur() : new TableGeocodeur()), inject: [CONFIG] },
    { provide: SuiviService, useFactory: (p: PrismaService, t: TakeoffService) => new SuiviService(p, (tenant, id) => t.reviewed(tenant, id)), inject: [PrismaService, TakeoffService] },
    { provide: RegroupementService, useFactory: (p: PrismaService) => new RegroupementService(p), inject: [PrismaService] },
    { provide: JeuDemonstrationService, useFactory: (p: PrismaService) => new JeuDemonstrationService(p), inject: [PrismaService] },
    { provide: PDF_READER, useFactory: () => new PdfJsPdfReader() },
    { provide: AdminGroupeService, useFactory: (p: PrismaService, c: AppConfig) => new AdminGroupeService(p, c.groupe.departements), inject: [PrismaService, CONFIG] },
    { provide: NotificationsGroupeService, useFactory: (p: PrismaService, push: PushSender, e: TransactionalEmailSender) => new NotificationsGroupeService(p, push, e), inject: [PrismaService, PUSH_SENDER, EMAIL_SENDER] },
    { provide: RapportMensuelService, useFactory: (p: PrismaService, e: TransactionalEmailSender) => new RapportMensuelService(p, e), inject: [PrismaService, EMAIL_SENDER] },
    { provide: CommandeService, useFactory: (p: PrismaService, e: TransactionalEmailSender, c: AppConfig, n: NotificationsGroupeService) => new CommandeService(p, e, c.groupe.facture, n), inject: [PrismaService, EMAIL_SENDER, CONFIG, NotificationsGroupeService] },
    { provide: ChoixService, useFactory: (p: PrismaService, c: CommandeService) => new ChoixService(p, c), inject: [PrismaService, CommandeService] },
    {
      provide: NEGOCE_EXTRACTOR,
      // Nouveau cap (22 octobre) : le devis du négoce est lu UNE fois à son arrivée par le modèle le plus capable (Opus,
      // `AI_EXTRACTION_MODEL`), puis comparé par le code ; en test, le faux lecteur ; sans clé, Greg relit.
      useFactory: (c: AppConfig): NegoceExtractor | null => {
        switch (c.ai.provider) {
          case "anthropic":
            return new AnthropicNegoceExtractor(c.ai.apiKey!, c.ai.extractionModel);
          case "fake":
            return new FakeNegoceExtractor();
          case "disabled":
            return null;
        }
      },
      inject: [CONFIG],
    },
    {
      provide: DemandeService,
      useFactory: (p: PrismaService, e: TransactionalEmailSender, pdf: PdfReader, x: NegoceExtractor | null, c: AppConfig, choix: ChoixService, n: NotificationsGroupeService, g: Geocodeur) =>
        new DemandeService(p, e, pdf, x, { webAppUrl: c.webAppUrl, authSecret: c.authSecret, reponsesDomaine: c.groupe.reponsesDomaine }, choix, n, g),
      inject: [PrismaService, EMAIL_SENDER, PDF_READER, NEGOCE_EXTRACTOR, CONFIG, ChoixService, NotificationsGroupeService, GEOCODEUR],
    },
    {
      provide: GroupeService,
      useFactory: (p: PrismaService, t: TakeoffService, s: SiretVerifier, r: RegroupementService, d: DemandeService, c: CommandeService, n: NotificationsGroupeService, cfg: AppConfig) =>
        new GroupeService(p, (tenant, id) => t.reviewed(tenant, id), s, r, d, c, n, { departements: cfg.groupe.departements, admins: cfg.groupe.admins }),
      inject: [PrismaService, TakeoffService, SIRET_VERIFIER, RegroupementService, DemandeService, CommandeService, NotificationsGroupeService, CONFIG],
    },
    {
      // La commande commune du mois (Greg, 22 octobre 2026).
      provide: CommandeDuMoisService,
      useFactory: (p: PrismaService, t: TakeoffService, e: TransactionalEmailSender, n: NotificationsGroupeService, g: Geocodeur, x: NegoceExtractor | null, pdf: PdfReader, c: AppConfig, groupe: GroupeService) =>
        new CommandeDuMoisService(p, (tenant, id) => t.reviewed(tenant, id), e, n, g, x, pdf, { webAppUrl: c.webAppUrl, authSecret: c.authSecret }, (tenant) => groupe.ouvert(tenant)),
      inject: [PrismaService, TakeoffService, EMAIL_SENDER, NotificationsGroupeService, GEOCODEUR, NEGOCE_EXTRACTOR, PDF_READER, CONFIG, GroupeService],
    },
    { provide: NegocesService, useFactory: (p: PrismaService, c: AppConfig, e: TransactionalEmailSender) => new NegocesService(p, c.authSecret, e, c.webAppUrl), inject: [PrismaService, CONFIG, EMAIL_SENDER] },
    { provide: SIRENE_HTTP, useValue: fetch as unknown as SireneHttp },
    { provide: SireneService, useFactory: (p: PrismaService, h: SireneHttp, c: AppConfig) => new SireneService(p, h, { apiKey: c.groupe.inseeApiKey, ...c.groupe.sirene }), inject: [PrismaService, SIRENE_HTTP, CONFIG] },
  ],
  exports: [CommandeDuMoisService, GroupeService, NegocesService, RegroupementService, DemandeService, ChoixService, CommandeService, NotificationsGroupeService],
})
export class GroupeModule {}
