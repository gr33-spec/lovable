import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
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

type LigneRecue = { libelle: string; quantite?: string | null; unite?: string | null; prix?: string | null; reference?: string | null };
const ligneEntree = (l: LigneRecue) => ({ libelle: l.libelle, quantite: l.quantite ?? null, unite: l.unite ?? null, prix: l.prix ?? null, reference: l.reference ?? null });

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
  reference: z.string().trim().max(80).nullish().transform((v) => v || null),
});

const contexte = {
  projetId: z.string().uuid().optional(),
  reference: z.string().trim().max(200).optional(),
  adresse: z.string().trim().max(300).optional(),
};

/**
 * Entrée « lignes » (Rappidos, §38) : le devis déjà découpé, sans IA. Entrée « documentId » (l'appli) :
 * un devis déjà déposé sur le chantier. Ni l'une ni l'autre en multipart (PDF).
 */
const entree = z.object({ ...contexte, lignes: z.array(ligne).min(1).max(500).optional(), documentId: z.string().uuid().optional() });
const rendu = z.object({ ecran: z.enum(["0", "1"]).optional(), projetId: z.string().optional() });

const reponses = z.object({
  reponses: z
    .array(z.object({ question: z.string().min(1).max(200), valeur: z.string().trim().max(120).nullable(), unite: z.string().max(20).optional() }))
    .min(1)
    .max(20),
});

const correction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("modifier"), cle: z.string().min(1).max(200), valeur: z.string().trim().min(1).max(60), unite: z.string().max(20).optional() }),
  z.object({ action: z.literal("ajouter"), ligne }),
  // Les lignes du devis (champ `devis`) : corriger ce qui a été lu, retirer, ou garder une ligne douteuse.
  z.object({ action: z.literal("modifier_ligne"), id: z.string().uuid(), ligne }),
  z.object({ action: z.literal("retirer"), id: z.string().uuid() }),
  z.object({ action: z.literal("confirmer"), id: z.string().uuid() }),
  // Les lignes du quantitatif (champ `lignes`), réécrites d'un tap (§41.4).
  z.object({ action: z.literal("renommer"), id: z.string().min(1).max(200), libelle: z.string().trim().min(1).max(300) }),
  z.object({ action: z.literal("fixer_quantite"), id: z.string().min(1).max(200), quantite: z.string().trim().regex(/^\d+(?:[.,]\d+)?$/), unite: z.string().trim().min(1).max(30) }),
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
    @Query(new ZodPipe(rendu)) query: z.infer<typeof rendu>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ctx = { projetId: body.projetId, reference: body.reference, adresse: body.adresse };
    const r = { ecran: query.ecran === "1" };
    if ([file, body.lignes, body.documentId].filter(Boolean).length > 1) throw validationFailed("Send one quote: a PDF, lines or a documentId", [{ path: "lignes", message: "several quotes sent" }]);
    let result;
    if (body.documentId) {
      result = await this.quantitatifs.fromDocument(tenant, body.documentId, ctx, r);
    } else if (file) {
      result = await this.quantitatifs.fromPdf(
        tenant,
        {
          name: Buffer.from(file.originalname, "latin1").toString("utf8"),
          bytes: new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength),
        },
        ctx,
        r,
      );
    } else if (body.lignes) {
      result = await this.quantitatifs.fromLines(tenant, body.lignes.map(ligneEntree), ctx, r);
    } else {
      throw validationFailed("Missing quote", [{ path: "file", message: "send a PDF (file) or lines (lignes)" }]);
    }
    res.status(result.etat === "en_cours" ? 202 : 201);
    return result;
  }

  /** Le quantitatif le plus récent d'un chantier (`?projetId=`), et si la lecture IA est disponible. */
  @Get()
  async list(@Tenant() tenant: TenantContext, @Query(new ZodPipe(rendu)) query: z.infer<typeof rendu>) {
    if (!query.projetId) throw validationFailed("projetId is required", [{ path: "projetId", message: "required" }]);
    return { items: await this.quantitatifs.forProject(tenant, query.projetId, { ecran: query.ecran === "1" }), ia_disponible: this.quantitatifs.iaDisponible };
  }

  @Get(":id")
  async get(@Tenant() tenant: TenantContext, @Param("id") id: string, @Query(new ZodPipe(rendu)) query: z.infer<typeof rendu>, @Res({ passthrough: true }) res: Response) {
    const result = await this.quantitatifs.get(tenant, id, { ecran: query.ecran === "1" });
    if (result.etat === "en_cours") res.setHeader("Retry-After", "3");
    return result;
  }

  @Throttle({ default: HOURLY(300) })
  @Post(":id/reponses")
  async answer(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body(new ZodPipe(reponses)) body: z.infer<typeof reponses>,
    @Query(new ZodPipe(rendu)) query: z.infer<typeof rendu>,
  ) {
    const list = body.reponses.map((x) => ({ question: x.question, valeur: x.valeur ?? null, unite: x.unite }));
    return this.quantitatifs.answer(tenant, id, list, { ecran: query.ecran === "1" });
  }

  @Throttle({ default: HOURLY(300) })
  @Post(":id/corrections")
  async correct(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body(new ZodPipe(correction)) body: z.infer<typeof correction>,
    @Query(new ZodPipe(rendu)) query: z.infer<typeof rendu>,
  ) {
    const c =
      body.action === "ajouter"
        ? { action: "ajouter" as const, ligne: ligneEntree(body.ligne) }
        : body.action === "modifier_ligne"
          ? { action: "modifier_ligne" as const, id: body.id, ligne: ligneEntree(body.ligne) }
          : body;
    return this.quantitatifs.correct(tenant, id, c, { ecran: query.ecran === "1" });
  }

  /** L'artisan valide la liste : elle peut partir en demande de prix. */
  @Post(":id/validation")
  @HttpCode(200)
  async validate(@Tenant() tenant: TenantContext, @Param("id") id: string, @Query(new ZodPipe(rendu)) query: z.infer<typeof rendu>) {
    return this.quantitatifs.validate(tenant, id, { ecran: query.ecran === "1" });
  }

  /** Rouvrir une liste validée pour la corriger. */
  @Post(":id/reouverture")
  @HttpCode(200)
  async reopen(@Tenant() tenant: TenantContext, @Param("id") id: string, @Query(new ZodPipe(rendu)) query: z.infer<typeof rendu>) {
    return this.quantitatifs.reopen(tenant, id, { ecran: query.ecran === "1" });
  }
}
