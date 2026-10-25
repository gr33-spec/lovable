import { createHash } from "node:crypto";
import { prixObserve, referenceStricte, OBSERVATOIRE_MOIS } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";

/**
 * L'OBSERVATOIRE DES PRIX (Greg, 25 octobre 2026) : chaque prix de négoce (réponse perso, offre négociée) est noté SANS
 * identifiant de négoce ni d'artisan (`observations_prix`) : article normalisé, prix unitaire HT, quantité, département,
 * date, type. La moyenne d'un article dans un département sur 3 mois, arrondie, n'est montrée qu'à partir de
 * 2 regroupements ou 5 réponses distinctes (`prixObserve`). Export CSV pour l'admin. Usage statistique anonymisé : CGU et
 * conditions négoces.
 */
const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** L'article normalisé : la clé de référence stricte quand elle existe, sinon la désignation à plat (et l'unité). */
export function articleNormalise(designation: string, unite: string): { article: string; libelle: string } {
  const r = referenceStricte(designation);
  return r.ok ? { article: `${r.reference.cle}#${plat(unite)}`, libelle: r.reference.libelle } : { article: `${plat(designation)}#${plat(unite)}`, libelle: designation };
}

/** Une empreinte de la source (la réponse, le regroupement) : compter les sources distinctes sans garder qui. */
export const empreinteSource = (type: string, id: string) => createHash("sha256").update(`${type}:${id}`).digest("hex").slice(0, 24);

export class ObservatoireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async enregistrer(e: { type: "perso" | "groupe"; sourceId: string; departement: string | null; lignes: { designation: string; unite: string; quantite: number | null; prixHt: number }[] }): Promise<number> {
    if (!e.departement) return 0;
    const source = empreinteSource(e.type, e.sourceId);
    const le = this.now();
    let n = 0;
    for (const l of e.lignes) {
      if (!(l.prixHt > 0)) continue;
      const { article, libelle } = articleNormalise(l.designation, l.unite);
      await this.prisma.observationPrix.upsert({
        where: { source_article: { source, article } },
        create: { article, libelle, prixUnitaireHt: l.prixHt, quantite: l.quantite, unite: l.unite, departement: e.departement, le, type: e.type, source },
        update: { prixUnitaireHt: l.prixHt, quantite: l.quantite, le },
      });
      n++;
    }
    return n;
  }

  /** « Prix observé dans le 22 : environ Y € » pour un article, ou null sous les seuils. */
  async observe(designation: string, unite: string, departement: string | null): Promise<number | null> {
    if (!departement) return null;
    const { article } = articleNormalise(designation, unite);
    const depuis = new Date(this.now());
    depuis.setUTCMonth(depuis.getUTCMonth() - OBSERVATOIRE_MOIS);
    const obs = await this.prisma.observationPrix.findMany({ where: { article, departement, le: { gte: depuis } }, take: 2000 });
    const r = prixObserve(
      obs.map((o) => ({ article: o.article, prixUnitaireHt: Number(o.prixUnitaireHt), departement: o.departement, le: o.le, type: o.type as "perso" | "groupe", source: o.source })),
      article,
      departement,
      this.now(),
    );
    return r?.environ ?? null;
  }

  /** Le bloc « Prix observés dans ton secteur » : les articles du département qui passent les seuils. */
  async secteur(departement: string | null): Promise<{ libelle: string; unite: string; environ: number }[]> {
    if (!departement) return [];
    const depuis = new Date(this.now());
    depuis.setUTCMonth(depuis.getUTCMonth() - OBSERVATOIRE_MOIS);
    const obs = await this.prisma.observationPrix.findMany({ where: { departement, le: { gte: depuis } }, take: 5000 });
    const parArticle = new Map<string, typeof obs>();
    for (const o of obs) parArticle.set(o.article, [...(parArticle.get(o.article) ?? []), o]);
    const sortie: { libelle: string; unite: string; environ: number }[] = [];
    for (const [article, liste] of parArticle) {
      const r = prixObserve(
        liste.map((o) => ({ article: o.article, prixUnitaireHt: Number(o.prixUnitaireHt), departement: o.departement, le: o.le, type: o.type as "perso" | "groupe", source: o.source })),
        article,
        departement,
        this.now(),
      );
      if (r) sortie.push({ libelle: liste[0]!.libelle, unite: liste[0]!.unite, environ: r.environ });
    }
    return sortie.sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
  }

  /** L'export CSV (admin) : aucune colonne qui identifie un négoce ou un artisan. */
  async csv(): Promise<string> {
    const obs = await this.prisma.observationPrix.findMany({ orderBy: [{ le: "desc" }], take: 50_000 });
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lignes = obs.map((o) => [q(o.article), q(o.libelle), String(o.prixUnitaireHt), o.quantite === null ? "" : String(o.quantite), q(o.unite), q(o.palier ?? ""), o.departement, o.le.toISOString().slice(0, 10), o.type].join(";"));
    return ["article;libelle;prix_unitaire_ht;quantite;unite;palier;departement;date;type", ...lignes].join("\n");
  }
}
