import { Body, Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { ZodPipe } from "../../../platform/http/zod.js";
import { CurrentUser, type AuthenticatedUser } from "../../identity/index.js";

const setBody = z.object({ enabled: z.boolean() });

/** Proposée au premier envoi, puis au troisième si refusée, puis plus jamais (réglable dans Compte). */
const PROMPT_AT = [0, 2];

/**
 * § 43.4 : l'autorisation de notifications n'est pas demandée à l'installation mais au premier envoi
 * fournisseur. L'écran est proposé au 1er envoi, reproposé au 3e si refusé, puis plus jamais ; le
 * réglage dans Compte permet de l'activer à tout moment. L'état vit ici ; l'autorisation du navigateur
 * et l'abonnement aux envois (v3.1, lien « une question ? ») viennent par-dessus.
 */
@Controller("v1/me/notifications")
export class NotificationsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async state(@CurrentUser() user: AuthenticatedUser) {
    return this.view(user.userId);
  }

  /** L'écran a été montré (« Activer » ou « Plus tard ») : on le compte, pour ne pas le reproposer sans fin. */
  @Post("prompted")
  @HttpCode(200)
  async prompted(@CurrentUser() user: AuthenticatedUser) {
    await this.prisma.user.update({ where: { id: user.userId }, data: { notificationsPromptCount: { increment: 1 } } });
    return this.view(user.userId);
  }

  @Post()
  @HttpCode(200)
  async set(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(setBody)) body: z.infer<typeof setBody>) {
    await this.prisma.user.update({ where: { id: user.userId }, data: { notificationsEnabledAt: body.enabled ? new Date() : null } });
    return this.view(user.userId);
  }

  private async view(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { notificationsPromptCount: true, notificationsEnabledAt: true } });
    const enabled = u.notificationsEnabledAt !== null;
    return {
      enabled,
      promptCount: u.notificationsPromptCount,
      /** À proposer après le prochain envoi fournisseur ? */
      askAtNextSend: !enabled && PROMPT_AT.includes(u.notificationsPromptCount),
    };
  }
}
