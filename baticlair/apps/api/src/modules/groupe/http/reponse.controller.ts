import { Body, Controller, Get, Inject, Ip, Param, Post, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { z } from "zod";
import type { AppConfig } from "../../../platform/config/config.js";
import { notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Public } from "../../identity/index.js";
import { DemandeService } from "../application/demande.service.js";

const MAX_DEVIS = 2;
const MAX_OCTETS = 15 * 1024 * 1024;
const depotBody = z.object({
  /** La case d'accord de commission : « oui » (formulaire) ou « true ». */
  accord: z.string().max(10).optional(),
  message: z.string().max(2000).optional(),
});

/**
 * LA PAGE DE RÉPONSE DU NÉGOCE (parcours groupé, étape 5) : par son lien unique, sans compte ni mot de passe, il voit le
 * lot (volumes, chantiers, fenêtre), le contrat de commission, coche l'accord (obligatoire) et dépose un ou deux devis.
 * Publique, limitée en débit ; 404 drapeau éteint, lien inconnu ou mal formé.
 */
@Controller("v1/reponse")
export class ReponseController {
  constructor(
    @Inject(DemandeService) private readonly demande: DemandeService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get(":jeton")
  async page(@Param("jeton") jeton: string) {
    this.ouvert();
    return this.demande.page(jeton);
  }

  @Public()
  @Throttle({ default: HOURLY(120) })
  @Get(":jeton/contrat.pdf")
  async contrat(@Param("jeton") jeton: string, @Res() res: Response) {
    this.ouvert();
    const pdf = await this.demande.contratPdf(jeton);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", 'inline; filename="contrat-commission.pdf"');
    res.send(Buffer.from(pdf));
  }

  @Public()
  @Throttle({ default: HOURLY(30) })
  @Post(":jeton")
  @UseInterceptors(FilesInterceptor("file", MAX_DEVIS, { storage: memoryStorage(), limits: { fileSize: MAX_OCTETS, files: MAX_DEVIS } }))
  async deposer(
    @Param("jeton") jeton: string,
    @Body(new ZodPipe(depotBody)) body: z.infer<typeof depotBody>,
    @UploadedFiles() files: { originalname: string; mimetype: string; buffer: Buffer }[] | undefined,
    @Ip() ip: string,
  ) {
    this.ouvert();
    const accord = body.accord === "oui" || body.accord === "true" || body.accord === "on";
    const message = body.message?.trim() ? body.message.trim() : null;
    return this.demande.deposer(jeton, { accord, message, fichiers: (files ?? []).map((f) => ({ nom: f.originalname, type: f.mimetype, contenu: f.buffer })) }, ip ?? "");
  }

  private ouvert(): void {
    if (!this.config.groupe.enabled) throw notFound("Route");
  }
}
