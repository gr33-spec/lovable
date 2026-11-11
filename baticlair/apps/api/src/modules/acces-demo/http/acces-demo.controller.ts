import { Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response as ReponseExpress } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { CONFIG, AUTH } from "../../../platform/tokens.js";
import type { AppConfig } from "../../../platform/config/config.js";
import { DomainError } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Public, type Auth } from "../../identity/index.js";
import { AccesDemoService } from "../application/acces-demo.service.js";

/**
 * « Découvrir l'application » (Greg, 7 novembre 2026) : sans inscription ni mot de passe. RETIRÉ DU PUBLIC (Greg, 11
 * novembre 2026) : la landing n'a plus ce bouton ; le point d'entrée ne s'ouvre que si `ACCES_DEMO` ET `DEMO_PUBLIQUE`
 * sont allumés (coupés par défaut). Fermé, il répond « introuvable » (404), ne crée ni compte ni session, ne dit rien de plus.
 */
@Controller("v1/public/demo")
export class AccesDemoController {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(AccesDemoService) private readonly demo: AccesDemoService,
  ) {}

  /** La landing demande si le bouton existe. */
  @Public()
  @Get()
  etat() {
    return { actif: this.config.demoPublique };
  }

  /** Crée l'espace fictif du visiteur et ouvre sa session (cookie posé par l'authentification, comme une connexion). */
  @Public()
  @Throttle({ default: HOURLY(20) })
  @Post("session")
  @HttpCode(201)
  async session(@Req() req: Request, @Res({ passthrough: true }) res: ReponseExpress) {
    if (!this.config.demoPublique) throw new DomainError("not_found", "Not found");
    const { email, motDePasse } = await this.demo.ouvrir();
    // La réponse de l'authentification, décrite par ce qui sert (le type « Response » global n'existe pas dans la
    // compilation de Vercel).
    const reponse = (await this.auth.api.signInEmail({ body: { email, password: motDePasse, rememberMe: false }, headers: fromNodeHeaders(req.headers), asResponse: true })) as unknown as { ok: boolean; headers: { getSetCookie(): string[] } };
    if (!reponse.ok) throw new DomainError("internal_error", "La session de démonstration n'a pas pu s'ouvrir");
    for (const cookie of reponse.headers.getSetCookie()) res.append("Set-Cookie", cookie);
    return { demo: true };
  }
}
