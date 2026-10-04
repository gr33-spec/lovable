import { Controller, Get, Inject, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { forbidden, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AppConfig } from "../../../platform/config/config.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { CONFIG } from "../../../platform/tokens.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";

/** « 13 pièces », « 4 longueurs de 4 m », « 13,5 ml » → 13, 4, 13.5 ; rien de lisible → null. */
const numberIn = (text: unknown): number | null => {
  if (typeof text !== "string") return null;
  const m = /-?\d[\d\s]*(?:[.,]\d+)?/.exec(text);
  if (!m) return null;
  const n = Number(m[0].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const csv = (v: string | number | null) => (v === null ? "" : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/**
 * §45.6 : l'export mensuel PAR RÈGLE (nombre de corrections d'un tap, lignes « à préciser », écart moyen entre la
 * quantité calculée et la quantité corrigée). Toutes entreprises confondues, sans aucune donnée d'entreprise : pour
 * le fondateur (validateurs du référentiel) seulement. Rien n'est automatique : aucun ratio ne bouge sans validation.
 */
@Controller("v1")
@UseGuards(TenantGuard)
export class CorrectionsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  @Get("corrections/export.csv")
  async export(@Tenant() tenant: TenantContext, @Query("mois") mois: string | undefined, @Res({ passthrough: true }) res: Response): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } });
    if (!user || !this.config.referentialValidators.includes(user.email.toLowerCase())) throw forbidden("Reserved to referential validators");
    const month = mois ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw validationFailed("mois must be AAAA-MM");
    const [y, m] = month.split("-").map(Number) as [number, number];
    const rows = await this.prisma.correctionEvent.findMany({
      where: { action: { in: ["correct", "to_quote"] }, createdAt: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } },
      select: { action: true, context: true },
    });
    const byRule = new Map<string, { metier: string; version: string; corrections: number; aPreciser: number; gaps: number[] }>();
    for (const r of rows) {
      const c = (r.context ?? {}) as Record<string, unknown>;
      const regle = String(c.regle ?? "?");
      const key = `${c.metier ?? ""}|${regle}|${c.version_referentiel ?? ""}`;
      const entry = byRule.get(key) ?? { metier: String(c.metier ?? ""), version: String(c.version_referentiel ?? ""), corrections: 0, aPreciser: 0, gaps: [] };
      if (r.action === "to_quote") entry.aPreciser += 1;
      else {
        entry.corrections += 1;
        const before = numberIn(c.quantite_calculee);
        const after = numberIn(c.quantite_corrigee);
        if (before && after !== null) entry.gaps.push(((after - before) / before) * 100);
      }
      byRule.set(key, entry);
    }
    const lines = [["mois", "metier", "regle", "version_referentiel", "corrections", "a_preciser", "ecart_moyen_pct"].join(";")];
    for (const [key, e] of [...byRule].sort((a, b) => b[1].corrections + b[1].aPreciser - (a[1].corrections + a[1].aPreciser))) {
      const regle = key.split("|")[1]!;
      const mean = e.gaps.length > 0 ? Math.round((e.gaps.reduce((s, g) => s + g, 0) / e.gaps.length) * 10) / 10 : null;
      lines.push([month, e.metier, regle, e.version, e.corrections, e.aPreciser, mean].map(csv).join(";"));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="corrections-${month}.csv"`);
    return `${lines.join("\n")}\n`;
  }
}
