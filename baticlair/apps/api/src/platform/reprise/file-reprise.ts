import type { Alerter } from "../alerts/alerter.js";
import type { AppLogger } from "../logging/logger.js";

/**
 * LA FILE DE REPRISE (revue du 26 octobre 2026, lot 1, point 3) : une action qui a échoué une première fois est
 * retentée seule, 5 minutes, puis 30 minutes après ; au 3e échec elle est abandonnée et Greg reçoit une alerte. L'artisan
 * voit l'état (`GET /v1/reprises`). Chaque sorte d'action a son « exécutant », branché par son module ; un exécutant qui
 * lève une erreur compte comme un échec. Rejouée par la tâche `/v1/internal/reprises` et à chaque autre tâche planifiée.
 */
export const ECHECS_MAX = 3;
/** Délai avant la tentative n° (échecs + 1) : après le 1er échec 5 min, après le 2e 30 min. */
export const DELAIS_MS = [5 * 60_000, 30 * 60_000] as const;

/** Le temps qu'une instance garde une action qu'elle rejoue. */
const BAIL_MS = 10 * 60_000;
/** Au passage des requêtes, la file n'est relue qu'une fois toutes les 5 minutes par instance. */
export const PASSAGE_MS = 5 * 60_000;

export type Executant = (charge: unknown) => Promise<void>;

export interface RepriseStore {
  reprise: {
    findUnique(a: { where: { cle: string } }): Promise<{ etat: string } | null>;
    upsert(a: { where: { cle: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<unknown>;
    findMany(a: { where: Record<string, unknown>; orderBy?: Record<string, unknown>; take?: number }): Promise<RepriseLigne[]>;
    update(a: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
    updateMany(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
}

export interface RepriseLigne {
  id: string;
  sorte: string;
  cle: string;
  charge: unknown;
  etat: string;
  tentatives: number;
  prochaineLe: Date;
  derniereErreur: string | null;
  companyId: string | null;
}

const motif = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 300);

export class FileReprise {
  private readonly executants = new Map<string, Executant>();

  constructor(
    private readonly store: RepriseStore,
    private readonly alerter: Alerter,
    private readonly logger: AppLogger,
    private readonly maintenant: () => Date = () => new Date(),
  ) {}

  /** Un module dit comment rejouer ses actions. */
  brancher(sorte: string, executant: Executant): void {
    this.executants.set(sorte, executant);
  }

  /** Après un PREMIER échec : l'action repart dans 5 minutes. Déjà planifiée et en attente : rien ne change. */
  async planifier(p: { sorte: string; cle: string; charge: unknown; erreur: unknown; companyId?: string | null }): Promise<void> {
    const deja = await this.store.reprise.findUnique({ where: { cle: p.cle } });
    if (deja?.etat === "en_attente") return;
    const donnees = { sorte: p.sorte, charge: p.charge as object, etat: "en_attente", tentatives: 1, prochaineLe: new Date(this.maintenant().getTime() + DELAIS_MS[0]), derniereErreur: motif(p.erreur), companyId: p.companyId ?? null, finiLe: null };
    await this.store.reprise.upsert({ where: { cle: p.cle }, create: { cle: p.cle, ...donnees }, update: donnees });
    this.logger.warn({ sorte: p.sorte }, "reprise planifiée");
  }

  /** Rejoue ce qui est dû. Renvoie le bilan (réussies, encore en attente, abandonnées). */
  async traiter(): Promise<{ reussies: number; enAttente: number; abandonnees: number }> {
    const now = this.maintenant();
    const dues = await this.store.reprise.findMany({ where: { etat: "en_attente", prochaineLe: { lte: now } }, orderBy: { prochaineLe: "asc" }, take: 50 });
    const bilan = { reussies: 0, enAttente: 0, abandonnees: 0 };
    for (const r of dues) {
      // Le verrou : une seule instance du serveur prend l'action (bail de 10 minutes) ; les autres la laissent.
      const pris = await this.store.reprise.updateMany({ where: { id: r.id, etat: "en_attente", prochaineLe: r.prochaineLe }, data: { prochaineLe: new Date(now.getTime() + BAIL_MS) } });
      if (pris.count === 0) continue;
      const executant = this.executants.get(r.sorte);
      try {
        if (!executant) throw new Error(`aucun exécutant pour « ${r.sorte} »`);
        await executant(r.charge);
        await this.store.reprise.update({ where: { id: r.id }, data: { etat: "reussie", tentatives: r.tentatives + 1, finiLe: now, derniereErreur: null } });
        bilan.reussies++;
      } catch (e) {
        const tentatives = r.tentatives + 1;
        if (tentatives >= ECHECS_MAX) {
          await this.store.reprise.update({ where: { id: r.id }, data: { etat: "abandonnee", tentatives, finiLe: now, derniereErreur: motif(e) } });
          this.alerter.alert("reprise_echouee", `${r.sorte} abandonnée après ${tentatives} essais (${motif(e)}).`);
          bilan.abandonnees++;
        } else {
          await this.store.reprise.update({ where: { id: r.id }, data: { tentatives, prochaineLe: new Date(now.getTime() + (DELAIS_MS[Math.min(tentatives - 1, DELAIS_MS.length - 1)] ?? DELAIS_MS[1])), derniereErreur: motif(e) } });
          bilan.enAttente++;
        }
      }
    }
    return bilan;
  }

  private dernierPassage = 0;

  /** Au passage d'une requête (Vercel gratuit : une tâche planifiée par jour au plus) : relire la file, sans attendre. */
  auPassage(garderEnVie: (travail: Promise<unknown>) => void): void {
    const t = this.maintenant().getTime();
    if (t - this.dernierPassage < PASSAGE_MS) return;
    this.dernierPassage = t;
    garderEnVie(this.traiter().catch((e: unknown) => this.logger.warn({ err: e }, "file de reprise : passage en échec")));
  }

  /** Ce que voit l'artisan : ses actions en attente ou abandonnées depuis moins de 7 jours. */
  async pourEntreprise(companyId: string): Promise<{ sorte: string; etat: string; prochaineLe: string | null }[]> {
    const depuis = new Date(this.maintenant().getTime() - 7 * 86_400_000);
    const lignes = await this.store.reprise.findMany({ where: { companyId, OR: [{ etat: "en_attente" }, { etat: "abandonnee", finiLe: { gte: depuis } }] }, orderBy: { prochaineLe: "asc" }, take: 20 });
    return lignes.map((r) => ({ sorte: r.sorte, etat: r.etat, prochaineLe: r.etat === "en_attente" ? r.prochaineLe.toISOString() : null }));
  }
}
