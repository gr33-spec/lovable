import { createHash, randomBytes } from "node:crypto";
import type { AppConfig } from "../config/config.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { TransactionalEmailSender } from "../email/email.port.js";

const CLE = "alerte_email";
const VALIDITE_MS = 24 * 3_600_000;
const CACHE_MS = 20_000;
const hacher = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

interface Valeur {
  adresse?: string | null;
  enAttente?: { adresse: string; jeton: string; expireLe: string; demandePar: string } | null;
}

/**
 * L'ADRESSE D'ALERTE, RÉGLABLE DANS L'ADMIN (Greg, 14 novembre 2026 : « je saisis mon adresse perso. Double validation : un
 * e-mail de confirmation part vers la nouvelle adresse, je clique, et le changement s'applique immédiatement, sans
 * redéploiement. Remplace la variable ALERT_EMAIL fixe »). L'adresse vit en base (`parametre_groupe`) ; tant qu'aucune n'est
 * confirmée, `ALERT_EMAIL` puis le premier admin servent de repli. Une adresse demandée ne reçoit RIEN avant le clic : seul
 * le jeton haché est gardé, 24 heures. Les alertes, les signalements et le renvoi de contact@ lisent tous cette adresse.
 */
export class AdresseAlerte {
  private cache: { le: number; adresse: string | null } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly emails: TransactionalEmailSender,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async lire(): Promise<Valeur> {
    const p = await this.prisma.parametreGroupe.findUnique({ where: { cle: CLE } });
    return ((p?.valeur as Valeur | null) ?? {}) as Valeur;
  }
  private async ecrire(v: Valeur): Promise<void> {
    const valeur = JSON.parse(JSON.stringify(v)) as object;
    await this.prisma.parametreGroupe.upsert({ where: { cle: CLE }, create: { cle: CLE, valeur }, update: { valeur } });
    this.cache = null;
  }
  private repli(): string | null {
    return this.config.alerts.email ?? this.config.groupe.admins[0] ?? null;
  }

  /** L'adresse qui reçoit les alertes maintenant : celle confirmée dans l'admin, sinon le repli. Jamais une erreur. */
  async actuelle(): Promise<string | null> {
    const t = this.now().getTime();
    if (this.cache && t - this.cache.le < CACHE_MS) return this.cache.adresse;
    const adresse = await this.lire()
      .then((v) => v.adresse ?? this.repli())
      .catch(() => this.repli());
    this.cache = { le: t, adresse };
    return adresse;
  }

  /** Ce que montre la page Réglages : l'adresse en service, d'où elle vient, et celle qui attend son clic. */
  async etat(): Promise<{ adresse: string | null; source: "admin" | "repli"; enAttente: { adresse: string; expireLe: string } | null }> {
    const v = await this.lire();
    const a = v.enAttente && new Date(v.enAttente.expireLe) > this.now() ? { adresse: v.enAttente.adresse, expireLe: v.enAttente.expireLe } : null;
    return { adresse: v.adresse ?? this.repli(), source: v.adresse ? "admin" : "repli", enAttente: a };
  }

  /** Étape 1 : la nouvelle adresse reçoit un lien ; rien ne change tant qu'il n'est pas cliqué. */
  async demander(nouvelle: string, demandePar: string): Promise<{ envoye: true; adresse: string }> {
    const adresse = nouvelle.trim().toLowerCase();
    const jeton = randomBytes(24).toString("base64url");
    const v = await this.lire();
    // Le mail doit partir : sans lui, la demande n'existe pas.
    await this.emails.send({
      to: adresse,
      subject: "Mobiiz : confirme ta nouvelle adresse d'alerte",
      text: [
        "Bonjour,",
        "",
        `${demandePar} demande que les alertes de Mobiiz (bug signalé, erreur serveur, paiement refusé, négoce à vérifier) arrivent sur cette adresse.`,
        "",
        "Pour confirmer, ouvre ce lien (valable 24 heures) :",
        `${this.config.webAppUrl}/admin/alerte/confirmer?jeton=${jeton}`,
        "",
        "Si ce n'est pas toi, ne fais rien : rien ne change.",
      ].join("\n"),
      mustDeliver: true,
    });
    await this.ecrire({ ...v, enAttente: { adresse, jeton: hacher(jeton), expireLe: new Date(this.now().getTime() + VALIDITE_MS).toISOString(), demandePar } });
    return { envoye: true, adresse };
  }

  /** Étape 2 : le clic applique l'adresse tout de suite. Un jeton inconnu, déjà utilisé ou trop vieux ne change rien. */
  async confirmer(jeton: string): Promise<{ confirme: boolean; adresse: string | null }> {
    const v = await this.lire();
    const a = v.enAttente;
    if (!a || a.jeton !== hacher(jeton) || new Date(a.expireLe) <= this.now()) return { confirme: false, adresse: null };
    const ancienne = v.adresse ?? this.repli();
    await this.ecrire({ adresse: a.adresse, enAttente: null });
    // L'ancienne adresse est prévenue : un changement qu'elle n'a pas voulu se voit.
    if (ancienne && ancienne !== a.adresse) await this.emails.send({ to: ancienne, subject: "Mobiiz : l'adresse d'alerte a changé", text: `Les alertes de Mobiiz partent maintenant vers ${a.adresse} (demande de ${a.demandePar}). Si ce n'est pas voulu, change-la dans l'espace admin, Réglages.` }).catch(() => undefined);
    return { confirme: true, adresse: a.adresse };
  }
}
