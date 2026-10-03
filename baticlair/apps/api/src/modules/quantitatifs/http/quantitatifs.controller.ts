import { Body, Controller, Get, Inject, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { z } from "zod";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { QuantitatifsService } from "../application/quantitatifs.service.js";

type LigneRecue = { libelle: string; quantite?: string | null; unite?: string | null; prix?: string | null };
const ligneEntree = (l: LigneRecue) => ({ libelle: l.libelle, quantite: l.quantite ?? null, unite: l.unite ?? null, prix: l.prix ?? null });

interface UploadedPdf {
  originalname: string;
  buffer: Buffer;
}

/** Plafond technique de réception ; la limite métier est vérifiée par le service des documents. */
const HARD_MAX_UPLOAD_BYTES = 50_000_000;

/** Un nombre ou un texte : « 200 », 200, « 1 250,50 »… le moteur relit le texte, jamais d'arrondi ici. */
const texteOuNombre = z
  .union([z.string().trim().max(60), z.number().finite()])
  .nullish()
  .transform((v) => (v === null || v === undefined || v === "" ? null : String(v)));

const ligne = z.object({
  libelle: z.string().trim().min(1).max(500),
  quantite: texteOuNombre,
  unite: z.string().trim().max(20).nullish().transform((v) => v || null),
  prix: texteOuNombre,
});

const contexte = {
  projetId: z.string().uuid().optional(),
  reference: z.string().trim().max(200).optional(),
  adresse: z.string().trim().max(300).optional(),
};

/** Entrée « lignes » (Rappidos, §38) : le devis déjà découpé, sans IA. Absente en multipart (PDF). */
const entree = z.object({ ...contexte, lignes: z.array(ligne).min(1).max(500).optional() });

const reponses = z.object({
  reponses: z
    .array(z.object({ question: z.string().min(1).max(200), valeur: z.string().trim().max(60).nullable(), unite: z.string().max(20).optional() }))
    .min(1)
    .max(20),
});

const correction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("modifier"), cle: z.string().min(1).max(200), valeur: z.string().trim().min(1).max(60), unite: z.string().max(20).optional() }),
  z.object({ action: z.literal("ajouter"), ligne }),
]);

/**
 * LA PORTE D'ENTRÉE (§38) : POST un devis (PDF en multipart, champ `file`, ou JSON `lignes`),
 * puis GET jusqu'à `pret` ou `questions`. 202 tant que la lecture n'est pas finie.
 */
@Controller("v1/quantitatifs")
@UseGuards(TenantGuard)
export class QuantitatifsController {
  constructor(@Inject(QuantitatifsService) private readonly quantitatifs: QuantitatifsService) {}

  @Throttle({ default: HOURLY(30) })
  @Post()
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: HARD_MAX_UPLOAD_BYTES, files: 1 } }))
  async create(
    @Tenant() tenant: TenantContext,
    @UploadedFile() file: UploadedPdf | undefined,
    @Body(new ZodPipe(entree)) body: z.infer<typeof entree>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ctx = { projetId: body.projetId, reference: body.reference, adresse: body.adresse };
    if (file && body.lignes) throw validationFailed("Send a PDF or lines, not both", [{ path: "lignes", message: "file already sent" }]);
    let result;
    if (file) {
      result = await this.quantitatifs.fromPdf(
        tenant,
        {
          name: Buffer.from(file.originalname, "latin1").toString("utf8"),
          bytes: new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength),
        },
        ctx,
      );
    } else if (body.lignes) {
      result = await this.quantitatifs.fromLines(tenant, body.lignes.map(ligneEntree), ctx);
    } else {
      throw validationFailed("Missing quote", [{ path: "file", message: "send a PDF (file) or lines (lignes)" }]);
    }
    res.status(result.etat === "en_cours" ? 202 : 201);
    return result;
  }

  @Get(":id")
  async get(@Tenant() tenant: TenantContext, @Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.quantitatifs.get(tenant, id);
    if (result.etat === "en_cours") res.setHeader("Retry-After", "3");
    return result;
  }

  @Throttle({ default: HOURLY(300) })
  @Post(":id/reponses")
  async answer(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(reponses)) body: z.infer<typeof reponses>) {
    return this.quantitatifs.answer(tenant, id, body.reponses.map((r) => ({ question: r.question, valeur: r.valeur ?? null, unite: r.unite })));
  }

  @Throttle({ default: HOURLY(300) })
  @Post(":id/corrections")
  async correct(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(correction)) body: z.infer<typeof correction>) {
    return this.quantitatifs.correct(tenant, id, body.action === "ajouter" ? { action: "ajouter", ligne: ligneEntree(body.ligne) } : body);
  }
}
