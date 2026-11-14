import {
  AJUSTE_ARTISANS,
  AJUSTE_HABITUDES,
  cleDeProposition,
  habitudeEtablie,
  phraseDeRegle,
  regleGlobaleAProposer,
  reponseApprise,
  tauxDeCorrection,
  type ChampAppris,
  type Occurrence,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { TenantContext } from "../../tenancy/index.js";

/** Une ligne de la liste, telle que l'apprentissage la voit. */
export interface LigneApprise {
  key: string;
  label: string;
  count: string | number | null;
  unit: string | null;
}

/** Une règle appliquée à une ligne : la réponse posée, la règle, la phrase de l'écran. */
export interface Ajustement {
  itemKey: string;
  champ: ChampAppris;
  reponse: string | { value: string; unit: string };
  regleId: string;
  texte: string;
}

const occurrencesDe = (v: unknown): Occurrence[] => (Array.isArray(v) ? (v as Occurrence[]) : []);

/**
 * L'APPRENTISSAGE DES CORRECTIONS (Greg, 24 octobre 2026) : les règles personnelles (2 chantiers) et globales (3 artisans,
 * validées par l'admin) ; leur application sur une liste, par le code ; l'annulation ; le taux de correction par mois.
 */
export class HabitudesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Une correction de l'artisan : compte pour SA règle, et pour la règle globale proposée à l'admin au 3e artisan. */
  async apprendre(tenant: TenantContext, c: { metier: string; propose: string; champ: ChampAppris; valeur: string; projectId: string }): Promise<void> {
    const cle = cleDeProposition(c.propose);
    if (!cle) return;
    const at = this.now().toISOString();
    const where = { portee_proprietaire_metier_cle_champ_valeur: { portee: "artisan", proprietaire: tenant.companyId, metier: c.metier, cle, champ: c.champ, valeur: c.valeur } };
    const existante = await this.prisma.regleApprise.findUnique({ where });
    const occ = occurrencesDe(existante?.occurrences);
    if (!occ.some((o) => o.projectId === c.projectId)) occ.push({ companyId: tenant.companyId, projectId: c.projectId, at });
    const statut = existante?.statut === "active" || habitudeEtablie(occ) ? "active" : "en_cours";
    await this.prisma.regleApprise.upsert({
      where,
      create: { portee: "artisan", proprietaire: tenant.companyId, companyId: tenant.companyId, metier: c.metier, cle, champ: c.champ, valeur: c.valeur, statut, occurrences: occ as object[] },
      update: { statut, occurrences: occ as object[] },
    });
    // Une autre valeur pour la même proposition n'est plus une habitude : la plus récente l'emporte.
    if (statut === "active") {
      await this.prisma.regleApprise.updateMany({ where: { portee: "artisan", proprietaire: tenant.companyId, metier: c.metier, cle, champ: c.champ, statut: "active", NOT: { valeur: c.valeur } }, data: { statut: "en_cours", occurrences: [] } });
    }
    // La même correction chez 3 artisans différents : une règle globale proposée (jamais appliquée sans validation).
    const pareilles = await this.prisma.regleApprise.findMany({ where: { portee: "artisan", metier: c.metier, cle, champ: c.champ, valeur: c.valeur, statut: { not: "annulee" } }, select: { proprietaire: true, occurrences: true } });
    if (regleGlobaleAProposer(pareilles.map((p) => p.proprietaire))) {
      const toutes = pareilles.flatMap((p) => occurrencesDe(p.occurrences));
      await this.prisma.regleApprise.upsert({
        where: { portee_proprietaire_metier_cle_champ_valeur: { portee: "global", proprietaire: "global", metier: c.metier, cle, champ: c.champ, valeur: c.valeur } },
        create: { portee: "global", proprietaire: "global", metier: c.metier, cle, champ: c.champ, valeur: c.valeur, statut: "proposee", occurrences: toutes as object[] },
        update: { occurrences: toutes as object[] },
      });
    }
  }

  /** Les règles qui s'appliquent à cette liste : celles de l'artisan d'abord, puis les règles globales validées. */
  async ajustements(tenant: TenantContext, metier: string, lignes: readonly LigneApprise[], dejaRepondu: (cle: string) => boolean): Promise<Ajustement[]> {
    const regles = await this.prisma.regleApprise.findMany({
      where: { metier, OR: [{ portee: "artisan", proprietaire: tenant.companyId, statut: "active" }, { portee: "global", statut: "validee" }] },
      orderBy: { updatedAt: "desc" },
    });
    if (regles.length === 0) return [];
    const out: Ajustement[] = [];
    for (const l of lignes) {
      if (dejaRepondu(`habitude:${l.key}`)) continue;
      const cle = cleDeProposition(l.label);
      for (const champ of ["libelle", "precision", "quantite"] as const) {
        if (dejaRepondu(`${champ}:${l.key}`)) continue;
        const r = regles.filter((x) => x.cle === cle && x.champ === champ).sort((a, b) => (a.portee === b.portee ? 0 : a.portee === "artisan" ? -1 : 1))[0];
        if (!r) continue;
        const reponse = reponseApprise(champ, r.valeur, { count: l.count, unit: l.unit });
        if (reponse === null) continue;
        out.push({ itemKey: l.key, champ, reponse, regleId: r.id, texte: r.portee === "artisan" ? AJUSTE_HABITUDES : AJUSTE_ARTISANS });
      }
    }
    return out;
  }

  /** « Annuler » sur une ligne ajustée : une règle de l'artisan s'arrête (elle se réapprendra s'il la refait 2 fois). */
  async annuler(tenant: TenantContext, regleId: string): Promise<void> {
    await this.prisma.regleApprise.updateMany({ where: { id: regleId, portee: "artisan", proprietaire: tenant.companyId }, data: { statut: "annulee", occurrences: [] } });
  }

  // ---------------------------------------------------------------- l'admin

  /** Les règles globales à valider, et le taux de correction des 6 derniers mois. */
  async admin() {
    const proposees = await this.prisma.regleApprise.findMany({ where: { portee: "global", statut: "proposee" }, orderBy: { createdAt: "asc" } });
    const validees = await this.prisma.regleApprise.count({ where: { portee: "global", statut: "validee" } });
    return {
      aValider: proposees.map((r) => ({ id: r.id, metier: r.metier, phrase: phraseDeRegle({ cle: r.cle, champ: r.champ as ChampAppris, valeur: r.valeur }), artisans: new Set(occurrencesDe(r.occurrences).map((o) => o.companyId)).size })),
      validees,
      tauxParMois: await this.tauxParMois(6),
    };
  }

  async decider(regleId: string, decision: "valider" | "refuser", par: string) {
    const r = await this.prisma.regleApprise.findUnique({ where: { id: regleId } });
    if (!r || r.portee !== "global") throw notFound("Rule");
    if (r.statut !== "proposee") throw validationFailed("Already decided", { reason: "deja_decidee" });
    await this.prisma.regleApprise.update({ where: { id: regleId }, data: { statut: decision === "valider" ? "validee" : "refusee", decideLe: this.now(), decidePar: par } });
    return this.admin();
  }

  /** Le taux de correction : la part des listes du mois où l'artisan a corrigé au moins une ligne (`correct`). */
  async tauxParMois(mois: number): Promise<{ mois: string; listes: number; corrigees: number; taux: number | null }[]> {
    const fin = this.now();
    const out: { mois: string; listes: number; corrigees: number; taux: number | null }[] = [];
    for (let i = mois - 1; i >= 0; i--) {
      const debut = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - i, 1));
      const suivant = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - i + 1, 1));
      const listes = await this.prisma.takeoff.count({ where: { createdAt: { gte: debut, lt: suivant } } });
      const corrigees = (await this.prisma.correctionEvent.findMany({ where: { action: "correct", createdAt: { gte: debut, lt: suivant }, takeoffId: { not: null } }, distinct: ["takeoffId"], select: { takeoffId: true } })).length;
      out.push({ mois: debut.toISOString().slice(0, 7), listes, corrigees, taux: tauxDeCorrection(listes, corrigees) });
    }
    return out;
  }
}
