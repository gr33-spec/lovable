import { Controller, Get, Header, Headers, Inject } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { EmailCapability } from "../../platform/email/email.port.js";
import { originesAcceptees, type AppConfig } from "../../platform/config/config.js";
import type { Alerter } from "../../platform/alerts/alerter.js";
import { ALERTER, CONFIG, EMAIL_SENDER } from "../../platform/tokens.js";
import { Public } from "../identity/index.js";

@Controller("v1/health")
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EMAIL_SENDER) private readonly email: EmailCapability,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(ALERTER) private readonly alerter: Alerter,
  ) {}

  @Public()
  // Dette n° 8 (21 octobre) : lu à chaque chargement de page ; limite large par adresse et cache court côté navigateur.
  @Throttle({ default: { ttl: 3_600_000, limit: 600 } })
  @Header("Cache-Control", "private, max-age=30")
  @Get()
  async health(@Headers("origin") origin: string | undefined) {
    // `db` : la base répond (une prévisualisation sans DATABASE_URL se voit ici, sans détail de connexion).
    let db: "ok" | "erreur" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "erreur";
    }
    // `origine` : les origines web acceptées (CORS et authentification) et celle de la requête, pour vérifier une
    // prévisualisation depuis un téléphone.
    const origine = {
      acceptees: [...this.config.webAppOrigins, ...(this.config.previewOriginPattern ? ["https://*-gr33-spec.vercel.app (prévisualisation)"] : [])],
      demande: origin ?? null,
      acceptee: originesAcceptees(this.config, origin),
    };
    // `features` : ce qui est réellement disponible, pour que l'interface ne
    // promette rien d'impossible (ex. « e-mail envoyé » sans service d'e-mail). `aiKey` : le NOM de la variable d'où
    // vient la clé de lecture (BATICLAIR_ANTHROPIC_KEY), jamais sa valeur. `groupe` : BatiClair Groupé ouvert (drapeau `GROUPE`) ; `commandeCommune` : « mois » (la commande du mois) ou « lots ».
    return { status: db === "ok" ? "ok" : "degrade", db, origine, features: { email: this.email.deliversEmail, ai: this.config.ai.provider !== "disabled", aiKey: this.config.ai.keySource, alerts: this.alerter.enabled, groupe: this.config.groupe.enabled, commandeCommune: this.config.groupe.mode } };
  }
}
