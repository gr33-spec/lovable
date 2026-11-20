import { LIBELLES_EXCEPTION, TYPES_EXCEPTION, codeFamilleValide, referenceStricte, scoreFiabilite, type TypeException } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { famillesConfigurees } from "../../../platform/supervision/familles.js";
import { signalerException } from "../../../platform/supervision/exceptions.js";
import { isUuid } from "../../../platform/validation/ids.js";

/**
 * LA SUPERVISION (lot 6, Greg, 6 novembre 2026, prompt maître points 6, 13 et 14), réservée à l'admin (double
 * authentification, vérifiée par le contrôleur) : la taxonomie des familles, la file d'exceptions et le score interne de
 * fiabilité des négoces (jamais montré aux artisans ni publié).
 */
export class SupervisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly famillesParDefaut: readonly string[],
    private readonly now: () => Date = () => new Date(),
  ) {}

  /* ------------------------------------------------------------------------------------------- les familles */

  /** La première ouverture recopie la configuration en base : ensuite, l'admin seul règle les familles. */
  async familles() {
    const cfg = famillesConfigurees(this.prisma, this.famillesParDefaut);
    if ((await this.prisma.familleMateriau.count()) === 0) await this.prisma.familleMateriau.createMany({ data: cfg.defaut(), skipDuplicates: true });
    await cfg.rafraichir(true);
    const rows = await this.prisma.familleMateriau.findMany({ orderBy: [{ ordre: "asc" }, { code: "asc" }] });
    return { familles: rows.map((r) => ({ code: r.code, libelle: r.libelle, ordre: r.ordre, active: r.active })) };
  }

  async changerFamille(code: string, d: { libelle?: string; ordre?: number; active?: boolean }) {
    await this.familles();
    const f = await this.prisma.familleMateriau.findUnique({ where: { code } });
    if (!f) throw notFound("Famille");
    if (d.active === false && (await this.prisma.familleMateriau.count({ where: { active: true, code: { not: code } } })) === 0)
      throw new DomainError("conflict", "At least one family must stay active", { reason: "derniere_famille", message: "Garde au moins une famille proposée." });
    await this.prisma.familleMateriau.update({ where: { code }, data: { ...(d.libelle ? { libelle: d.libelle } : {}), ...(d.ordre !== undefined ? { ordre: d.ordre } : {}), ...(d.active !== undefined ? { active: d.active } : {}) } });
    return this.familles();
  }

  async ajouterFamille(d: { code: string; libelle: string }) {
    if (!codeFamilleValide(d.code)) throw validationFailed("Invalid family code", { reason: "code_famille", message: "Le code : minuscules, chiffres et « _ » (ex. « isolation »)." });
    await this.familles();
    if (await this.prisma.familleMateriau.findUnique({ where: { code: d.code } })) throw new DomainError("conflict", "Family exists", { reason: "famille_existe", message: "Cette famille existe déjà." });
    const ordre = ((await this.prisma.familleMateriau.aggregate({ _max: { ordre: true } }))._max.ordre ?? 0) + 1;
    await this.prisma.familleMateriau.create({ data: { code: d.code, libelle: d.libelle, ordre, active: false } });
    return this.familles();
  }

  /* -------------------------------------------------------------------------------------- la file d'exceptions */

  async exceptions(f: { statut: "ouverte" | "resolue"; type?: TypeException }) {
    const items = await this.prisma.exceptionSupervision.findMany({
      where: { statut: f.statut, ...(f.type ? { type: f.type } : {}) },
      orderBy: f.statut === "ouverte" ? [{ gravite: "desc" }, { dernierLe: "desc" }] : [{ resoluLe: "desc" }],
      take: 200,
    });
    const parType = await this.prisma.exceptionSupervision.groupBy({ by: ["type"], where: { statut: "ouverte" }, _count: { _all: true } });
    const compte = Object.fromEntries(parType.map((t) => [t.type, t._count._all]));
    return {
      types: TYPES_EXCEPTION.map((t) => ({ type: t, libelle: LIBELLES_EXCEPTION[t], ouvertes: compte[t] ?? 0 })),
      items: items.map((e) => ({
        id: e.id,
        type: e.type,
        libelle: LIBELLES_EXCEPTION[e.type as TypeException] ?? e.type,
        gravite: e.gravite,
        titre: e.titre,
        detail: e.detail,
        lien: e.lien,
        occurrences: e.occurrences,
        dernierLe: e.dernierLe.toISOString(),
        createdAt: e.createdAt.toISOString(),
        resoluLe: e.resoluLe?.toISOString() ?? null,
        note: e.note,
      })),
    };
  }

  async resoudre(id: string, par: string, note: string | null) {
    if (!isUuid(id)) throw notFound("Exception");
    const e = await this.prisma.exceptionSupervision.findUnique({ where: { id } });
    if (!e) throw notFound("Exception");
    if (e.statut !== "resolue") await this.prisma.exceptionSupervision.update({ where: { id }, data: { statut: "resolue", resoluLe: this.now(), resoluPar: par, note } });
    return { resolue: true };
  }

  /** « Autre anomalie nécessitant une décision humaine » : signalée à la main par l'admin. */
  async signaler(d: { type: TypeException; titre: string; detail: string | null }, par: string) {
    await signalerException(this.prisma, { type: d.type, cle: `manuel:${this.now().getTime()}:${par}`, titre: d.titre, detail: d.detail }, this.now());
    return this.exceptions({ statut: "ouverte" });
  }

  /* --------------------------------------------------------------------------------- la fiabilité des négoces */

  /**
   * Le score interne de chaque négoce (par adresse e-mail, toutes entreprises confondues : la déduplication), à partir des
   * demandes envoyées : taux de réponse, délai moyen, complétude des offres, familles réellement chiffrées.
   */
  async fiabilite() {
    const envois = await this.prisma.priceRequestRecipient.findMany({
      where: { sentAt: { not: null } },
      select: { sentAt: true, reponduLe: true, refuseLe: true, documentId: true, prix: true, supplier: { select: { name: true, email: true } }, priceRequest: { select: { lines: true } } },
      take: 20_000,
      orderBy: { sentAt: "desc" },
    });
    type Faits = { noms: Map<string, number>; sollicitations: number; reponses: number; refus: number; delais: number[]; demandees: number; chiffrees: number; familles: string[] };
    const parNegoce = new Map<string, Faits>();
    for (const e of envois) {
      const email = (e.supplier.email ?? "").trim().toLowerCase();
      if (!email) continue;
      const n: Faits = parNegoce.get(email) ?? { noms: new Map<string, number>(), sollicitations: 0, reponses: 0, refus: 0, delais: [], demandees: 0, chiffrees: 0, familles: [] };
      parNegoce.set(email, n);
      n.noms.set(e.supplier.name, (n.noms.get(e.supplier.name) ?? 0) + 1);
      n.sollicitations++;
      const lignes = Array.isArray(e.priceRequest.lines) ? (e.priceRequest.lines as { designation?: string }[]) : [];
      const prix = e.prix && typeof e.prix === "object" ? (e.prix as Record<string, unknown>) : null;
      const repondu = e.reponduLe ?? (e.documentId ? e.sentAt : null);
      if (repondu && !e.refuseLe) {
        n.reponses++;
        n.delais.push(Math.max(0, (repondu.getTime() - e.sentAt!.getTime()) / 3_600_000));
        if (prix) {
          n.demandees += lignes.length;
          lignes.forEach((l, i) => {
            if (typeof prix[String(i)] !== "number") return;
            n.chiffrees++;
            const r = l.designation ? referenceStricte(l.designation) : null;
            if (r?.ok) n.familles.push(r.reference.famille);
          });
        }
      } else if (e.refuseLe) n.refus++;
    }
    const negoces = [...parNegoce].map(([email, n]) => ({
      email,
      nom: [...n.noms].sort((a, b) => b[1] - a[1])[0]![0],
      ...scoreFiabilite({ sollicitations: n.sollicitations, reponses: n.reponses, refus: n.refus, delaisHeures: n.delais, lignesDemandees: n.demandees, lignesChiffrees: n.chiffrees, familles: n.familles }),
    }));
    negoces.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.nom.localeCompare(b.nom));
    return { phrase: "Score interne, à partir de faits seulement. Jamais montré aux artisans ni aux négoces.", negoces };
  }
}
