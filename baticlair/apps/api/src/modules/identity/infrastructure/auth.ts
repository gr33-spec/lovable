import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { PREVIEW_ORIGIN_JOKER, type AppConfig } from "../../../platform/config/config.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { resetPasswordEmail, verificationEmail } from "./emails.js";
import { NOM_APP } from "@baticlair/domain";

export const AUTH_BASE_PATH = "/v1/auth";

/**
 * Instance Better Auth (ADR-0007). Elle ne sort pas du module identity :
 * le reste de l'application ne connaît que `AuthenticatedUser`.
 *
 * Décision produit PD-015 : la vérification de l'e-mail n'empêche pas de
 * commencer à utiliser le produit ; elle sera exigée avant tout envoi vers
 * des tiers (demandes de prix aux fournisseurs).
 */
/** La clé du réglage admin « couper les inscriptions gratuites » (`parametre_groupe`). */
export const CLE_INSCRIPTIONS_FERMEES = "inscriptions:fermees";

export function createAuth(config: AppConfig, prisma: PrismaService, email: TransactionalEmailSender) {
  const { google, microsoft } = config.oauth;
  return betterAuth({
    appName: NOM_APP,
    baseURL: config.apiPublicUrl,
    basePath: AUTH_BASE_PATH,
    secret: config.authSecret,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    trustedOrigins: [...config.webAppOrigins, ...(config.previewOriginPattern ? [PREVIEW_ORIGIN_JOKER] : [])],
    telemetry: { enabled: false },
    // Recentrage (Greg, 25 octobre 2026) : l'admin peut couper temporairement les inscriptions gratuites (coût IA) ;
    // un nouveau compte est alors refusé avec une phrase claire. Les comptes existants ne changent pas.
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            const p = await prisma.parametreGroupe.findUnique({ where: { cle: CLE_INSCRIPTIONS_FERMEES } });
            if (p?.valeur === true) throw new APIError("FORBIDDEN", { message: "Les inscriptions sont fermées pour quelques jours. Réessaie bientôt.", code: "INSCRIPTIONS_FERMEES" });
          },
        },
      },
    },
    session: {
      // Session longue et glissante : l'artisan ne ressaisit pas son mot de passe sans cesse.
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await email.send(resetPasswordEmail(user.email, user.name, url));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await email.send(verificationEmail(user.email, user.name, url));
      },
    },
    // NON CONNECTÉ tant que les identifiants OAuth ne sont pas fournis.
    socialProviders: {
      ...(google ? { google: { clientId: google.clientId, clientSecret: google.clientSecret } } : {}),
      ...(microsoft ? { microsoft: { clientId: microsoft.clientId, clientSecret: microsoft.clientSecret } } : {}),
    },
    // Force brute et inscriptions en rafale : compteurs par adresse IP, en base (partagés entre
    // les instances). Les fenêtres sont courtes : un artisan qui se trompe trois fois n'est pas gêné.
    rateLimit: {
      enabled: config.rateLimit.enabled,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 3600, max: 5 },
        "/request-password-reset": { window: 3600, max: 3 },
        "/forget-password": { window: 3600, max: 3 },
        "/send-verification-email": { window: 3600, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: config.env === "production" || config.env === "staging",
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
