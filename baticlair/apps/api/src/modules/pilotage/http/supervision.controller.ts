import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { TYPES_EXCEPTION, estTypeException } from "@baticlair/domain";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";
import { PilotageService } from "../application/pilotage.service.js";
import { SupervisionService } from "../application/supervision.service.js";

const familleBody = z.object({ libelle: z.string().trim().min(2).max(80).optional(), ordre: z.number().int().min(0).max(999).optional(), active: z.boolean().optional() });
const nouvelleBody = z.object({ code: z.string().trim().min(2).max(40), libelle: z.string().trim().min(2).max(80) });
const resoudreBody = z.object({ note: z.string().trim().max(1000).nullable().optional() });
const signalerBody = z.object({ type: z.enum(TYPES_EXCEPTION), titre: z.string().trim().min(3).max(300), detail: z.string().trim().max(2000).nullable().optional() });

/**
 * LA SUPERVISION (lot 6) : familles, file d'exceptions, fiabilité des négoces. Réservée à GROUPE_ADMINS avec la double
 * authentification (`exiger`) ; chaque changement va au journal des accès.
 */
@Controller("v1/admin/pilotage")
export class SupervisionController {
  constructor(
    @Inject(PilotageService) private readonly pilotage: PilotageService,
    @Inject(SupervisionService) private readonly supervision: SupervisionService,
  ) {}

  @Get("familles")
  async familles(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.supervision.familles();
  }

  @Put("familles/:code")
  async changerFamille(@CurrentUser() user: AuthenticatedUser, @Param("code") code: string, @Body(new ZodPipe(familleBody)) b: z.infer<typeof familleBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "famille_modifiee", code.slice(0, 40));
    return this.supervision.changerFamille(code.slice(0, 40), { ...(b.libelle !== undefined ? { libelle: b.libelle } : {}), ...(b.ordre !== undefined ? { ordre: b.ordre } : {}), ...(b.active !== undefined ? { active: b.active } : {}) });
  }

  @Post("familles")
  async ajouterFamille(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(nouvelleBody)) b: z.infer<typeof nouvelleBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "famille_ajoutee", b.code);
    return this.supervision.ajouterFamille(b);
  }

  @Get("exceptions")
  async exceptions(@CurrentUser() user: AuthenticatedUser, @Query("statut") statut?: string, @Query("type") type?: string) {
    await this.pilotage.exiger(user);
    return this.supervision.exceptions({ statut: statut === "resolue" ? "resolue" : "ouverte", ...(type && estTypeException(type) ? { type } : {}) });
  }

  @Post("exceptions/:id/resoudre")
  @HttpCode(200)
  async resoudre(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body(new ZodPipe(resoudreBody)) b: z.infer<typeof resoudreBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "exception_resolue", id.slice(0, 40));
    return this.supervision.resoudre(id, user.email, b.note ?? null);
  }

  @Post("exceptions")
  async signaler(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(signalerBody)) b: z.infer<typeof signalerBody>) {
    await this.pilotage.exiger(user);
    await this.pilotage.journal(user, "exception_signalee", b.type);
    return this.supervision.signaler({ type: b.type, titre: b.titre, detail: b.detail ?? null }, user.email);
  }

  @Get("negoces/fiabilite")
  async fiabilite(@CurrentUser() user: AuthenticatedUser) {
    await this.pilotage.exiger(user);
    return this.supervision.fiabilite();
  }
}
