import { Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";

/**
 * LE GUIDE DU PREMIER LANCEMENT (Greg, 24 octobre 2026) : trois écrans, une fois inscrit, sautables. Vu ou passé, il est
 * noté sur le compte : il ne revient plus d'office, ni sur ce téléphone ni sur un autre. « Revoir le guide » le rouvre
 * sans rien changer ici.
 */
@Controller("v1/me/guide")
export class GuideController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async state(@CurrentUser() user: AuthenticatedUser) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId }, select: { guideVuLe: true } });
    return { aMontrer: u.guideVuLe === null };
  }

  @Post("vu")
  @HttpCode(200)
  async vu(@CurrentUser() user: AuthenticatedUser) {
    await this.prisma.user.updateMany({ where: { id: user.userId, guideVuLe: null }, data: { guideVuLe: new Date() } });
    return { aMontrer: false };
  }
}
