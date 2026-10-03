import { z } from "zod";
import { parseActivationCodes, parsePlans, type Plan } from "./plans.js";

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
    /**
     * URL publique par laquelle les navigateurs joignent l'API. En ligne,
     * c'est l'adresse du site web, qui relaie /v1/* vers l'API (même
     * origine : cookies de session fiables, y compris sur Safari).
     */
    API_PUBLIC_URL: z.url().default("http://localhost:4000"),
    /** URL de l'application web (CORS, redirections après vérification). */
    WEB_APP_URL: z.url().default("http://localhost:3000"),
    /**
     * Envoi des e-mails transactionnels (vérification, mot de passe oublié) :
     * - `resend`   : envoi réel via Resend (RESEND_API_KEY, EMAIL_FROM) ;
     * - `disabled` : aucun envoi, et l'application le dit (mise en ligne sans clé) ;
     * - `console`  : affichés dans les logs (développement uniquement) ;
     * - `capture`  : conservés en mémoire (tests uniquement).
     * Par défaut : `resend` si une clé est fournie, sinon `console` en
     * développement et `disabled` en ligne.
     */
    EMAIL_PROVIDER: z.enum(["resend", "disabled", "console", "capture"]).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    /** Expéditeur, ex. « BatiClair <bonjour@mondomaine.fr> » (domaine vérifié chez Resend). */
    EMAIL_FROM: z.string().min(3).optional(),
    /**
     * Taille maximale d'un document déposé. 4 Mo par défaut : c'est sous la
     * limite d'une requête vers une fonction Vercel (4,5 Mo). Un devis
     * généré par un logiciel pèse rarement plus de 1 Mo.
     */
    DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().max(50_000_000).default(4_000_000),
    DOCUMENT_MAX_PAGES: z.coerce.number().int().positive().max(600).default(60),
    /** Taux de conversion utilisé pour AFFICHER les coûts IA en euros (les coûts sont stockés en dollars). */
    AI_USD_TO_EUR: z.string().regex(/^\d+(\.\d+)?$/).default("0.92"),
    /** Budget IA mensuel par entreprise en usage normal (prévision interne, PD-027). */
    AI_MONTHLY_BUDGET_EUR: z.string().regex(/^\d+(\.\d+)?$/).default("10"),
    /**
     * Garde-fou par document (PD-046) : au-delà de ce coût ESTIMÉ avant lecture,
     * le document n'est pas un devis normal (catalogue, annexes) et n'est pas
     * envoyé à l'IA. Un très gros devis (500 lignes scannées) reste bien en dessous.
     */
    /**
     * Comptes VALIDATEURS du référentiel (e-mails, séparés par des virgules) : ils voient les
     * calculs des règles encore en brouillon, marqués « provisoire », pour les valider sur de
     * vrais devis. Jamais ✓, jamais envoyés au fournisseur. Vide : personne.
     */
    REFERENTIAL_VALIDATORS: z.string().optional(),
    AI_ANALYSIS_MAX_EUR: z.string().regex(/^\d+(\.\d+)?$/).default("3"),
    /**
     * Lecture des devis par l'IA :
     * - `anthropic` : appels réels (ANTHROPIC_API_KEY) ;
     * - `disabled`  : pas d'IA, et l'application le dit ;
     * - `fake`      : extraction simulée, déterministe (développement et tests uniquement).
     * Par défaut : `anthropic` si une clé est fournie, sinon `disabled`.
     */
    AI_PROVIDER: z.enum(["anthropic", "disabled", "fake"]).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    /** Modèle d'extraction (audit des coûts : Sonnet 5.5, évalué contre Haiku à l'étape D). */
    AI_EXTRACTION_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
    AI_EXTRACTION_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("high"),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
    MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
    /** Catalogue des formules en JSON (voir modules/billing/application/plans.ts) ; défaut dans le code. */
    BILLING_PLANS: z.string().min(2).optional(),
    /** Codes d'activation manuelle d'une formule, pour les tests : « CODE:solo,AUTRE:pro ». Vide = désactivé. */
    PLAN_ACTIVATION_CODES: z.string().optional(),
    /**
     * Limitation de débit (connexion, inscription, dépôts de devis, lecture IA) : `on` partout,
     * `off` uniquement pour les tests automatisés qui enchaînent des centaines de requêtes.
     */
    RATE_LIMIT: z.enum(["on", "off"]).default("on"),
    /** Délai de réponse d'une lecture de devis : au-delà, « lecture en cours » et elle continue en arrière-plan. */
    /** Alertes de production (B5) : webhook (Slack, Discord, ntfy…) et/ou e-mail. Vide : pas d'alerte. */
    ALERT_WEBHOOK_URL: z.url().optional(),
    ALERT_EMAIL: z.email().optional(),
    /** Secret des tâches planifiées Vercel (purge des comptes inactifs) : Vercel l'envoie en « Bearer ». */
    CRON_SECRET: z.string().min(16).optional(),
    READING_ANSWER_WITHIN_MS: z.coerce.number().int().positive().max(60_000).default(8000),
  })
  .superRefine((env, ctx) => {
    const isDeployed = env.NODE_ENV === "production" || env.NODE_ENV === "staging";
    if (isDeployed && (env.EMAIL_PROVIDER === "console" || env.EMAIL_PROVIDER === "capture")) {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "« console » et « capture » sont réservés au développement et aux tests",
      });
    }
    if (isDeployed && env.RATE_LIMIT === "off") {
      ctx.addIssue({ code: "custom", path: ["RATE_LIMIT"], message: "la limitation de débit ne se coupe pas en ligne" });
    }
    if (isDeployed && env.AI_PROVIDER === "fake") {
      ctx.addIssue({ code: "custom", path: ["AI_PROVIDER"], message: "« fake » est réservé au développement et aux tests" });
    }
    if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "obligatoire avec AI_PROVIDER=anthropic" });
    }
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "obligatoire avec EMAIL_PROVIDER=resend" });
    }
    if ((env.EMAIL_PROVIDER === "resend" || (!env.EMAIL_PROVIDER && env.RESEND_API_KEY)) && !env.EMAIL_FROM) {
      ctx.addIssue({ code: "custom", path: ["EMAIL_FROM"], message: "obligatoire pour envoyer des e-mails" });
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
  emailProvider: "resend" | "disabled" | "console" | "capture";
  resend?: { apiKey: string; from: string };
  oauth: { google?: OAuthClientConfig; microsoft?: OAuthClientConfig };
  documents: { maxBytes: number; maxPages: number };
  aiCost: { usdToEur: string; monthlyBudgetEur: string; analysisMaxEur: string };
  /** E-mails (en minuscules) des validateurs du référentiel. */
  referentialValidators: string[];
  billing: { plans: Plan[]; activationCodes: Record<string, string> };
  rateLimit: { enabled: boolean };
  alerts: { webhookUrl?: string; email?: string };
  cronSecret?: string;
  ai: {
    provider: "anthropic" | "disabled" | "fake";
    apiKey?: string;
    extractionModel: string;
    effort: "low" | "medium" | "high" | "xhigh" | "max";
    /** Délai de réponse d'une lecture avant de passer en arrière-plan (ms). */
    answerWithinMs: number;
  };
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
  let plans: Plan[];
  try {
    plans = parsePlans(e.BILLING_PLANS);
  } catch (err) {
    throw new ConfigError([`BILLING_PLANS : ${err instanceof Error ? err.message : String(err)}`]);
  }
  const isDeployed = e.NODE_ENV === "production" || e.NODE_ENV === "staging";
  const emailProvider = e.EMAIL_PROVIDER ?? (e.RESEND_API_KEY ? "resend" : isDeployed ? "disabled" : "console");
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
    emailProvider,
    ...(emailProvider === "resend" && e.RESEND_API_KEY && e.EMAIL_FROM
      ? { resend: { apiKey: e.RESEND_API_KEY, from: e.EMAIL_FROM } }
      : {}),
    oauth: { ...(google ? { google } : {}), ...(microsoft ? { microsoft } : {}) },
    documents: { maxBytes: e.DOCUMENT_MAX_BYTES, maxPages: e.DOCUMENT_MAX_PAGES },
    aiCost: { usdToEur: e.AI_USD_TO_EUR, monthlyBudgetEur: e.AI_MONTHLY_BUDGET_EUR, analysisMaxEur: e.AI_ANALYSIS_MAX_EUR },
    referentialValidators: (e.REFERENTIAL_VALIDATORS ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.length > 0),
    billing: { plans, activationCodes: parseActivationCodes(e.PLAN_ACTIVATION_CODES) },
    rateLimit: { enabled: e.RATE_LIMIT === "on" },
    ...(e.CRON_SECRET ? { cronSecret: e.CRON_SECRET } : {}),
    alerts: { ...(e.ALERT_WEBHOOK_URL ? { webhookUrl: e.ALERT_WEBHOOK_URL } : {}), ...(e.ALERT_EMAIL ? { email: e.ALERT_EMAIL } : {}) },
    ai: {
      provider: e.AI_PROVIDER ?? (e.ANTHROPIC_API_KEY ? "anthropic" : "disabled"),
      ...(e.ANTHROPIC_API_KEY ? { apiKey: e.ANTHROPIC_API_KEY } : {}),
      extractionModel: e.AI_EXTRACTION_MODEL,
      effort: e.AI_EXTRACTION_EFFORT,
      answerWithinMs: e.READING_ANSWER_WITHIN_MS,
    },
  };
}
