import { PLAFOND_IA_EUR_DEFAUT, type FormulePayante } from "@baticlair/domain";
import type { PrismaService } from "../database/prisma.service.js";

/** La clé des plafonds cachés (`{ pro, promax }`, en euros de consommation par mois d'abonnement et par abonné). */
export const CLE_PLAFONDS_IA = "ia:plafonds";

export type PlafondsIa = Record<FormulePayante, number>;

/**
 * LES PLAFONDS CACHÉS DES ABONNÉS, DANS L'ADMIN (Greg, 15 novembre 2026 : « Plafond IA caché par mois et par abonné, en
 * euros (pour commencer : environ 5 € pour Pro, 20 € pour Pro Max, réglables dans l'admin) »). Le choix vit en base
 * (`parametre_groupe`) et s'applique tout de suite, sans redéploiement ; tant que l'admin n'a rien réglé, 5 € et 20 €.
 * Jamais montré à un artisan : il ne lit qu'un message, le jour où il atteint son plafond.
 */
export class ReglagePlafondsIa {
  constructor(private readonly prisma: PrismaService) {}

  private async choix(): Promise<Partial<Record<FormulePayante, unknown>> | null> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE_PLAFONDS_IA } });
    return (p?.valeur as Partial<Record<FormulePayante, unknown>> | null) ?? null;
  }

  /** Les plafonds en service ; jamais une erreur de lecture d'un réglage abîmé (la valeur de départ le remplace). */
  async plafonds(): Promise<PlafondsIa> {
    const v = (await this.choix()) ?? {};
    const ok = (x: unknown, defaut: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : defaut);
    return { pro: ok(v.pro, PLAFOND_IA_EUR_DEFAUT.pro), promax: ok(v.promax, PLAFOND_IA_EUR_DEFAUT.promax) };
  }

  /** Ce que montre la page Réglages : les plafonds en service et d'où ils viennent. */
  async etat(): Promise<PlafondsIa & { source: "admin" | "defaut" }> {
    return { ...(await this.plafonds()), source: (await this.choix()) === null ? "defaut" : "admin" };
  }

  async regler(p: PlafondsIa): Promise<PlafondsIa & { source: "admin" }> {
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE_PLAFONDS_IA }, create: { cle: CLE_PLAFONDS_IA, valeur: p }, update: { valeur: p } });
    return { ...p, source: "admin" };
  }
}
