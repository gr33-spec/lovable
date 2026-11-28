import type { Alerter } from "../../../platform/alerts/alerter.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DEPOT, type JetonSauvegarde } from "./jeton-github.js";

/**
 * LA SAUVEGARDE PRÉVIENT ELLE-MÊME (Greg, 28 novembre 2026 : « je ne veux pas dépendre des notifications de mon compte
 * GitHub ») : chaque nuit, le workflow dit son résultat ici ; un échec, y compris celui du test de restauration, part par
 * les alertes de Mobiiz (adresse réglée dans Admin › Réglages). Et si le workflow ne dit plus rien (horaire coupé, GitHub en
 * panne), la veille quotidienne de l'API prévient au bout de 36 heures sans sauvegarde réussie. Aucune donnée de client.
 */
export const VEILLE_HEURES = 36;

export interface RapportRecu {
  statut: "reussie" | "echec";
  etape?: string | undefined;
  tables?: number | undefined;
  lignes?: number | undefined;
  octets?: number | undefined;
}

export const lienExecution = (runId: string) => `https://github.com/${DEPOT}/actions/runs/${runId}`;

const quand = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(d).replace(":", " h ");
const taille = (o: number) => (o >= 1_048_576 ? `${(o / 1_048_576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

export class SauvegardeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerter: Alerter,
    private readonly maintenant: () => Date = () => new Date(),
  ) {}

  private derniereReussie() {
    return this.prisma.sauvegardeRapport.findFirst({ where: { essai: false, statut: "reussie" }, orderBy: { recuLe: "desc" } });
  }

  async recevoir(r: RapportRecu, jeton: JetonSauvegarde): Promise<{ enregistre: boolean }> {
    // Un même run rejoué (« Re-run ») ne prévient pas deux fois du même résultat.
    const deja = await this.prisma.sauvegardeRapport.findFirst({ where: { runId: jeton.runId, statut: r.statut } });
    if (deja) return { enregistre: false };
    const precedent = jeton.essai ? null : await this.prisma.sauvegardeRapport.findFirst({ where: { essai: false }, orderBy: { recuLe: "desc" } });
    const reussieAvant = r.statut === "echec" && !jeton.essai ? await this.derniereReussie() : null;
    await this.prisma.sauvegardeRapport.create({
      data: { statut: r.statut, essai: jeton.essai, etape: r.statut === "echec" ? (r.etape?.trim() || "étape inconnue") : null, runId: jeton.runId, ref: jeton.ref, tables: r.tables ?? null, lignes: r.lignes ?? null, octets: r.octets ?? null },
    });
    const lien = lienExecution(jeton.runId);
    const etape = r.etape?.trim() || "étape inconnue";
    if (jeton.essai) {
      const branche = jeton.ref.replace(/^refs\/heads\//, "");
      this.alerter.alert("sauvegarde_info", r.statut === "echec" ? `ESSAI de l'alerte (branche ${branche}) : échec volontaire à l'étape « ${etape} ». L'alerte de la sauvegarde fonctionne ; rien à faire. Détail : ${lien}` : `ESSAI (branche ${branche}) : le compte rendu de la sauvegarde arrive bien. Rien à faire. Détail : ${lien}`);
    } else if (r.statut === "echec") {
      const avant = reussieAvant ? `Dernière sauvegarde réussie : le ${quand(reussieAvant.recuLe)}.` : "Aucune sauvegarde réussie n'est encore connue.";
      this.alerter.alert("sauvegarde_echec", `la sauvegarde de cette nuit a ÉCHOUÉ à l'étape « ${etape} ». Aucune nouvelle sauvegarde n'est gardée tant que ce n'est pas réglé. ${avant} Détail : ${lien}`);
    } else if (precedent?.statut === "echec") {
      const chiffres = [r.tables != null ? `${r.tables} tables` : null, r.lignes != null ? `${r.lignes} lignes` : null, r.octets != null ? taille(r.octets) : null].filter(Boolean).join(", ");
      this.alerter.alert("sauvegarde_info", `la sauvegarde est rétablie : celle-ci a réussi, test de restauration compris${chiffres ? ` (${chiffres})` : ""}. Détail : ${lien}`);
    }
    return { enregistre: true };
  }

  /** La veille quotidienne : plus de 36 h sans sauvegarde réussie, alors qu'elle a déjà donné des nouvelles une fois. */
  async veille(): Promise<{ enRetard: boolean }> {
    const etat = await this.etat();
    if (!etat.enRetard) return { enRetard: false };
    const depuis = etat.derniereReussie ? `depuis le ${quand(new Date(etat.derniereReussie.recuLe))}` : "depuis sa mise en route";
    this.alerter.alert("sauvegarde_echec", `aucune sauvegarde réussie ${depuis} (plus de ${VEILLE_HEURES} heures) : le workflow n'a pas tourné, ou n'a pas pu prévenir. À regarder dans GitHub › Actions › « Sauvegarde de la base ».`);
    return { enRetard: true };
  }

  /** Pour la carte « Santé » de l'admin : la dernière nuit, la dernière réussite, le retard éventuel, le dernier essai. */
  async etat() {
    const [derniere, derniereReussie, dernierEssai] = await Promise.all([
      this.prisma.sauvegardeRapport.findFirst({ where: { essai: false }, orderBy: { recuLe: "desc" } }),
      this.derniereReussie(),
      this.prisma.sauvegardeRapport.findFirst({ where: { essai: true }, orderBy: { recuLe: "desc" } }),
    ]);
    const vue = (x: typeof derniere) => (x ? { statut: x.statut, recuLe: x.recuLe.toISOString(), etape: x.etape, tables: x.tables, lignes: x.lignes, octets: x.octets, lien: lienExecution(x.runId) } : null);
    // La veille ne s'arme qu'une fois le workflow branché (un premier vrai rapport reçu) : pas d'alerte avant sa mise en route.
    const reference = derniereReussie?.recuLe ?? derniere?.recuLe ?? null;
    const enRetard = !!derniere && !!reference && this.maintenant().getTime() - reference.getTime() > VEILLE_HEURES * 3_600_000;
    return { derniere: vue(derniere), derniereReussie: vue(derniereReussie), enRetard, dernierEssai: vue(dernierEssai) };
  }
}
