import { z } from "zod";

/**
 * Configuration validée au démarrage : l'application refuse de démarrer si
 * une variable obligatoire manque ou est invalide (docs/architecture.md).
 * Les messages d'erreur citent les NOMS de variables, jamais leurs valeurs.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    DATABASE_URL: z.string().min(1),
    /** Secret de signature des sessions (≥ 32 caractères). */
    AUTH_SECRET: z.string().min(32),
    /** URL publique de l'API (liens de vérification d'e-mail, OAuth). */
    API_PUBLIC_URL: z.url().default("http://localhost:4000"),
    /** URL de l'application web (CORS, redirections après vérification). */
    WEB_APP_URL: z.url().default("http://localhost:3000"),
    /**
     * Envoi des e-mails transactionnels. Seuls des adapters de développement
     * existent pour l'instant : `console` (affiche dans les logs) et
     * `capture` (tests). Aucun envoi réel n'est encore branché.
     */
    EMAIL_PROVIDER: z.enum(["console", "capture"]).default("console"),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
    MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    const isDeployed = env.NODE_ENV === "production" || env.NODE_ENV === "staging";
    if (isDeployed && (env.EMAIL_PROVIDER === "console" || env.EMAIL_PROVIDER === "capture")) {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "un fournisseur d'e-mail réel est obligatoire hors développement",
      });
    }
    for (const provider of ["GOOGLE", "MICROSOFT"] as const) {
      if (Boolean(env[`${provider}_CLIENT_ID`]) !== Boolean(env[`${provider}_CLIENT_SECRET`])) {
        ctx.addIssue({
          code: "custom",
          path: [`${provider}_CLIENT_SECRET`],
          message: `${provider}_CLIENT_ID et ${provider}_CLIENT_SECRET vont ensemble`,
        });
      }
    }
  });

export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

export interface AppConfig {
  env: "development" | "test" | "staging" | "production";
  port: number;
  logLevel: string;
  databaseUrl: string;
  authSecret: string;
  apiPublicUrl: string;
  webAppUrl: string;
  emailProvider: "console" | "capture";
  oauth: { google?: OAuthClientConfig; microsoft?: OAuthClientConfig };
}

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Configuration invalide :\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ConfigError";
  }
}

export function loadConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`),
    );
  }
  const e = parsed.data;
  const oauth = (id?: string, secret?: string) => (id && secret ? { clientId: id, clientSecret: secret } : undefined);
  const google = oauth(e.GOOGLE_CLIENT_ID, e.GOOGLE_CLIENT_SECRET);
  const microsoft = oauth(e.MICROSOFT_CLIENT_ID, e.MICROSOFT_CLIENT_SECRET);
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    authSecret: e.AUTH_SECRET,
    apiPublicUrl: e.API_PUBLIC_URL,
    webAppUrl: e.WEB_APP_URL,
    emailProvider: e.EMAIL_PROVIDER,
    oauth: { ...(google ? { google } : {}), ...(microsoft ? { microsoft } : {}) },
  };
}
