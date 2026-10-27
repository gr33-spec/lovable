import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../platform/email/email.port.js";
import { NotificationsGroupeService } from "../../platform/notifications/notifications-artisan.js";
import type { PushSender } from "../../platform/push/push.port.js";
import { CONFIG, EMAIL_SENDER, PUSH_SENDER } from "../../platform/tokens.js";
import { AdresseMobiizModule, AdresseMobiizService } from "../adresse-mobiiz/index.js";
import { PdfJsPdfReader } from "../documents/index.js";
import { CommandeDuMoisService, GroupeModule, NEGOCE_EXTRACTOR, type NegoceExtractor } from "../groupe/index.js";
import { PilotageModule } from "../pilotage/index.js";
import { lienEmailsCoupes } from "../privacy/index.js";
import { DemandePersoService, DroitsService, NegocieService, ObservatoireService, RecentrageModule } from "../recentrage/index.js";
import { TakeoffModule, TakeoffService } from "../takeoff/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { AchatGroupeService } from "./application/achat-groupe.service.js";
import { AchatGroupeController, AchatGroupePublicController, AchatGroupeTacheController } from "./http/achat-groupe.controller.js";

/**
 * L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026) : au-dessus du regroupement négocié (mêmes tables, `mode =
 * automatique`), de la demande perso (plan B), de l'adresse Mobiiz (Reply-To) et du lecteur de devis des négoces.
 */
@Module({
  imports: [TenancyModule, RecentrageModule, GroupeModule, AdresseMobiizModule, PilotageModule, TakeoffModule],
  controllers: [AchatGroupeController, AchatGroupePublicController, AchatGroupeTacheController],
  providers: [
    {
      provide: AchatGroupeService,
      useFactory: (
        p: PrismaService,
        droits: DroitsService,
        demandes: DemandePersoService,
        negocie: NegocieService,
        observatoire: ObservatoireService,
        adresses: AdresseMobiizService,
        commande: CommandeDuMoisService,
        takeoffs: TakeoffService,
        extracteur: NegoceExtractor | null,
        push: PushSender,
        e: TransactionalEmailSender,
        c: AppConfig,
      ) =>
        new AchatGroupeService(
          p,
          {
            zoneDe: (companyId) => droits.zoneDe(companyId),
            exigerZone: (companyId, zone) => droits.exiger(companyId, { type: "regroupement", zone }),
            abonne: async (companyId) => (await droits.droits(companyId)).raison === "abonne",
            dernierPrixPour: (companyId) => demandes.dernierPrixPour(companyId),
            adresseMobiiz: async (companyId) => (await adresses.expediteur(companyId))?.from.match(/<([^>]+)>/)?.[1] ?? null,
            mode: () => negocie.mode(),
            envoyerEnPerso: async (tenant, d) => {
              const projet = await p.project.create({ data: { companyId: tenant.companyId, name: d.nom, address: d.adresse, createdById: tenant.userId }, select: { id: true } });
              const liste = await takeoffs.fromLines(tenant, projet.id, tenant.trades[0] ?? "roofing", [{ designation: d.ligne.designation, quantity: String(d.ligne.quantite), unit: d.ligne.unite, price: null }]);
              await takeoffs.validate(tenant, liste.takeoff.id);
              const vue = await demandes.envoyer(tenant, projet.id, { but: "chiffrer", accord: true, negoces: d.supplierIds.map((supplierId) => ({ supplierId })), dateBesoin: d.dateBesoin, message: null });
              return { projectId: projet.id, demandeId: vue.id };
            },
            lignesDeListe: async (tenant, projectId) => {
              const { adresse, lignes } = await commande.lignesDuChantier(tenant, projectId);
              return { adresse, lignes: lignes.map((l) => ({ key: l.key, designation: l.designation, quantite: l.quantite, unite: l.unite })) };
            },
            observatoire: (o) => observatoire.enregistrer({ type: "groupe", sourceId: o.sourceId, departement: o.departement, lignes: [{ designation: o.designation, unite: o.unite, quantite: o.quantite, prixHt: o.prixHt }] }),
          },
          new NotificationsGroupeService(p, push, e, (companyId) => lienEmailsCoupes(c.webAppUrl, c.authSecret, companyId), c.emailDomaine, c.webAppUrl),
          e,
          extracteur,
          new PdfJsPdfReader(),
          {
            webAppUrl: c.webAppUrl,
            emailDomaine: c.emailDomaine,
            delaiLivraisonJours: c.groupe.negocie.delaiLivraisonJours,
            delaiReponseJours: c.groupe.negocie.delaiReponseJours,
            alertesJour: c.groupe.negocie.alertesJour,
            commissionDefaut: c.groupe.negocie.commissionDefaut,
            commissionLancement: c.groupe.negocie.commissionLancement,
            commissionLancementPremiers: c.groupe.negocie.commissionLancementPremiers,
            budgetIaJourEur: c.groupe.negocie.budgetIaJourEur,
            usdToEur: c.aiCost.usdToEur,
            seuilAnonymat: c.groupe.recentrage.seuilAnonymat,
            seuilVolumeMin: c.groupe.recentrage.seuilVolumeMin,
            prixReperes: c.groupe.recentrage.prixReperes,
            familles: c.groupe.recentrage.familles,
          },
        ),
      inject: [PrismaService, DroitsService, DemandePersoService, NegocieService, ObservatoireService, AdresseMobiizService, CommandeDuMoisService, TakeoffService, NEGOCE_EXTRACTOR, PUSH_SENDER, EMAIL_SENDER, CONFIG],
    },
  ],
  exports: [AchatGroupeService],
})
export class AchatGroupeModule {}
