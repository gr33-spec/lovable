import type { PrismaService } from "../database/prisma.service.js";

const CLE = "missions_actif";
const CACHE_MS = 15_000;

/**
 * L'INTERRUPTEUR DES MISSIONS, DANS L'ADMIN (Greg, 16 novembre 2026 : « Fonctions désactivées, mais un interrupteur dans
 * l'admin pour l'activer d'un clic quand on aura du monde »). Le choix de l'admin vit en base (`parametre_groupe`) et
 * s'applique sans redéploiement (quinze secondes au plus, le temps du cache de chaque serveur). Tant que l'admin n'a rien
 * choisi, la variable `MISSIONS_V1` (coupée par défaut) fait foi. Coupé : toutes les routes des missions répondent 404 et
 * l'application affiche « Bientôt ». Aucune donnée n'est supprimée : rallumer retrouve tout.
 */
export class ReglageMissions {
  private cache: { le: number; actif: boolean } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly parDefaut: boolean,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async choix(): Promise<boolean | null> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE } });
    const v = (p?.valeur as { actif?: unknown } | null)?.actif;
    return typeof v === "boolean" ? v : null;
  }

  /** Les missions sont-elles ouvertes maintenant ? Jamais une erreur : une base en panne garde la dernière valeur, sinon le défaut. */
  async actif(): Promise<boolean> {
    const t = this.now().getTime();
    if (this.cache && t - this.cache.le < CACHE_MS) return this.cache.actif;
    const actif = await this.choix()
      .then((c) => c ?? this.parDefaut)
      .catch(() => this.cache?.actif ?? this.parDefaut);
    this.cache = { le: t, actif };
    return actif;
  }

  /** Ce que montre la page Réglages : l'état en service et d'où il vient. */
  async etat(): Promise<{ actif: boolean; source: "admin" | "defaut" }> {
    const c = await this.choix();
    return { actif: c ?? this.parDefaut, source: c === null ? "defaut" : "admin" };
  }

  async regler(actif: boolean): Promise<{ actif: boolean; source: "admin" }> {
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE }, create: { cle: CLE, valeur: { actif } }, update: { valeur: { actif } } });
    this.cache = { le: this.now().getTime(), actif };
    return { actif, source: "admin" };
  }
}
