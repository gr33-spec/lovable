import { type ExecutionContext, Global, Inject, Injectable, Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  type ThrottlerLimitDetail,
  ThrottlerGuard,
  ThrottlerModule,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import type { Request } from "express";
import type { AppConfig } from "../config/config.js";
import { PrismaService } from "../database/prisma.service.js";
import { DomainError } from "../errors/domain-error.js";
import { CONFIG } from "../tokens.js";

/** Requêtes qui ne créent rien : comptées seulement quand elles coûtent (voir `lectureACompter`). */
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/** Clé du plafond posé par `@Throttle` sur une route (constante de @nestjs/throttler, `THROTTLER:LIMIT` + nom). */
const THROTTLER_LIMIT = "THROTTLER:LIMIT";

/** Une lecture qui fabrique un fichier ou qui ouvre une page par jeton : comptée comme une écriture. */
export function lectureACompter(url: string): boolean {
  const chemin = (url.split("?")[0] ?? "").toLowerCase();
  if (/\.(pdf|xlsx|csv|zones)$/.test(chemin)) return true;
  if (/^\/v1\/(me|negoce)\/export$/.test(chemin)) return true;
  return /^\/v1\/(public|reponse|negoce|emails\/stop|fichiers-pro\/ouvrir|commande-du-mois|achat-groupe)\//.test(chemin);
}

/**
 * Compteurs en base : l'API tourne en plusieurs instances (fonctions serverless), une
 * mémoire locale ne verrait qu'une fraction du trafic. Une seule requête SQL, atomique,
 * par appel compté : la fenêtre repart quand elle est expirée, sinon le compteur monte.
 */
@Injectable()
export class PrismaThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Signature imposée par ThrottlerStorage ; la durée de blocage n'est pas utilisée (bloqué = au-dessus du plafond, jusqu'à la fin de la fenêtre).
  async increment(key: string, ttl: number, limit: number): ReturnType<ThrottlerStorage["increment"]> {
    const rows = await this.prisma.$queryRaw<{ hits: number; expiresAt: Date }[]>`
      INSERT INTO "api_rate_limit" ("key", "hits", "expiresAt")
      VALUES (${key}, 1, now() + make_interval(secs => ${ttl / 1000}))
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE WHEN "api_rate_limit"."expiresAt" <= now() THEN 1 ELSE "api_rate_limit"."hits" + 1 END,
        "expiresAt" = CASE WHEN "api_rate_limit"."expiresAt" <= now() THEN now() + make_interval(secs => ${ttl / 1000}) ELSE "api_rate_limit"."expiresAt" END
      RETURNING "hits", "expiresAt"`;
    const row = rows[0]!;
    const timeToExpire = Math.max(1, Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000));
    return { totalHits: row.hits, timeToExpire, isBlocked: row.hits > limit, timeToBlockExpire: timeToExpire };
  }
}

/**
 * Garde global de limitation de débit. Par adresse IP (derrière le relais Vercel, `trust proxy`
 * est réglé) : il s'exécute avant la session, l'identité n'est pas encore connue. Seules les
 * requêtes qui écrivent ou coûtent (dépôt, lecture IA, création) sont comptées ; les routes les
 * plus chères portent leur propre plafond avec `@Throttle`.
 */
@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {
    super(options, storage, reflector);
  }

  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (!this.config.rateLimit.enabled) return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (!READ_METHODS.has(req.method)) return false;
    // LECTURES LIMITÉES (audit du 27 novembre 2026, accord de Greg) : avant, AUCUNE lecture n'était comptée, même celles qui
    // portaient leur `@Throttle` (export PDF « 10 par heure » qui passait 14 fois). Une lecture est comptée quand sa route a
    // son propre plafond, ou quand elle fabrique un fichier (PDF, Excel, CSV) ou ouvre une page par jeton (négoces, liens
    // publics). Les autres lectures (écrans, suivi d'une lecture chaque seconde) restent libres : aucune écriture en base.
    if (req.method !== "GET") return true;
    const handler = context.getHandler();
    const classe = context.getClass();
    if (this.reflector.getAllAndOverride<number>(`${THROTTLER_LIMIT}default`, [handler, classe]) !== undefined) return false;
    return !lectureACompter(req.originalUrl ?? req.url);
  }

  protected override async throwThrottlingException(_context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void> {
    throw new DomainError("too_many_requests", "Too many requests, retry later", { retryAfterSeconds: detail.timeToBlockExpire });
  }
}

/** Une minute de plafond général pour tout ce qui écrit : large pour un artisan, étroit pour un script. */
export const DEFAULT_WRITE_LIMIT = { ttl: 60_000, limit: 120 };
/** Plafonds par heure des routes qui coûtent (IA, stockage) : `@Throttle({ default: HOURLY(n) })`. */
export const HOURLY = (limit: number) => ({ ttl: 3_600_000, limit });

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (prisma: PrismaService): ThrottlerModuleOptions => ({
        throttlers: [{ name: "default", ...DEFAULT_WRITE_LIMIT }],
        storage: new PrismaThrottlerStorage(prisma),
        errorMessage: "Too many requests, retry later",
      }),
      inject: [PrismaService],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiThrottlerGuard }],
})
export class RateLimitModule {}
