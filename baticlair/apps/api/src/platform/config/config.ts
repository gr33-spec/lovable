import { z } from "zod";
import { NOM_APP, lireTableNombres, lireZonesActives } from "@baticlair/domain";
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
    /** L'adresse du web ; plusieurs, séparées par des virgules, quand une prévisualisation en a une autre (la première sert aux liens). */
    WEB_APP_URL: z
      .string()
      .default("http://localhost:3000")
      .transform((v) => v.split(",").map((x) => x.trim().replace(/\/$/, "")).filter(Boolean))
      .pipe(z.array(z.url()).min(1)),
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
     * LES E-MAILS RÉELS (Greg, 24 octobre 2026) : le domaine vérifié chez Resend (« mobiiz.fr ») et l'adresse d'envoi
     * (« bonjour ») ; l'expéditeur devient « Mobiiz <bonjour@mobiiz.fr> ». EMAIL_FROM, s'il est donné, l'emporte.
     */
    EMAIL_DOMAINE: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).optional(),
    EMAIL_EXPEDITEUR: z.string().regex(/^[a-z0-9._-]+$/i).default("bonjour"),
    /**
     * L'adresse de « Répondre » de chaque e-mail (Greg, 25 octobre 2026 : les réponses arrivent dans sa boîte par le
     * renvoi de bonjour@mobiiz.fr). Par défaut, l'adresse de l'expéditeur. Un e-mail qui doit répondre ailleurs
     * (l'artisan qui commande, l'adresse d'un lot) garde la sienne.
     */
    EMAIL_REPONDRE_A: z.string().email().optional(),
    /**
     * La liste blanche de la PRÉVISUALISATION : adresses ou domaines (« @exemple.fr »), séparés par des virgules. Les
     * autres destinataires sont redirigés vers EMAIL_REDIRECTION (objet « [TEST → destinataire réel] … »). Obligatoire
     * pour envoyer de vrais e-mails depuis une prévisualisation ; ignorée en production.
     */
    EMAILS_AUTORISES: z.string().optional(),
    EMAIL_REDIRECTION: z.email().optional(),
    /**
     * Taille maximale d'un document déposé : 20 Mo par défaut (un devis scanné).
     * Au-delà de 4 Mo, le navigateur l'envoie en morceaux (`UploadParts`) :
     * une requête vers une fonction Vercel ne dépasse pas 4,5 Mo.
     */
    DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().max(50_000_000).default(20_000_000),
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
     * - `anthropic` : appels réels (BATICLAIR_ANTHROPIC_KEY, sinon ANTHROPIC_API_KEY) ;
     * - `disabled`  : pas d'IA, et l'application le dit ;
     * - `fake`      : extraction simulée, déterministe (développement et tests uniquement).
     * Par défaut : `anthropic` si une clé est fournie, sinon `disabled`.
     */
    AI_PROVIDER: z.enum(["anthropic", "disabled", "fake"]).optional(),
    /** La clé de l'app (Vercel, décision du fondateur 2026-10-12), lue avant ANTHROPIC_API_KEY. */
    BATICLAIR_ANTHROPIC_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    /**
     * Modèle de LECTURE du devis (appel IA n° 1). Décision du fondateur (2026-10-05) : l'IA la plus puissante pour
     * lire ; on redescendra quand les tiroirs seront bien entraînés.
     */
    AI_EXTRACTION_MODEL: z.string().min(1).default("claude-opus-5-5"),
    /**
     * Appel IA n° 2, le quantitatif en un passage (décision du fondateur, 2026-10-06 : 2 appels IA max par devis) :
     * `on` par défaut, `off` pour ne garder que la lecture et le moteur.
     */
    AI_QUANTITATIF: z.enum(["on", "off"]).default("on"),
    /** Modèle de l'appel n° 2 (il lit un dossier en texte, pas le PDF) : Sonnet 5.5 (§41 : Sonnet pour le raisonnement métier). */
    AI_QUANTITATIF_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
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
     * Le paywall (limite de chantiers des formules) : EN PAUSE par défaut (fondateur, 2026-10-11 : « fais en sorte que je
     * puisse utiliser pour l'instant, on mettra le paywall actif plus tard ») ; `on` le rallume.
     */
    PAYWALL: z.enum(["on", "off"]).default("off"),
    /**
     * L'ABONNEMENT ARTISAN (Greg, 24 octobre 2026 : 49 € HT par mois ou 348 € HT par an, essai, paywall sur déposer, voir les résultats,
     * commander, recommander) : `on` par défaut ; `off` ouvre tout (aucun paywall, aucune facture).
     */
    ABONNEMENT: z.enum(["on", "off"]).default("on"),
    /**
     * Le paiement : `simule` (page « Paiement (simulation) », factures « TEST », aucun argent) ou `stripe` (Checkout,
     * portail, webhooks signés ; `docs/groupe/STRIPE.md`). Les deux envoient les mêmes événements.
     */
    PAIEMENT: z.enum(["simule", "stripe"]).default("simule"),
    STRIPE_SECRET_KEY: z.string().min(8).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(8).optional(),
    /** Le prix MENSUEL créé chez Stripe (« price_… »), 49 € HT, récurrent tous les mois. */
    STRIPE_PRICE_ID_MENSUEL: z.string().min(4).optional(),
    /** Le prix ANNUEL créé chez Stripe (« price_… »), 348 € HT, récurrent tous les ans. */
    STRIPE_PRICE_ID_ANNUEL: z.string().min(4).optional(),
    /** Ancien nom du prix mensuel (une seule formule à 29 €) : lu seulement si `STRIPE_PRICE_ID_MENSUEL` manque. */
    STRIPE_PRICE_ID: z.string().min(4).optional(),
    /** Le taux de TVA créé chez Stripe (« txr_… », 20 %, non inclus) appliqué à l'abonnement. */
    STRIPE_TAX_RATE_ID: z.string().min(4).optional(),
    /**
     * L'identifiant du point d'accès Neon de la base de PRODUCTION (« ep-… »), donné aux seules prévisualisations : une
     * prévisualisation dont la base le contient refuse de démarrer (et de migrer, `scripts/garde-base-preview.mjs`).
     */
    BASE_PRODUCTION_HOTE: z.string().min(4).optional(),
    /**
     * BatiClair Groupé (document du fondateur, 2026-10-19) : DÉSACTIVÉ par défaut, « rien en prod sans mon accord
     * explicite » ; `on` l'ouvre (écrans, regroupement, envois aux négoces).
     */
    GROUPE: z.enum(["on", "off"]).default("off"),
    /** Le regroupement du mois (Greg, 22 octobre 2026) par défaut ; `lots` rallume l'ancien regroupement au fil de l'eau. */
    COMMANDE_COMMUNE: z.enum(["mois", "lots"]).default("mois"),
    /** Clé d'intégration de l'API Sirene de l'INSEE (vérification du SIRET avant le groupé). Vide : vérification indisponible. */
    INSEE_API_KEY: z.string().min(1).optional(),
    /**
     * Vérification du SIRET : `insee` (l'API Sirene, la seule admise en production) ou `forme` (un SIRET bien formé vaut
     * vérifié : prévisualisation seulement, décision du fondateur, 2026-10-20). Refusé en production Vercel.
     */
    SIRET_VERIFICATION: z.enum(["insee", "forme"]).default("insee"),
    /**
     * L'émetteur de la facture de commission du groupé (décision du fondateur, 2026-10-20) : en variables, jamais en dur.
     * Les cinq vont ensemble ; sans elles, la facture dit « émetteur non configuré » et Greg est prévenu par le journal.
     */
    FACTURE_EMETTEUR_NOM: z.string().min(1).optional(),
    FACTURE_EMETTEUR_FORME: z.string().min(1).optional(),
    FACTURE_EMETTEUR_SIRET: z.string().min(9).optional(),
    FACTURE_EMETTEUR_ADRESSE: z.string().min(5).optional(),
    FACTURE_EMETTEUR_TVA: z.string().min(4).optional(),
    /** La TVA sur la commission, en pour cent (assujettie : 20). */
    FACTURE_TVA_POURCENT: z.coerce.number().min(0).max(100).default(20),
    /**
     * La facturation automatique des négoces (Greg, 24 octobre 2026 : plus de commission de 2 %). Éteinte par défaut : aucune
     * facture n'est émise ni relancée, aucun accord ne porte de taux. Le code reste, prêt pour une commission future
     * (« avec un préavis de 60 jours et l'accord du négoce »).
     */
    FACTURATION_NEGOCE: z.enum(["on", "off"]).default("off"),
    /** Le domaine des adresses de réponse des lots (`lot-<n°>@<domaine>`, webhook Resend entrant). Vide : pas d'adresse de réponse. */
    REPONSES_DOMAINE: z.string().min(3).optional(),
    /** Le secret de signature du webhook Resend (Svix, « whsec_… »). Vide : webhook fermé. */
    RESEND_WEBHOOK_SECRET: z.string().min(8).optional(),
    /** Les e-mails qui voient l'admin du groupé (étape 9) ; vides : les validateurs du référentiel (Greg). */
    GROUPE_ADMINS: z.string().optional(),
    /** Les départements où le groupé est ouvert (« 22,29 »), ou « * » pour tous (défaut). Décision du 2026-10-20 : le 22 d'abord en prod. */
    GROUPE_DEPARTEMENTS: z.string().default("*"),
    /**
     * Recentrage (Greg, 25 octobre 2026) : les départements où les regroupements existent (« 22 » au départ ; « * » :
     * tous). Hors zone active, l'artisan a tout sauf les regroupements. `GROUPE_DEPARTEMENTS` (s'il n'est pas « * ») prime.
     */
    ZONES_ACTIVES: z.string().default("22"),
    /** Le montant HT estimé (euros) sous lequel une ligne ne se regroupe pas. */
    SEUIL_LIGNE_GROUPABLE: z.coerce.number().min(0).default(1000),
    /** Sous ce nombre de participants, seulement « Regroupement en cours ». */
    SEUIL_ANONYMAT: z.coerce.number().int().min(2).default(5),
    /** Volume minimum par famille à la clôture, en euros HT estimés (« couverture=5000,charpente=4000 ») ; vide : défauts du domaine. */
    SEUIL_VOLUME_MIN: z.string().optional(),
    /** Les prix repères HT par type et unité, pour estimer une ligne (« ardoise:pieces=1.2,zinc:m=18 ») ; vide : aucun. */
    PRIX_REPERES: z.string().optional(),
    /** Les familles dont les gros articles se regroupent (« couverture,charpente,second_oeuvre »). */
    FAMILLES_GROUPABLES: z.string().default("couverture,charpente,second_oeuvre"),
    /** Gratuit : lectures de devis par mois. */
    LECTURES_GRATUITES_MOIS: z.coerce.number().int().min(0).default(2),
    /** Sous ce nombre d'artisans actifs dans une zone, le payant y est offert. */
    SEUIL_ZONE_ACTIVE: z.coerce.number().int().min(1).default(10),
    /**
     * Business model final (Greg, 25 octobre 2026) : `humain` (défaut, un chasseur de Mobiiz négocie) ou `automatique`
     * (la consultation des négoces par cycles, gardée telle quelle). L'admin peut basculer sans redéployer.
     */
    MODE_REGROUPEMENT: z.enum(["humain", "automatique"]).default("humain"),
    /** Les chasseurs d'opportunités (e-mails) : un rôle à part, distinct de l'admin complet (GROUPE_ADMINS). */
    CHASSEURS: z.string().optional(),
    COMMISSION_DEFAUT: z.coerce.number().min(0).max(20).default(2),
    /** Point 4 bis : l'adresse des alertes du chasseur (défaut : le premier admin) et le délai de livraison avant la date de besoin. */
    EMAIL_CHASSEUR: z.string().email().optional(),
    DELAI_LIVRAISON_JOURS: z.coerce.number().int().min(0).max(60).default(10),
    /** Codes NAF du commerce de matériaux acceptés à l'inscription d'un négoce (séparés par des virgules). */
    NAF_MATERIAUX: z.string().optional(),
    /** Vérification du SIRET des négoces par l'API Recherche d'entreprises : `on` en ligne, `fake` dans les tests. */
    RECHERCHE_ENTREPRISES: z.enum(["on", "off", "fake"]).optional(),
    /** La base négoces Sirene (bloc 3 du plan) : départements importés et codes NAF du négoce de matériaux. */
    SIRENE_DEPARTEMENTS: z.string().default("22,29,35,56"),
    SIRENE_NAF: z.string().default("46.73A,46.73B,47.52A,47.52B"),
    VERCEL_ENV: z.string().optional(),
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
    if (env.AI_PROVIDER === "anthropic" && !env.BATICLAIR_ANTHROPIC_KEY && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["BATICLAIR_ANTHROPIC_KEY"], message: "obligatoire avec AI_PROVIDER=anthropic" });
    }
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "obligatoire avec EMAIL_PROVIDER=resend" });
    }
    if ((env.EMAIL_PROVIDER === "resend" || (!env.EMAIL_PROVIDER && env.RESEND_API_KEY)) && !env.EMAIL_FROM && !env.EMAIL_DOMAINE) {
      ctx.addIssue({ code: "custom", path: ["EMAIL_DOMAINE"], message: "obligatoire pour envoyer des e-mails (ou EMAIL_FROM)" });
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
  /** Toutes les origines web acceptées (CORS, origines de confiance de l'authentification). */
  webAppOrigins: string[];
  /**
   * En prévisualisation Vercel, les adresses de prévisualisation du web (`https://<…>-gr33-spec.vercel.app`) sont
   * acceptées d'office : le fondateur teste une branche depuis son téléphone sans poser l'adresse à la main.
   */
  previewOriginPattern: RegExp | null;
  emailProvider: "resend" | "disabled" | "console" | "capture";
  resend?: { apiKey: string; from: string; replyTo?: string };
  /** La liste blanche de la prévisualisation (null en production et en local). */
  emailGarde: { autorises: string[]; redirigerVers: string | null } | null;
  oauth: { google?: OAuthClientConfig; microsoft?: OAuthClientConfig };
  documents: { maxBytes: number; maxPages: number };
  aiCost: { usdToEur: string; monthlyBudgetEur: string; analysisMaxEur: string };
  /** E-mails (en minuscules) des validateurs du référentiel. */
  referentialValidators: string[];
  billing: { plans: Plan[]; activationCodes: Record<string, string>; enforced: boolean };
  /** L'abonnement artisan (`ABONNEMENT`, `PAIEMENT`). */
  abonnement: {
    actif: boolean;
    paiement: "simule" | "stripe";
    stripe: { secretKey: string; webhookSecret: string; prix: { mensuel: string; annuel: string }; taxRateId: string | null } | null;
  };
  /** BatiClair Groupé : désactivé par défaut (`GROUPE=on` l'ouvre). */
  groupe: {
    enabled: boolean;
    inseeApiKey: string | null;
    siretVerification: "insee" | "forme";
    facture: { emetteur: { nom: string; forme: string | null; siret: string; adresse: string; tvaIntracom: string } | null; tvaPourcent: number; active: boolean };
    reponsesDomaine: string | null;
    resendWebhookSecret: string | null;
    admins: string[];
    /** `null` = tous les départements ; sinon la liste des départements ouverts. */
    departements: string[] | null;
    /** Recentrage (25 octobre 2026) : seuils et réglages des regroupements, du gratuit et du payant. */
    recentrage: { seuilLigneHt: number; seuilAnonymat: number; seuilVolumeMin: Record<string, number> | null; prixReperes: Record<string, number>; familles: string[]; lecturesGratuites: number; seuilZoneActive: number };
    /** Le regroupement négocié par un humain (business model final, 25 octobre 2026). */
    negocie: { mode: "humain" | "automatique"; chasseurs: string[]; commissionDefaut: number; emailChasseur: string | null; delaiLivraisonJours: number; naf: string[] | null; rechercheEntreprises: "on" | "off" | "fake" };
    /** mois : un regroupement par mois (Greg, 22 octobre 2026) ; lots : l'ancien regroupement au fil de l'eau. */
    mode: "mois" | "lots";
    sirene: { departements: string[]; naf: string[] };
  };
  rateLimit: { enabled: boolean };
  alerts: { webhookUrl?: string; email?: string };
  cronSecret?: string;
  ai: {
    provider: "anthropic" | "disabled" | "fake";
    apiKey?: string;
    /** Le nom de la variable d'où vient la clé (jamais sa valeur), dit par la route de santé. */
    keySource: "BATICLAIR_ANTHROPIC_KEY" | "ANTHROPIC_API_KEY" | null;
    extractionModel: string;
    quantitatif: boolean;
    quantitatifModel: string;
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

/** Les adresses de prévisualisation Vercel du compte gr33-spec (jamais un autre compte). */
export const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+-gr33-spec\.vercel\.app$/;
/** La même règle, écrite pour les origines de confiance de l'authentification (jokers sur l'hôte). */
export const PREVIEW_ORIGIN_JOKER = "https://*-gr33-spec.vercel.app";

export function originesAcceptees(config: Pick<AppConfig, "webAppOrigins" | "previewOriginPattern">, origin: string | undefined): boolean | null {
  if (!origin) return null;
  return config.webAppOrigins.includes(origin) || (config.previewOriginPattern?.test(origin) ?? false);
}

export function loadConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`),
    );
  }
  const e = parsed.data;
  const apiKey = e.BATICLAIR_ANTHROPIC_KEY ?? e.ANTHROPIC_API_KEY;
  let plans: Plan[];
  try {
    plans = parsePlans(e.BILLING_PLANS);
  } catch (err) {
    throw new ConfigError([`BILLING_PLANS : ${err instanceof Error ? err.message : String(err)}`]);
  }
  const isDeployed = e.NODE_ENV === "production" || e.NODE_ENV === "staging";
  const problemes: string[] = [];
  const prixMensuel = e.STRIPE_PRICE_ID_MENSUEL ?? e.STRIPE_PRICE_ID;
  if (e.PAIEMENT === "stripe" && !(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET && prixMensuel && e.STRIPE_PRICE_ID_ANNUEL)) {
    problemes.push("PAIEMENT : « stripe » demande STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MENSUEL et STRIPE_PRICE_ID_ANNUEL");
  }
  // La prévisualisation ne touche jamais la base de production (Greg, 24 octobre 2026).
  if (e.VERCEL_ENV === "preview" && e.BASE_PRODUCTION_HOTE && e.DATABASE_URL.includes(e.BASE_PRODUCTION_HOTE)) {
    problemes.push("DATABASE_URL : cette prévisualisation pointe sur la base de production (BASE_PRODUCTION_HOTE)");
  }
  // Un paiement simulé en production donnerait l'accès sans payer.
  if (e.PAIEMENT === "simule" && e.ABONNEMENT === "on" && e.VERCEL_ENV === "production") {
    problemes.push("PAIEMENT : « simule » est réservé à la prévisualisation ; en production, PAIEMENT=stripe (ou ABONNEMENT=off)");
  }
  if (e.SIRET_VERIFICATION === "forme" && e.VERCEL_ENV === "production") {
    problemes.push("SIRET_VERIFICATION : « forme » est réservé à la prévisualisation, jamais en production");
  }
  const autorises = (e.EMAILS_AUTORISES ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const envoiReel = e.EMAIL_PROVIDER === "resend" || (!e.EMAIL_PROVIDER && !!e.RESEND_API_KEY);
  if (e.VERCEL_ENV === "preview" && envoiReel && autorises.length === 0) {
    problemes.push("EMAILS_AUTORISES : obligatoire pour envoyer de vrais e-mails depuis une prévisualisation (la liste blanche)");
  }
  const emailFrom = e.EMAIL_FROM ?? (e.EMAIL_DOMAINE ? `${NOM_APP} <${e.EMAIL_EXPEDITEUR}@${e.EMAIL_DOMAINE}>` : undefined);
  const emailReponse = e.EMAIL_REPONDRE_A ?? (e.EMAIL_DOMAINE ? `${e.EMAIL_EXPEDITEUR}@${e.EMAIL_DOMAINE}` : undefined);
  if (problemes.length) throw new ConfigError(problemes);
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
    webAppUrl: e.WEB_APP_URL[0]!,
    webAppOrigins: e.WEB_APP_URL,
    previewOriginPattern: e.VERCEL_ENV === "preview" ? PREVIEW_ORIGIN : null,
    emailProvider,
    ...(emailProvider === "resend" && e.RESEND_API_KEY && emailFrom
      ? { resend: { apiKey: e.RESEND_API_KEY, from: emailFrom, ...(emailReponse ? { replyTo: emailReponse } : {}) } }
      : {}),
    emailGarde: e.VERCEL_ENV !== "production" && autorises.length > 0 ? { autorises, redirigerVers: e.EMAIL_REDIRECTION?.toLowerCase() ?? autorises.find((x) => !x.startsWith("@")) ?? null } : null,
    oauth: { ...(google ? { google } : {}), ...(microsoft ? { microsoft } : {}) },
    documents: { maxBytes: e.DOCUMENT_MAX_BYTES, maxPages: e.DOCUMENT_MAX_PAGES },
    aiCost: { usdToEur: e.AI_USD_TO_EUR, monthlyBudgetEur: e.AI_MONTHLY_BUDGET_EUR, analysisMaxEur: e.AI_ANALYSIS_MAX_EUR },
    referentialValidators: (e.REFERENTIAL_VALIDATORS ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.length > 0),
    billing: { plans, activationCodes: parseActivationCodes(e.PLAN_ACTIVATION_CODES), enforced: e.PAYWALL === "on" },
    abonnement: {
      actif: e.ABONNEMENT === "on",
      paiement: e.PAIEMENT,
      stripe:
        e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET && prixMensuel && e.STRIPE_PRICE_ID_ANNUEL
          ? { secretKey: e.STRIPE_SECRET_KEY, webhookSecret: e.STRIPE_WEBHOOK_SECRET, prix: { mensuel: prixMensuel, annuel: e.STRIPE_PRICE_ID_ANNUEL }, taxRateId: e.STRIPE_TAX_RATE_ID ?? null }
          : null,
    },
    groupe: {
      enabled: e.GROUPE === "on",
      inseeApiKey: e.INSEE_API_KEY ?? null,
      siretVerification: e.SIRET_VERIFICATION,
      facture: {
        emetteur:
          e.FACTURE_EMETTEUR_NOM && e.FACTURE_EMETTEUR_SIRET && e.FACTURE_EMETTEUR_ADRESSE && e.FACTURE_EMETTEUR_TVA
            ? { nom: e.FACTURE_EMETTEUR_NOM, forme: e.FACTURE_EMETTEUR_FORME ?? null, siret: e.FACTURE_EMETTEUR_SIRET, adresse: e.FACTURE_EMETTEUR_ADRESSE, tvaIntracom: e.FACTURE_EMETTEUR_TVA }
            : null,
        tvaPourcent: e.FACTURE_TVA_POURCENT,
        active: e.FACTURATION_NEGOCE === "on",
      },
      reponsesDomaine: e.REPONSES_DOMAINE ?? null,
      resendWebhookSecret: e.RESEND_WEBHOOK_SECRET ?? null,
      admins: (e.GROUPE_ADMINS ?? e.REFERENTIAL_VALIDATORS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean),
      departements:
        e.GROUPE_DEPARTEMENTS.trim() !== "*"
          ? e.GROUPE_DEPARTEMENTS.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean)
          : e.ZONES_ACTIVES.trim() === "*"
            ? null
            : lireZonesActives(e.ZONES_ACTIVES),
      recentrage: {
        seuilLigneHt: e.SEUIL_LIGNE_GROUPABLE,
        seuilAnonymat: e.SEUIL_ANONYMAT,
        seuilVolumeMin: e.SEUIL_VOLUME_MIN ? lireTableNombres(e.SEUIL_VOLUME_MIN) : null,
        prixReperes: lireTableNombres(e.PRIX_REPERES),
        familles: e.FAMILLES_GROUPABLES.split(",").map((x) => x.trim()).filter(Boolean),
        lecturesGratuites: e.LECTURES_GRATUITES_MOIS,
        seuilZoneActive: e.SEUIL_ZONE_ACTIVE,
      },
      negocie: {
        mode: e.MODE_REGROUPEMENT,
        chasseurs: (e.CHASSEURS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean),
        commissionDefaut: e.COMMISSION_DEFAUT,
        emailChasseur: (e.EMAIL_CHASSEUR ?? (e.GROUPE_ADMINS ?? e.REFERENTIAL_VALIDATORS ?? "").split(",")[0] ?? "").trim().toLowerCase() || null,
        delaiLivraisonJours: e.DELAI_LIVRAISON_JOURS,
        naf: e.NAF_MATERIAUX ? e.NAF_MATERIAUX.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) : null,
        rechercheEntreprises: e.RECHERCHE_ENTREPRISES ?? (e.NODE_ENV === "test" ? "fake" : "on"),
      },
      mode: e.COMMANDE_COMMUNE,
      sirene: { departements: e.SIRENE_DEPARTEMENTS.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean), naf: e.SIRENE_NAF.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) },
    },
    rateLimit: { enabled: e.RATE_LIMIT === "on" },
    ...(e.CRON_SECRET ? { cronSecret: e.CRON_SECRET } : {}),
    alerts: { ...(e.ALERT_WEBHOOK_URL ? { webhookUrl: e.ALERT_WEBHOOK_URL } : {}), ...(e.ALERT_EMAIL ? { email: e.ALERT_EMAIL } : {}) },
    ai: {
      provider: e.AI_PROVIDER ?? (apiKey ? "anthropic" : "disabled"),
      ...(apiKey ? { apiKey } : {}),
      keySource: e.BATICLAIR_ANTHROPIC_KEY ? "BATICLAIR_ANTHROPIC_KEY" : e.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY" : null,
      extractionModel: e.AI_EXTRACTION_MODEL,
      quantitatif: e.AI_QUANTITATIF === "on",
      quantitatifModel: e.AI_QUANTITATIF_MODEL,
      effort: e.AI_EXTRACTION_EFFORT,
      answerWithinMs: e.READING_ANSWER_WITHIN_MS,
    },
  };
}
