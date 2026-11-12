import { Body, Controller, HttpCode, Inject, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Throttle } from "@nestjs/throttler";
import type { QuestionNumerotee } from "@baticlair/domain";
import { z } from "zod";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { validationFailed } from "../../../platform/errors/domain-error.js";
import { AssistantIaService, type PhotoAssistant } from "../application/assistant-ia.service.js";
import { InterpretationService } from "../application/interpretation.service.js";

const question = z.object({
  numero: z.number().int().min(1).max(50),
  cle: z.string().min(1).max(200),
  texte: z.string().min(1).max(400),
  options: z.array(z.object({ label: z.string().max(120), value: z.string().max(120) })).max(20),
  unite: z.string().max(20).nullable(),
  libre: z.enum(["number", "text", "written"]).optional(),
  numerique: z.boolean().optional(),
});
const body = z.object({ questions: z.array(question).min(1).max(30), texte: z.string().max(2000) });
/** La conversation en cours de l'assistant : ce que l'artisan a dit et les questions posées, dans l'ordre ; le dernier est de l'artisan. */
const echange = z.object({ de: z.enum(["artisan", "assistant", "photo"]), texte: z.string().min(1).max(2000) });
const description = z.object({ echanges: z.array(echange).min(1).max(20) }).refine((d) => d.echanges[d.echanges.length - 1]!.de === "artisan", { message: "Le dernier message est celui de l'artisan." });

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 4_000_000;

/** Le type d'une image, lu dans ses premiers octets (jamais dans le nom ni le type annoncé). */
function typeDeLImage(b: Buffer): PhotoAssistant["mediaType"] | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/**
 * LOT 7 : `POST /v1/assistant/interpretation`. La réponse libre de l'artisan rattachée à ses questions : le code d'abord,
 * l'IA ensuite seulement si `INTERPRETE_IA=on` ; rien n'est enregistré ici (le serveur revalide chaque réponse au calcul).
 */
@Controller("v1/assistant")
@UseGuards(TenantGuard)
export class InterpretationController {
  constructor(
    @Inject(InterpretationService) private readonly service: InterpretationService,
    @Inject(AssistantIaService) private readonly assistant: AssistantIaService,
  ) {}

  /**
   * `POST /v1/assistant/description` (Greg, 12 novembre 2026 : « Ici, je veux une IA connectée ») : ce que l'artisan dit ou
   * écrit, découpé en articles, avec les questions du comptoir. Éteint (`ASSISTANT_IA=off`) : le code seul lit la phrase.
   */
  @Throttle({ default: HOURLY(120) })
  @Post("description")
  @HttpCode(200)
  decrire(@Tenant() tenant: TenantContext, @Body(new ZodPipe(description)) b: z.infer<typeof description>) {
    return this.assistant.decrire(b.echanges, { companyId: tenant.companyId, userId: tenant.userId ?? null });
  }

  /**
   * `POST /v1/assistant/photo` (Greg, 12 novembre 2026 : « un artisan doit pouvoir donner une photo pour aider l'IA à
   * comprendre le contexte du chantier […] La partie photo servira aussi à prendre en photo une liste de matériaux. L'IA
   * devra s'adapter ») : une à trois photos (JPEG, PNG ou WebP, réduites par l'écran) et la conversation en cours. Le modèle
   * dit ce qu'elles montrent ; un chantier donne ses matériaux à confirmer, une liste ou un devis repartent à la lecture de
   * document. Rien n'est gardé ici. Éteint : `nature` null, l'écran fait comme avant.
   */
  @Throttle({ default: HOURLY(40) })
  @Post("photo")
  @HttpCode(200)
  @UseInterceptors(FilesInterceptor("file", MAX_PHOTOS, { storage: memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS } }))
  photo(@Tenant() tenant: TenantContext, @UploadedFiles() files: { originalname: string; buffer: Buffer }[] | undefined, @Body(new ZodPipe(z.object({ echanges: z.string().max(60_000).optional() }))) b: { echanges?: string | undefined }) {
    if (!files?.length) throw validationFailed("A photo is required", { reason: "photo_absente" });
    const photos: PhotoAssistant[] = files.map((f) => {
      const mediaType = typeDeLImage(f.buffer);
      if (!mediaType) throw validationFailed("Not a photo", { reason: "photo_illisible", message: "Cette photo n'est pas lisible. Reprends-la, ou choisis un fichier JPEG ou PNG." });
      return { nom: f.originalname, mediaType, bytes: new Uint8Array(f.buffer) };
    });
    let avant: z.infer<typeof echange>[] = [];
    try {
      avant = z.array(echange).max(19).parse(b.echanges ? JSON.parse(b.echanges) : []);
    } catch {
      throw validationFailed("Invalid conversation", { reason: "echanges_invalides" });
    }
    // La photo est le message de l'artisan : s'il n'a rien écrit avec, une phrase neutre le dit au modèle.
    const echanges = avant.length && avant[avant.length - 1]!.de === "artisan" ? avant : [...avant, { de: "artisan" as const, texte: "Voici une photo." }];
    return this.assistant.decrire(echanges, { companyId: tenant.companyId, userId: tenant.userId ?? null }, photos);
  }

  @Throttle({ default: HOURLY(120) })
  @Post("interpretation")
  @HttpCode(200)
  interpreter(@Tenant() tenant: TenantContext, @Body(new ZodPipe(body)) b: z.infer<typeof body>) {
    return this.service.interpreter(b.questions as QuestionNumerotee[], b.texte, { companyId: tenant.companyId, userId: tenant.userId ?? null });
  }
}
