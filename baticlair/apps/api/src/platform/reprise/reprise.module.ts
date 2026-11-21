import { Global, Inject, Module, type MiddlewareConsumer, type NestModule, type OnModuleInit } from "@nestjs/common";
import { waitUntil } from "@vercel/functions";
import type { AppConfig } from "../config/config.js";
import type { Alerter } from "../alerts/alerter.js";
import { PrismaService } from "../database/prisma.service.js";
import { RELAIS_EMAIL, type RelaisEchecsEmail } from "../email/email.module.js";
import type { TransactionalEmail } from "../email/email.port.js";
import type { AppLogger } from "../logging/logger.js";
import { ALERTER, CONFIG, LOGGER } from "../tokens.js";
import { FileReprise, type RepriseStore } from "./file-reprise.js";

export const FILE_REPRISE = Symbol("FILE_REPRISE");

/** Une clé stable pour un e-mail : le même e-mail raté deux fois n'est planifié qu'une fois. */
function cleEmail(e: TransactionalEmail): string {
  let h = 0x811c9dc5;
  for (const c of `${e.to}|${e.subject}|${e.text}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return `email:${h.toString(16)}`;
}

/** La file de reprise, pour tous les modules ; les e-mails ratés y entrent d'eux-mêmes. */
@Global()
@Module({
  providers: [
    {
      provide: FILE_REPRISE,
      useFactory: (prisma: PrismaService, alerter: Alerter, logger: AppLogger) => new FileReprise(prisma as unknown as RepriseStore, alerter, logger),
      inject: [PrismaService, ALERTER, LOGGER],
    },
  ],
  exports: [FILE_REPRISE],
})
export class RepriseModule implements OnModuleInit, NestModule {
  constructor(
    @Inject(FILE_REPRISE) private readonly file: FileReprise,
    @Inject(RELAIS_EMAIL) private readonly relais: RelaisEchecsEmail,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** La file est relue au passage des requêtes (hors tests : ils la déclenchent eux-mêmes, dates en main). */
  configure(consumer: MiddlewareConsumer): void {
    if (this.config.env === "test") return;
    consumer
      .apply((_req: unknown, _res: unknown, next: () => void) => {
        this.file.auPassage((travail) => waitUntil(travail));
        next();
      })
      .forRoutes("{*chemin}");
  }

  onModuleInit(): void {
    this.relais.surEchec = (email, erreur) => {
      void this.file.planifier({ sorte: "email", cle: cleEmail(email), charge: email, erreur }).catch(() => undefined);
    };
    this.file.brancher("email", async (charge) => {
      if (!this.relais.renvoyer) throw new Error("envoi d'e-mails coupé");
      await this.relais.renvoyer(charge as TransactionalEmail);
    });
  }
}
