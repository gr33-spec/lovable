import { Body, Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";

const cguBody = z.object({ version: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/) });

/**
 * Les CGU artisan (pages légales, plan du 20 octobre 2026) : la case « J'accepte les CGU » à la création du compte est
 * enregistrée ici, avec sa version (la date de la page). Sans date, l'app redemande l'acceptation.
 */
@Controller("v1/me/cgu")
export class CguController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async etat(@CurrentUser() user: AuthenticatedUser) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId }, select: { cguAccepteLe: true, cguVersion: true } });
    return { accepteLe: u.cguAccepteLe ? u.cguAccepteLe.toISOString() : null, version: u.cguVersion };
  }

  @Post()
  @HttpCode(200)
  async accepter(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(cguBody)) body: z.infer<typeof cguBody>) {
    await this.prisma.user.update({ where: { id: user.userId }, data: { cguAccepteLe: new Date(), cguVersion: body.version } });
    return this.etat(user);
  }
}
