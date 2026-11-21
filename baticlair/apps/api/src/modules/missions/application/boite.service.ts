import { alertePropositionNegoce, REGLAGES_ALERTES_DEFAUT, type ElementBoite, type ReglagesAlertes } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { notFound } from "../../../platform/errors/domain-error.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { MissionsService } from "./missions.service.js";

const nomExpediteur = (de: string) => /^\s*"?([^"<]+?)"?\s*</.exec(de)?.[1]?.trim() || de.replace(/[<>]/g, "").trim();

/**
 * « MESSAGES ET RÉPONSES » ET LA CLOCHE (Greg, 10 novembre 2026). L'interface est commune, les circuits restent SÉPARÉS : une
 * conversation Missions vient de `conversation_mission` ; une réponse de négoce vient de `email_recu_artisan` (e-mail reçu
 * sur l'adresse Mobiiz) ou de la réponse saisie par le lien d'une demande (`PriceRequestRecipient`). Aucune table commune,
 * aucune écriture croisée : cette classe ne fait que LIRE les deux et les présenter côte à côte, par entreprise.
 */
export class BoiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly missions: MissionsService,
    private readonly missionsActives: () => Promise<boolean>,
  ) {}

  async boite(t: TenantContext): Promise<{ items: ElementBoite[]; missions: boolean }> {
    const missions = await this.missionsActives();
    const [conversations, emails, reponses, lues, alertes, site] = await Promise.all([
      missions ? this.missions.conversations(t, "toutes").then((r) => r.items) : [],
      this.prisma.emailRecuArtisan.findMany({
        where: { companyId: t.companyId },
        orderBy: { recuLe: "desc" },
        take: 150,
        select: { id: true, de: true, objet: true, texte: true, recuLe: true, luLe: true, projectId: true, fichiers: { select: { nom: true } }, recipient: { select: { supplier: { select: { name: true } }, priceRequest: { select: { project: { select: { name: true } } } } } } },
      }),
      this.prisma.priceRequestRecipient.findMany({
        where: { priceRequest: { companyId: t.companyId }, reponduLe: { not: null } },
        orderBy: { reponduLe: "desc" },
        take: 100,
        select: { id: true, reponduLe: true, commandeLe: true, supplier: { select: { name: true } }, priceRequest: { select: { projectId: true, project: { select: { name: true } } } } },
      }),
      this.prisma.lectureBoite.findMany({ where: { companyId: t.companyId }, select: { cle: true } }),
      // Lot G (Greg, 15 novembre 2026) : les messages de Mobiiz (achats groupés, conseils) entrent dans la même boîte, avec
      // le MÊME état lu que la cloche (`lu_le`). Les alertes « prix » et « missions » n'y sont pas : leur réponse ou leur
      // conversation y figure déjà, on ne la montre pas deux fois.
      this.prisma.alerteCourte.findMany({ where: { companyId: t.companyId, supprimeeLe: null, categorie: { in: ["groupe", "conseils"] } }, orderBy: { createdAt: "desc" }, take: 60 }),
      // Greg, 17 novembre 2026 : les demandes de devis reçues sur « Mon site ».
      this.prisma.messageSite.findMany({ where: { companyId: t.companyId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, nom: true, commune: true, message: true, createdAt: true, luLe: true } }),
    ]);
    const dejaLues = new Set(lues.map((l) => l.cle));
    const items: ElementBoite[] = [
      ...conversations.map((c) => ({ cle: `mission:${c.id}`, sorte: "mission" as const, titre: c.entreprise.nom, sujet: c.sujet, extrait: c.extrait, le: c.le, nonLu: c.nonLu, href: `/messages/${c.id}` })),
      ...emails.map((e) => {
        const chantier = e.recipient?.priceRequest.project.name ?? null;
        const pieces = e.fichiers.length;
        return {
          cle: `negoce:${e.id}`,
          sorte: "negoce" as const,
          titre: e.recipient?.supplier.name ?? nomExpediteur(e.de),
          sujet: chantier ? `Nouvelle proposition · ${chantier}` : e.objet || "E-mail reçu",
          extrait: pieces > 0 ? `${pieces > 1 ? `${pieces} pièces jointes` : e.fichiers[0]!.nom}` : (e.texte ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || "Sans texte",
          le: e.recuLe.toISOString(),
          nonLu: !e.luLe,
          href: `/messages/negoce/${e.id}`,
          // Greg, 12 novembre 2026 : une réponse non reconnue se dit « à classer » ; une réponse reconnue est déjà dans son quantitatif.
          aClasser: !e.recipient,
        };
      }),
      ...reponses.map((r) => ({
        cle: `reponse:${r.id}`,
        sorte: "negoce" as const,
        titre: r.supplier.name,
        sujet: `Prix donnés par le négoce · ${r.priceRequest.project.name}`,
        extrait: "Réponse chiffrée ligne par ligne, à comparer dans le quantitatif.",
        le: r.reponduLe!.toISOString(),
        // Recette du 18 novembre 2026 : une réponse dont l'artisan a ouvert la demande, ou chez qui il a commandé, est lue.
        nonLu: !dejaLues.has(`reponse:${r.id}`) && !r.commandeLe,
        href: `/chantiers/${r.priceRequest.projectId}#fournisseurs`,
      })),
      ...site.map((m) => ({
        cle: `site:${m.id}`,
        sorte: "site" as const,
        titre: m.nom,
        sujet: m.commune ? `Demande de devis · ${m.commune}` : "Demande de devis",
        extrait: m.message.replace(/\s+/g, " ").trim().slice(0, 120),
        le: m.createdAt.toISOString(),
        nonLu: !m.luLe,
        href: `/messages/site/${m.id}`,
      })),
      ...alertes.map((a) => ({ cle: `alerte:${a.id}`, sorte: "mobiiz" as const, titre: "Mobiiz", sujet: a.titre, extrait: a.detail, le: a.createdAt.toISOString(), nonLu: !a.luLe, href: a.href })),
    ];
    return { items, missions };
  }

  /** Marquer lu un élément de MA boîte. La clé dit le circuit ; un identifiant d'une autre entreprise répond 404. */
  async marquerLu(t: TenantContext, cle: string) {
    const [sorte, id] = cle.split(":");
    if (!id || !isUuid(id)) throw notFound("Élément");
    if (sorte === "negoce") {
      const r = await this.prisma.emailRecuArtisan.updateMany({ where: { id, companyId: t.companyId, luLe: null }, data: { luLe: new Date() } });
      if (r.count === 0 && !(await this.prisma.emailRecuArtisan.count({ where: { id, companyId: t.companyId } }))) throw notFound("Élément");
    } else if (sorte === "reponse") {
      if (!(await this.prisma.priceRequestRecipient.count({ where: { id, priceRequest: { companyId: t.companyId } } }))) throw notFound("Élément");
      await this.prisma.lectureBoite.createMany({ data: [{ companyId: t.companyId, cle }], skipDuplicates: true });
    } else if (sorte === "site") {
      const r = await this.prisma.messageSite.updateMany({ where: { id, companyId: t.companyId, luLe: null }, data: { luLe: new Date() } });
      if (r.count === 0 && !(await this.prisma.messageSite.count({ where: { id, companyId: t.companyId } }))) throw notFound("Élément");
    } else if (sorte === "alerte") {
      const r = await this.prisma.alerteCourte.updateMany({ where: { id, companyId: t.companyId, luLe: null }, data: { luLe: new Date() } });
      if (r.count === 0 && !(await this.prisma.alerteCourte.count({ where: { id, companyId: t.companyId } }))) throw notFound("Élément");
    } else throw notFound("Élément");
    return { lu: true };
  }

  /** Une demande de devis reçue sur « Mon site » : le message entier et les coordonnées du client ; l'ouvrir la marque lue. */
  async messageSite(t: TenantContext, id: string) {
    if (!isUuid(id)) throw notFound("Message");
    const m = await this.prisma.messageSite.findFirst({ where: { id, companyId: t.companyId }, select: { id: true, nom: true, telephone: true, email: true, commune: true, message: true, createdAt: true, luLe: true } });
    if (!m) throw notFound("Message");
    if (!m.luLe) await this.prisma.messageSite.update({ where: { id }, data: { luLe: new Date() } });
    return { id: m.id, nom: m.nom, telephone: m.telephone, email: m.email, commune: m.commune, message: m.message, le: m.createdAt.toISOString() };
  }

  /* --------------------------------------------------------------------------------------------- La cloche */

  async alertes(t: TenantContext) {
    const liste = await this.prisma.alerteCourte.findMany({ where: { companyId: t.companyId, supprimeeLe: null }, orderBy: { createdAt: "desc" }, take: 60 });
    return { nonLues: liste.filter((a) => !a.luLe).length, items: liste.map((a) => ({ id: a.id, categorie: a.categorie, genre: a.genre, titre: a.titre, detail: a.detail, action: a.action, href: a.href, lue: !!a.luLe, le: a.createdAt.toISOString() })) };
  }

  async lire(t: TenantContext, id: string) {
    if (!isUuid(id)) throw notFound("Alerte");
    const r = await this.prisma.alerteCourte.updateMany({ where: { id, companyId: t.companyId }, data: { luLe: new Date() } });
    if (r.count === 0) throw notFound("Alerte");
    return { lue: true };
  }

  async toutLire(t: TenantContext, avant: Date) {
    const r = await this.prisma.alerteCourte.updateMany({ where: { companyId: t.companyId, luLe: null, createdAt: { lte: avant } }, data: { luLe: new Date() } });
    return { lues: r.count };
  }

  /**
   * Retirer une alerte de MA liste, ou la remettre (« Annuler »). Seule l'alerte disparaît : la demande, la liste ou la
   * conversation qu'elle désigne ne bougent pas. L'alerte d'une autre entreprise répond 404.
   */
  async supprimerAlerte(t: TenantContext, id: string, supprimee: boolean) {
    if (!isUuid(id)) throw notFound("Alerte");
    const r = await this.prisma.alerteCourte.updateMany({ where: { id, companyId: t.companyId }, data: supprimee ? { supprimeeLe: new Date(), luLe: new Date() } : { supprimeeLe: null } });
    if (r.count === 0) throw notFound("Alerte");
    return { supprimee };
  }

  /** L'état des actions « À faire » de la cloche : celles déjà vues (pastille éteinte) et celles retirées de la liste. */
  async etatsAFaire(t: TenantContext) {
    const e = await this.prisma.etatAFaire.findMany({ where: { companyId: t.companyId }, orderBy: { createdAt: "desc" }, take: 500 });
    return { vues: e.filter((x) => x.vuLe).map((x) => x.cle), masquees: e.filter((x) => x.masqueLe).map((x) => x.cle) };
  }

  /** Vu (la pastille s'éteint), retiré de la liste, ou remis. Rejouer la même demande ne change rien. */
  async marquerAFaire(t: TenantContext, cles: string[], geste: "vu" | "masquer" | "restaurer") {
    const maintenant = new Date();
    for (const cle of [...new Set(cles)]) {
      const data = geste === "vu" ? { vuLe: maintenant } : geste === "masquer" ? { masqueLe: maintenant, vuLe: maintenant } : { masqueLe: null };
      await this.prisma.etatAFaire.upsert({ where: { companyId_cle: { companyId: t.companyId, cle } }, create: { companyId: t.companyId, cle, ...data }, update: geste === "vu" ? {} : data });
    }
    return this.etatsAFaire(t);
  }

  async reglages(t: TenantContext): Promise<ReglagesAlertes> {
    const r = await this.prisma.reglageAlertes.findUnique({ where: { companyId: t.companyId } });
    return r ? { prix: r.prix, site: r.site, groupe: r.groupe, missions: r.missions, conseils: r.conseils, email: r.email, push: r.push } : REGLAGES_ALERTES_DEFAUT;
  }

  async reglerAlertes(t: TenantContext, r: ReglagesAlertes): Promise<ReglagesAlertes> {
    assertCanWrite(t);
    await this.prisma.reglageAlertes.upsert({ where: { companyId: t.companyId }, create: { companyId: t.companyId, ...r }, update: r });
    return this.reglages(t);
  }
}

export { alertePropositionNegoce };
